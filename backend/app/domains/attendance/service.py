from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.attendance.schemas import AttendanceBulkCreate
from app.models.attendance import Attendance


async def get_lesson_attendance(db: AsyncSession, lesson_id: uuid.UUID) -> list[Attendance]:
    result = await db.execute(select(Attendance).where(Attendance.lesson_id == lesson_id))
    return list(result.scalars().all())


async def bulk_register(db: AsyncSession, lesson_id: uuid.UUID, data: AttendanceBulkCreate) -> list[Attendance]:
    existing_result = await db.execute(select(Attendance).where(Attendance.lesson_id == lesson_id))
    existing = {a.student_id: a for a in existing_result.scalars().all()}

    records = []
    for rec in data.records:
        if rec.student_id in existing:
            att = existing[rec.student_id]
            att.status = rec.status
            att.check_in_time = rec.check_in_time
            att.notes = rec.notes
        else:
            att = Attendance(
                lesson_id=lesson_id,
                student_id=rec.student_id,
                status=rec.status,
                check_in_time=rec.check_in_time,
                notes=rec.notes,
            )
            db.add(att)
        records.append(att)

    await db.commit()
    for att in records:
        await db.refresh(att)
    return records
