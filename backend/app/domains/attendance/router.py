from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.domains.attendance.schemas import AttendanceBulkCreate, AttendanceResponse
from app.domains.attendance.service import bulk_register, get_lesson_attendance
from app.domains.lessons.service import get_lesson

router = APIRouter(prefix="/lessons", tags=["Attendance"])


@router.get("/{lesson_id}/attendance", response_model=list[AttendanceResponse])
async def get_attendance(lesson_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    lesson = await get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Aula não encontrada")
    return await get_lesson_attendance(db, lesson_id)


@router.post("/{lesson_id}/attendance", response_model=list[AttendanceResponse])
async def register_attendance(lesson_id: uuid.UUID, body: AttendanceBulkCreate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    lesson = await get_lesson(db, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Aula não encontrada")
    return await bulk_register(db, lesson_id, body)
