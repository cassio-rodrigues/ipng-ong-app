from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import alphabetical
from app.core.privacy import students_in_classes

from app.domains.students.schemas import EnrollmentCreate, StudentCreate, StudentUpdate
from app.models.class_ import Class_
from app.models.student import Enrollment, Student


async def list_students(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 200,
    unit_id: uuid.UUID | None = None,
    status: str | None = None,
    teacher_id: uuid.UUID | None = None,
    class_id: uuid.UUID | None = None,
    scope_class_ids: set[uuid.UUID] | None = None,
) -> list[Student]:
    q = select(Student)
    if scope_class_ids is not None:
        q = q.where(Student.id.in_(students_in_classes(scope_class_ids)))
    if class_id:
        q = q.where(Student.id.in_(
            select(Enrollment.student_id).where(Enrollment.class_id == class_id, Enrollment.status == "active")
        ))
    if teacher_id:
        # Subconsulta em vez de join + DISTINCT, que impediria o ORDER BY alfabético
        q = q.where(Student.id.in_(
            select(Enrollment.student_id)
            .join(Class_, Class_.id == Enrollment.class_id)
            .where(Class_.main_teacher_id == teacher_id)
        ))
    if unit_id:
        q = q.where(Student.unit_id == unit_id)
    if status:
        q = q.where(Student.status == status)
    result = await db.execute(q.order_by(alphabetical(Student.full_name)).offset(skip).limit(limit))
    return list(result.scalars().all())


class ConsentError(ValueError):
    pass


def is_minor(birth_date: date | None, today: date | None = None) -> bool:
    if not birth_date:
        return False
    today = today or date.today()
    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    return age < 18


def _apply_consent(student: Student, was_terms: bool, was_image: bool) -> None:
    """Registra data, versão e autor do aceite quando ele é marcado; limpa quando é retirado.
    Menor de idade só pode ter o aceite registrado com o responsável informado (LGPD art. 14)."""
    now = datetime.now(timezone.utc)
    minor = is_minor(student.birth_date)
    if student.terms_accepted and not was_terms:
        if minor and not (student.guardian_name or "").strip():
            raise ConsentError("Aluno menor de idade: informe o responsável que deu o consentimento")
        student.terms_accepted_at = now
        student.terms_version = settings.TERMS_VERSION
        student.consent_given_by = student.guardian_name if minor else student.full_name
    elif not student.terms_accepted:
        student.terms_accepted_at = student.terms_version = student.consent_given_by = None
    if student.image_consent and not was_image:
        if minor and not (student.guardian_name or "").strip():
            raise ConsentError("Aluno menor de idade: informe o responsável que autorizou o uso de imagem")
        student.image_consent_at = now
    elif not student.image_consent:
        student.image_consent_at = None


async def get_student(db: AsyncSession, student_id: uuid.UUID) -> Student | None:
    return await db.get(Student, student_id)


async def create_student(db: AsyncSession, data: StudentCreate) -> Student:
    payload = data.model_dump()
    if payload.get("full_name"):
        payload["full_name"] = payload["full_name"].strip().title()
    student = Student(**payload)
    _apply_consent(student, was_terms=False, was_image=False)
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


async def update_student(db: AsyncSession, student: Student, data: StudentUpdate) -> Student:
    was_terms, was_image = bool(student.terms_accepted), bool(student.image_consent)
    for field, value in data.model_dump(exclude_none=True).items():
        if field == "full_name" and value:
            value = value.strip().title()
        setattr(student, field, value)
    _apply_consent(student, was_terms, was_image)
    await db.commit()
    await db.refresh(student)
    return student


async def get_enrollments(db: AsyncSession, student_id: uuid.UUID) -> list[Enrollment]:
    result = await db.execute(select(Enrollment).where(Enrollment.student_id == student_id))
    return list(result.scalars().all())


async def enroll_student(db: AsyncSession, student_id: uuid.UUID, data: EnrollmentCreate) -> Enrollment:
    enrollment = Enrollment(student_id=student_id, class_id=data.class_id, status="active")
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    return enrollment


async def get_enrollment(db: AsyncSession, enrollment_id: uuid.UUID) -> Enrollment | None:
    return await db.get(Enrollment, enrollment_id)


async def delete_enrollment(db: AsyncSession, enrollment: Enrollment) -> None:
    await db.delete(enrollment)
    await db.commit()


ANONYMIZED_NAME = "Aluno anonimizado"
# Campos pessoais apagados na anonimização; o resto (unidade, turmas, frequência, notas) fica
# para as estatísticas do projeto, sem permitir identificar a pessoa.
PERSONAL_FIELDS = (
    "email", "phone", "birth_date", "address", "rg", "cpf",
    "guardian_name", "guardian_rg", "guardian_cpf",
    "terms_accepted_at", "terms_version", "consent_given_by", "image_consent_at",
)


async def anonymize_student(db: AsyncSession, student: Student) -> Student:
    """Remove os dados que identificam o aluno, mantendo o histórico pedagógico agregado.
    Usada no fim do prazo de guarda ou a pedido do titular (LGPD art. 16 e 18, IV/VI)."""
    from app.core.audit import redact_all_values

    token = redact_all_values.set(True)
    try:
        student.full_name = ANONYMIZED_NAME
        for f in PERSONAL_FIELDS:
            setattr(student, f, None)
        student.terms_accepted = False
        student.image_consent = False
        student.status = "inactive"
        await db.commit()
    finally:
        redact_all_values.reset(token)
    await db.refresh(student)
    return student
