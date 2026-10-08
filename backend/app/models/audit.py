from __future__ import annotations

import uuid
from datetime import datetime

from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str | None] = mapped_column(String)
    entity_type: Mapped[str | None] = mapped_column(String)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    # Nome legível da entidade no momento da ação (aluno, turma…)
    label: Mapped[str | None] = mapped_column(String, nullable=True)
    # create/delete: {"values": {...}}; update: {"changes": {campo: [antes, depois]}}
    details: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User | None"] = relationship("User", foreign_keys=[user_id], lazy="selectin")  # type: ignore[name-defined]
