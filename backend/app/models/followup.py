from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class StudentFollowup(Base):
    """Registro de ação tomada sobre uma pendência (alerta).

    As pendências são calculadas a partir dos dados; esta tabela só guarda o
    fechamento do ciclo. Um alerta é identificado por (alert_type, ref_id, student_id).
    """
    __tablename__ = "student_followups"
    __table_args__ = (Index("ix_student_followups_alert", "alert_type", "ref_id", "student_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_type: Mapped[str] = mapped_column(String(40))
    ref_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    student_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=True, index=True)
    resolution: Mapped[str] = mapped_column(String(20))  # resolved | snoozed
    note: Mapped[str | None] = mapped_column(Text)
    snooze_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by], lazy="selectin")  # type: ignore[name-defined]
