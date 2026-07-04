from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.domains.classes.schemas import ClassAssignmentBase, ClassAssignmentResponse, ClassCreate, ClassResponse, ClassUpdate
from app.domains.classes.service import add_assignment, create_class, get_class, get_class_students, list_classes, update_class

router = APIRouter(prefix="/classes", tags=["Classes"])


@router.get("", response_model=list[ClassResponse])
async def get_classes(
    skip: int = 0,
    limit: int = 50,
    unit_id: uuid.UUID | None = None,
    status: str | None = None,
    level: str | None = None,
    teacher_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await list_classes(db, skip, limit, unit_id, status, level, teacher_id)


@router.post("", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
async def create(body: ClassCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin", "coordinator"))):
    return await create_class(db, body)


@router.get("/{class_id}", response_model=ClassResponse)
async def get_one(class_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await get_class(db, class_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return obj


@router.patch("/{class_id}", response_model=ClassResponse)
async def update(
    class_id: uuid.UUID,
    body: ClassUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    obj = await get_class(db, class_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return await update_class(db, obj, body)


@router.get("/{class_id}/students")
async def get_students(class_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await get_class_students(db, class_id)


@router.post("/{class_id}/assignments", response_model=ClassAssignmentResponse, status_code=status.HTTP_201_CREATED)
async def assign_teacher(
    class_id: uuid.UUID,
    body: ClassAssignmentBase,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    obj = await get_class(db, class_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return await add_assignment(db, class_id, body)
