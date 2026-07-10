from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, func
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
    address: Mapped[str | None] = mapped_column(String)
    rg: Mapped[str | None] = mapped_column(String)
    cpf: Mapped[str | None] = mapped_column(String)
    education_level: Mapped[str | None] = mapped_column(String)
    guardian_name: Mapped[str | None] = mapped_column(String)
    guardian_rg: Mapped[str | None] = mapped_column(String)
    guardian_cpf: Mapped[str | None] = mapped_column(String)
    terms_accepted: Mapped[bool | None] = mapped_column(Boolean, default=False)
    image_consent: Mapped[bool | None] = mapped_column(Boolean, default=False)

    unit: Mapped["Unit | None"] = relationship("Unit", foreign_keys=[unit_id], lazy="selectin")  # type: ignore[name-defined]
    enrollments: Mapped[list[Enrollment]] = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan", lazy="selectin")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"))
    class_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"))
    enrollment_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[str | None] = mapped_column(String, default="active")

    student: Mapped[Student] = relationship("Student", back_populates="enrollments", lazy="selectin")
    class_: Mapped["Class_"] = relationship("Class_", foreign_keys=[class_id], lazy="selectin")  # type: ignore[name-defined]
