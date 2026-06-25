from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str | None] = mapped_column(String)
    type: Mapped[str | None] = mapped_column(String)
    semester: Mapped[str | None] = mapped_column(String)
    date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    max_score: Mapped[int | None] = mapped_column(Integer)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    class_: Mapped["Class_ | None"] = relationship("Class_", foreign_keys=[class_id])  # type: ignore[name-defined]
    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by])  # type: ignore[name-defined]
    grades: Mapped[list[StudentGrade]] = relationship("StudentGrade", back_populates="assessment", cascade="all, delete-orphan")


class StudentGrade(Base):
    __tablename__ = "student_grades"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assessments.id", ondelete="CASCADE"))
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"))
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    feedback: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assessment: Mapped[Assessment] = relationship("Assessment", back_populates="grades")
    student: Mapped["Student"] = relationship("Student", foreign_keys=[student_id])  # type: ignore[name-defined]
