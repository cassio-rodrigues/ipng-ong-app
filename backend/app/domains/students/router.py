from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.core.privacy import SENSITIVE_STUDENT_FIELDS, ensure_student_visible, redact, visible_class_ids
from app.domains.students.schemas import (
    EnrollmentCreate,
    EnrollmentResponse,
    StudentCreate,
    StudentListItem,
    StudentResponse,
    StudentUpdate,
)
from app.domains.students.service import (
    ConsentError,
    anonymize_student,
    create_student,
    delete_enrollment,
    enroll_student,
    get_enrollment,
    get_enrollments,
    get_student,
    list_students,
    update_student,
)
from app.domains.students.history_schemas import StudentHistory
from app.domains.students.history_service import get_student_history

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=list[StudentListItem])
async def get_students(
    skip: int = 0,
    limit: int = 200,
    unit_id: uuid.UUID | None = None,
    status: str | None = None,
    teacher_id: uuid.UUID | None = None,
    class_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Volunteacher só lista alunos das próprias turmas, qualquer que seja o filtro pedido
    scope = await visible_class_ids(db, current_user)
    if scope is not None:
        # O escopo já cobre turmas em que é principal ou atribuído; teacher_id filtraria só as principais
        teacher_id = None
    students = await list_students(db, skip, limit, unit_id, status, teacher_id, class_id, scope)
    return [
        redact(StudentListItem.model_validate(s).model_copy(
            update={"class_ids": [e.class_id for e in s.enrollments if e.status == "active"]}
        ), current_user, SENSITIVE_STUDENT_FIELDS)
        for s in students
    ]


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create(body: StudentCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin", "coordinator"))):
    try:
        return await create_student(db, body)
    except ConsentError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/{student_id}", response_model=StudentResponse)
async def get_one(student_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    student = await get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    await ensure_student_visible(db, student_id, current_user)
    return redact(StudentResponse.model_validate(student), current_user, SENSITIVE_STUDENT_FIELDS)


@router.patch("/{student_id}", response_model=StudentResponse)
async def update(
    student_id: uuid.UUID,
    body: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    student = await get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    try:
        return await update_student(db, student, body)
    except ConsentError as e:
        await db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/{student_id}/enrollments", response_model=list[EnrollmentResponse])
async def get_enrollments_route(student_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    student = await get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    await ensure_student_visible(db, student_id, current_user)
    return await get_enrollments(db, student_id)


@router.get("/{student_id}/history", response_model=StudentHistory)
async def get_history(student_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    await ensure_student_visible(db, student_id, current_user)
    history = await get_student_history(db, student_id)
    if not history:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return history


@router.post("/{student_id}/anonymize", response_model=StudentResponse)
async def anonymize(
    student_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    student = await get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return await anonymize_student(db, student)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    student = await get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    await db.delete(student)
    await db.commit()


@router.post("/{student_id}/enrollments", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
async def enroll(
    student_id: uuid.UUID,
    body: EnrollmentCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    student = await get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return await enroll_student(db, student_id, body)


@router.delete("/{student_id}/enrollments/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_enrollment(
    student_id: uuid.UUID,
    enrollment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    enrollment = await get_enrollment(db, enrollment_id)
    if not enrollment or enrollment.student_id != student_id:
        raise HTTPException(status_code=404, detail="Matrícula não encontrada")
    await delete_enrollment(db, enrollment)
