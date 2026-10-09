"""Regras de minimização de dados (LGPD art. 6º, III): quem vê o quê.

Admin e coordenação veem o cadastro completo. Volunteachers veem apenas os alunos das
próprias turmas (principal ou atribuído) e sem documentos nem endereço.
"""
from __future__ import annotations

import uuid
from typing import TypeVar

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Dados do aluno que só admin/coordenação enxergam
SENSITIVE_STUDENT_FIELDS = ("rg", "cpf", "address", "guardian_rg", "guardian_cpf")
# Dados pessoais de usuários que só o próprio usuário e admin/coordenação enxergam
SENSITIVE_USER_FIELDS = ("email", "telefone", "birth_date", "gender", "atribuicoes")


def is_privileged(user) -> bool:
    return user.role in ("admin", "coordinator")


async def visible_class_ids(db: AsyncSession, user) -> set[uuid.UUID] | None:
    """None = sem restrição. Volunteacher: turmas em que é principal ou atribuído."""
    if is_privileged(user):
        return None
    from app.models.class_ import Class_, ClassAssignment

    assigned = select(ClassAssignment.class_id).where(ClassAssignment.teacher_id == user.id)
    rows = await db.execute(
        select(Class_.id).where((Class_.main_teacher_id == user.id) | (Class_.id.in_(assigned)))
    )
    return set(rows.scalars().all())


def students_in_classes(class_ids: set[uuid.UUID]):
    """Subconsulta: alunos com matrícula (atual ou antiga) nas turmas dadas."""
    from app.models.student import Enrollment

    return select(Enrollment.student_id).where(Enrollment.class_id.in_(class_ids))


async def ensure_student_visible(db: AsyncSession, student_id: uuid.UUID, user) -> None:
    class_ids = await visible_class_ids(db, user)
    if class_ids is None:
        return
    from app.models.student import Enrollment

    found = await db.scalar(
        select(Enrollment.id).where(Enrollment.student_id == student_id, Enrollment.class_id.in_(class_ids)).limit(1)
    )
    if found is None:
        # 404 em vez de 403 para não revelar que o aluno existe
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")


M = TypeVar("M", bound=BaseModel)


def redact(model: M, user, fields: tuple[str, ...]) -> M:
    if is_privileged(user):
        return model
    return model.model_copy(update={f: None for f in fields if f in type(model).model_fields})
