from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.domains.students.schemas import EnrollmentCreate, EnrollmentResponse, StudentCreate, StudentResponse, StudentUpdate
from app.domains.students.service import (
    create_student,
    enroll_student,
    get_enrollments,
    get_student,
    list_students,
    update_student,
)
from app.domains.students.history_schemas import StudentHistory
from app.domains.students.history_service import get_student_history

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("", response_model=list[StudentResponse])
async def get_students(
    skip: int = 0,
    limit: int = 50,
    unit_id: uuid.UUID | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await list_students(db, skip, limit, unit_id, status)


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create(body: StudentCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin", "coordinator"))):
    return await create_student(db, body)


@router.get("/{student_id}", response_model=StudentResponse)
async def get_one(student_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    student = await get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return student


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
    return await update_student(db, student, body)


@router.get("/{student_id}/enrollments", response_model=list[EnrollmentResponse])
async def get_enrollments_route(student_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    student = await get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return await get_enrollments(db, student_id)


@router.get("/{student_id}/history", response_model=StudentHistory)
async def get_history(student_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    history = await get_student_history(db, student_id)
    if not history:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return history


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
