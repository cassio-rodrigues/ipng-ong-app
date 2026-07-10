from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str | None] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str | None] = mapped_column(String)
    date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    class_: Mapped["Class_ | None"] = relationship("Class_", foreign_keys=[class_id], lazy="selectin")  # type: ignore[name-defined]
    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by], lazy="selectin")  # type: ignore[name-defined]
    student_activities: Mapped[list[StudentActivity]] = relationship("StudentActivity", back_populates="activity", cascade="all, delete-orphan", lazy="selectin")


class StudentActivity(Base):
    __tablename__ = "student_activities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("activities.id", ondelete="CASCADE"))
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"))
    status: Mapped[str | None] = mapped_column(String)
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    notes: Mapped[str | None] = mapped_column(Text)

    activity: Mapped[Activity] = relationship("Activity", back_populates="student_activities", lazy="selectin")
    student: Mapped["Student"] = relationship("Student", foreign_keys=[student_id], lazy="selectin")  # type: ignore[name-defined]


class StudentHighlight(Base):
    __tablename__ = "student_highlights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"))
    class_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str | None] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text)
    highlight_type: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Formulário estruturado de destaque
    student_occupation: Mapped[str | None] = mapped_column(String)
    reason_primary: Mapped[str | None] = mapped_column(String)
    reason_secondary: Mapped[str | None] = mapped_column(String)
    level_assessment: Mapped[str | None] = mapped_column(String)
    participation_spontaneous: Mapped[str | None] = mapped_column(String)
    class_focus: Mapped[str | None] = mapped_column(String)
    interest_beyond_class: Mapped[str | None] = mapped_column(String)
    speaks_despite_errors: Mapped[str | None] = mapped_column(String)
    curiosity_level: Mapped[str | None] = mapped_column(String)
    homework_rate: Mapped[str | None] = mapped_column(String)
    english_outside_contact: Mapped[str | None] = mapped_column(String)
    english_outside_channels: Mapped[str | None] = mapped_column(String)
    self_confidence: Mapped[str | None] = mapped_column(String)
    previously_highlighted: Mapped[str | None] = mapped_column(String)
    teacher_overall_perception: Mapped[str | None] = mapped_column(String)

    student: Mapped["Student"] = relationship("Student", foreign_keys=[student_id], lazy="selectin")  # type: ignore[name-defined]
    class_: Mapped["Class_ | None"] = relationship("Class_", foreign_keys=[class_id], lazy="selectin")  # type: ignore[name-defined]
    teacher: Mapped["User | None"] = relationship("User", foreign_keys=[teacher_id], lazy="selectin")  # type: ignore[name-defined]
