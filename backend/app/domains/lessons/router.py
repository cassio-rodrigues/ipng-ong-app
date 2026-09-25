from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import check_class_access, get_current_user, require_role
from app.domains.lessons.schemas import (
    LessonCreate,
    LessonMaterialBase,
    LessonMaterialResponse,
    LessonReportBase,
    LessonReportResponse,
    LessonResponse,
    LessonUpdate,
    UpcomingLesson,
)
from app.domains.lessons.service import add_material, create_lesson, get_lesson, list_lessons, list_upcoming, update_lesson, upsert_report

router = APIRouter(prefix="/lessons", tags=["Lessons"])


@router.get("", response_model=list[LessonResponse])
async def get_lessons(
    skip: int = 0,
    limit: int = 200,
    class_id: uuid.UUID | None = None,
    teacher_id: uuid.UUID | None = None,
    status: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await list_lessons(db, skip, limit, class_id, teacher_id, status, start_date, end_date)


# Antes de "/{lesson_id}" para não ser capturada como id
@router.get("/upcoming", response_model=list[UpcomingLesson])
async def upcoming(days: int = 7, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    return await list_upcoming(db, current_user, days=max(0, min(days, 31)))


@router.post("", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create(body: LessonCreate, db: AsyncSession = Depends(get_db), current_user=Depends(require_role("admin", "coordinator", "teacher"))):
    await check_class_access(db, body.class_id, current_user)
    return await create_lesson(db, body)


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_one(lesson_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    lesson = await get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Aula não encontrada")
    return lesson


@router.patch("/{lesson_id}", response_model=LessonResponse)
async def update(lesson_id: uuid.UUID, body: LessonUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    lesson = await get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Aula não encontrada")
    await check_class_access(db, lesson.class_id, current_user, fallback_owner_id=lesson.teacher_id)
    return await update_lesson(db, lesson, body)


@router.post("/{lesson_id}/report", response_model=LessonReportResponse)
async def create_report(lesson_id: uuid.UUID, body: LessonReportBase, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    lesson = await get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Aula não encontrada")
    await check_class_access(db, lesson.class_id, current_user, fallback_owner_id=lesson.teacher_id)
    return await upsert_report(db, lesson_id, body)


@router.post("/{lesson_id}/materials", response_model=LessonMaterialResponse, status_code=status.HTTP_201_CREATED)
async def add_material_route(lesson_id: uuid.UUID, body: LessonMaterialBase, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    lesson = await get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Aula não encontrada")
    await check_class_access(db, lesson.class_id, current_user, fallback_owner_id=lesson.teacher_id)
    return await add_material(db, lesson_id, body)
