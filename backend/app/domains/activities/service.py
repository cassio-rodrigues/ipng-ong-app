from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.activities.schemas import ActivityCreate, ActivityUpdate, HighlightCreate, HighlightUpdate, StudentActivityBulk
from app.models.activity import Activity, StudentActivity, StudentHighlight


async def list_activities(db: AsyncSession, skip: int = 0, limit: int = 50, class_id: uuid.UUID | None = None) -> list[Activity]:
    q = select(Activity)
    if class_id:
        q = q.where(Activity.class_id == class_id)
    result = await db.execute(q.offset(skip).limit(limit))
    return list(result.scalars().all())


async def get_activity(db: AsyncSession, activity_id: uuid.UUID) -> Activity | None:
    return await db.get(Activity, activity_id)


async def create_activity(db: AsyncSession, data: ActivityCreate, created_by: uuid.UUID) -> Activity:
    activity = Activity(**data.model_dump(), created_by=created_by)
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return activity


async def update_activity(db: AsyncSession, activity: Activity, data: ActivityUpdate) -> Activity:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(activity, field, value)
    await db.commit()
    await db.refresh(activity)
    return activity


async def bulk_responses(db: AsyncSession, activity_id: uuid.UUID, data: StudentActivityBulk) -> list[StudentActivity]:
    existing_result = await db.execute(select(StudentActivity).where(StudentActivity.activity_id == activity_id))
    existing = {r.student_id: r for r in existing_result.scalars().all()}

    records = []
    for rec in data.responses:
        if rec.student_id in existing:
            r = existing[rec.student_id]
            r.status = rec.status
            r.score = rec.score
            r.notes = rec.notes
        else:
            r = StudentActivity(activity_id=activity_id, **rec.model_dump())
            db.add(r)
        records.append(r)

    await db.commit()
    for r in records:
        await db.refresh(r)
    return records


async def list_highlights(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    student_id: uuid.UUID | None = None,
    class_id: uuid.UUID | None = None,
) -> list[StudentHighlight]:
    q = select(StudentHighlight)
    if student_id:
        q = q.where(StudentHighlight.student_id == student_id)
    if class_id:
        q = q.where(StudentHighlight.class_id == class_id)
    result = await db.execute(q.offset(skip).limit(limit))
    return list(result.scalars().all())


async def create_highlight(db: AsyncSession, data: HighlightCreate, teacher_id: uuid.UUID) -> StudentHighlight:
    highlight = StudentHighlight(**data.model_dump(), teacher_id=teacher_id)
    db.add(highlight)
    await db.commit()
    await db.refresh(highlight)
    return highlight


async def update_highlight(db: AsyncSession, highlight: StudentHighlight, data: HighlightUpdate) -> StudentHighlight:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(highlight, field, value)
    await db.commit()
    await db.refresh(highlight)
    return highlight
