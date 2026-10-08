from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.tz import LOCAL_TZ
from app.core.deps import require_role
from app.domains.audit.schemas import AuditLogResponse
from app.models.audit import AuditLog
from app.models.user import User

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/logs", response_model=list[AuditLogResponse])
async def list_logs(
    skip: int = 0,
    limit: int = 100,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    action: str | None = None,
    user_id: uuid.UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    q = select(AuditLog, User.name).outerjoin(User, User.id == AuditLog.user_id)
    if entity_type:
        q = q.where(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.where(AuditLog.entity_id == entity_id)
    if action:
        q = q.where(AuditLog.action == action)
    if user_id:
        q = q.where(AuditLog.user_id == user_id)
    # Datas no fuso local, fim inclusivo
    if start_date:
        q = q.where(AuditLog.created_at >= datetime.combine(start_date, time.min, LOCAL_TZ))
    if end_date:
        q = q.where(AuditLog.created_at < datetime.combine(end_date + timedelta(days=1), time.min, LOCAL_TZ))
    result = await db.execute(q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit))
    return [
        AuditLogResponse.model_validate(log).model_copy(update={"user_name": name})
        for log, name in result.all()
    ]
