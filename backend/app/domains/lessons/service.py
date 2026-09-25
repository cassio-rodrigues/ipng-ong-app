from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.lessons.schemas import LessonCreate, LessonMaterialBase, LessonReportBase, LessonUpdate, UpcomingLesson
from app.models.class_ import Class_, ClassAssignment
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
        assigned = select(ClassAssignment.class_id).where(ClassAssignment.teacher_id == teacher_id)
        teacher_classes = select(Class_.id).where(
            or_(Class_.main_teacher_id == teacher_id, Class_.id.in_(assigned))
        )
        q = q.where(or_(Lesson.teacher_id == teacher_id, Lesson.class_id.in_(teacher_classes)))
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


async def list_upcoming(db: AsyncSession, user, days: int = 7) -> list[UpcomingLesson]:
    """Aulas de hoje (desde 00:00 no fuso local) até `days` dias à frente, nas turmas visíveis ao usuário."""
    from app.core.tz import LOCAL_TZ
    from app.domains.alerts.service import _visible_class_ids
    from app.models.attendance import Attendance

    local_now = datetime.now(LOCAL_TZ)
    start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=days + 1)

    att_count = (
        select(Attendance.lesson_id, func.count().label("n"))
        .group_by(Attendance.lesson_id)
        .subquery()
    )
    stmt = (
        select(Lesson, Class_.name, Class_.unit_id, func.coalesce(att_count.c.n, 0).label("n"), LessonReport.id.label("report_id"))
        .join(Class_, Class_.id == Lesson.class_id)
        .outerjoin(att_count, att_count.c.lesson_id == Lesson.id)
        .outerjoin(LessonReport, LessonReport.lesson_id == Lesson.id)
        .where(
            Lesson.scheduled_at >= start, Lesson.scheduled_at < end,
            Lesson.status != "cancelled", Class_.status == "active",
        )
        .order_by(Lesson.scheduled_at)
    )
    class_ids = await _visible_class_ids(db, user)
    if class_ids is not None:
        stmt = stmt.where(Lesson.class_id.in_(class_ids))

    rows = (await db.execute(stmt)).all()
    return [
        UpcomingLesson(
            id=r.Lesson.id, class_id=r.Lesson.class_id, class_name=r.name, unit_id=r.unit_id,
            scheduled_at=r.Lesson.scheduled_at, status=r.Lesson.status,
            attendance_count=r.n, has_report=r.report_id is not None,
        )
        for r in rows
    ]
