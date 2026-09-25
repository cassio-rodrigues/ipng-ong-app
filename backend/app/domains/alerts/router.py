from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.domains.alerts import service
from app.domains.alerts.schemas import AlertResponse, FollowupCreate, FollowupResponse

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    student_id: uuid.UUID | None = None,
    class_id: uuid.UUID | None = None,
    lesson_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    alerts = await service.compute_alerts(db, current_user)
    if student_id:
        alerts = [a for a in alerts if a.student_id == student_id]
    if class_id:
        alerts = [a for a in alerts if a.class_id == class_id]
    if lesson_id:
        alerts = [a for a in alerts if a.lesson_id == lesson_id]
    return alerts


@router.post("/followups", response_model=FollowupResponse, status_code=201)
async def create_followup(
    body: FollowupCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.create_followup(db, body, current_user)


@router.get("/followups", response_model=list[FollowupResponse])
async def list_followups(
    student_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.list_followups(db, student_id, current_user)
