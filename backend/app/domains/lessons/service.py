from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.lessons.schemas import LessonCreate, LessonMaterialBase, LessonReportBase, LessonUpdate
from app.models.lesson import Lesson, LessonMaterial, LessonReport


async def list_lessons(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 200,
    class_id: uuid.UUID | None = None,
    teacher_id: uuid.UUID | None = None,
    status: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[Lesson]:
    q = select(Lesson).options(selectinload(Lesson.report), selectinload(Lesson.materials))
    if class_id:
        q = q.where(Lesson.class_id == class_id)
    if teacher_id:
        q = q.where(Lesson.teacher_id == teacher_id)
    if status:
        q = q.where(Lesson.status == status)
    if start_date:
        q = q.where(Lesson.scheduled_at >= datetime(start_date.year, start_date.month, start_date.day))
    if end_date:
        q = q.where(Lesson.scheduled_at < datetime(end_date.year, end_date.month, end_date.day) + timedelta(days=1))
    result = await db.execute(q.order_by(Lesson.scheduled_at.desc()).offset(skip).limit(limit))
    return list(result.scalars().all())


async def get_lesson(db: AsyncSession, lesson_id: uuid.UUID) -> Lesson | None:
    result = await db.execute(
        select(Lesson)
        .options(selectinload(Lesson.report), selectinload(Lesson.materials))
        .where(Lesson.id == lesson_id)
    )
    return result.scalar_one_or_none()


async def create_lesson(db: AsyncSession, data: LessonCreate) -> Lesson:
    lesson = Lesson(**data.model_dump())
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


async def update_lesson(db: AsyncSession, lesson: Lesson, data: LessonUpdate) -> Lesson:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(lesson, field, value)
    await db.commit()
    await db.refresh(lesson)
    return lesson


async def upsert_report(db: AsyncSession, lesson_id: uuid.UUID, data: LessonReportBase) -> LessonReport:
    result = await db.execute(select(LessonReport).where(LessonReport.lesson_id == lesson_id))
    report = result.scalar_one_or_none()
    if report:
        for k, v in data.model_dump(exclude_none=True).items():
            setattr(report, k, v)
    else:
        report = LessonReport(lesson_id=lesson_id, **data.model_dump())
        db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


async def add_material(db: AsyncSession, lesson_id: uuid.UUID, data: LessonMaterialBase) -> LessonMaterial:
    material = LessonMaterial(lesson_id=lesson_id, **data.model_dump())
    db.add(material)
    await db.commit()
    await db.refresh(material)
    return material
