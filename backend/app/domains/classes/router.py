from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import check_class_access, get_current_user, require_role
from app.domains.classes.schedule import drop_future_empty_lessons, generate_lessons
from app.domains.classes.schemas import (
    ClassAssignmentBase, ClassAssignmentResponse, ClassCreate, ClassResponse, ClassSummary, ClassUpdate,
    GenerateLessonsRequest, GenerateLessonsResult,
)
from app.domains.classes.service import (
    count_active_students,
    add_assignment,
    create_class,
    get_assignment,
    get_class,
    get_class_students,
    get_class_summary,
    list_classes,
    remove_assignment,
    update_class,
)

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
    classes = await list_classes(db, skip, limit, unit_id, status, level, teacher_id)
    counts = await count_active_students(db, [c.id for c in classes])
    return [
        ClassResponse.model_validate(c).model_copy(update={"student_count": counts.get(c.id, 0)})
        for c in classes
    ]


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
    old_weekday, old_start = obj.schedule_weekday, obj.schedule_start
    updated = await update_class(db, obj, body)
    # Horário mudou: aulas futuras vazias do horário antigo deixam de valer
    if old_weekday is not None and old_start is not None and (
        updated.schedule_weekday != old_weekday or updated.schedule_start != old_start
    ):
        await drop_future_empty_lessons(db, updated, old_weekday, old_start)
        updated = await get_class(db, class_id)
    return updated


@router.post("/{class_id}/generate-lessons", response_model=GenerateLessonsResult)
async def generate(
    class_id: uuid.UUID,
    body: GenerateLessonsRequest = GenerateLessonsRequest(),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    obj = await get_class(db, class_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    await check_class_access(db, class_id, current_user)
    if obj.schedule_weekday is None or obj.schedule_start is None:
        raise HTTPException(status_code=400, detail="Defina o dia e o horário da turma antes de gerar as aulas")
    return await generate_lessons(db, obj, body.until)


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


@router.delete("/{class_id}/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_teacher(
    class_id: uuid.UUID,
    assignment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    assignment = await get_assignment(db, assignment_id)
    if not assignment or assignment.class_id != class_id:
        raise HTTPException(status_code=404, detail="Atribuição não encontrada")
    await remove_assignment(db, assignment)


@router.get("/{class_id}/summary", response_model=ClassSummary)
async def get_summary(class_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    obj = await get_class(db, class_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return await get_class_summary(db, class_id)
