from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str | None] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String)
    phone: Mapped[str | None] = mapped_column(String)
    gender: Mapped[str | None] = mapped_column(String)
    birth_date: Mapped[date | None] = mapped_column(Date)
    unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str | None] = mapped_column(String, default="active")
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())

    unit: Mapped["Unit | None"] = relationship("Unit", foreign_keys=[unit_id])  # type: ignore[name-defined]
    enrollments: Mapped[list[Enrollment]] = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"))
    class_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"))
    enrollment_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[str | None] = mapped_column(String, default="active")

    student: Mapped[Student] = relationship("Student", back_populates="enrollments")
    class_: Mapped["Class_"] = relationship("Class_", foreign_keys=[class_id])  # type: ignore[name-defined]
