from __future__ import annotations

import uuid
from collections.abc import Iterable
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.user import User


async def last_authors(
    db: AsyncSession, entity_type: str, entity_ids: Iterable[uuid.UUID]
) -> dict[uuid.UUID, tuple[str | None, datetime | None]]:
    """Quem fez a última criação/edição de cada entidade, segundo a auditoria."""
    ids = list(entity_ids)
    if not ids:
        return {}
    result = await db.execute(
        select(AuditLog.entity_id, User.name, AuditLog.created_at)
        .outerjoin(User, User.id == AuditLog.user_id)
        .where(
            AuditLog.entity_type == entity_type,
            AuditLog.entity_id.in_(ids),
            AuditLog.action.in_(("create", "update")),
        )
        .order_by(AuditLog.entity_id, AuditLog.created_at.desc())
        .distinct(AuditLog.entity_id)
    )
    return {entity_id: (name, at) for entity_id, name, at in result.all()}
