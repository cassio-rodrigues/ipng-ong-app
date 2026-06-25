from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Class_(Base):
    __tablename__ = "classes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str | None] = mapped_column(String)
    level: Mapped[str | None] = mapped_column(String)
    unit_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("units.id", ondelete="SET NULL"), nullable=True)
    main_teacher_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    book_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str | None] = mapped_column(String, default="active")
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    unit: Mapped["Unit | None"] = relationship("Unit", foreign_keys=[unit_id], lazy="selectin")  # type: ignore[name-defined]
    main_teacher: Mapped["User | None"] = relationship("User", foreign_keys=[main_teacher_id], lazy="selectin")  # type: ignore[name-defined]
    book: Mapped["Book | None"] = relationship("Book", foreign_keys=[book_id], lazy="selectin")  # type: ignore[name-defined]
    assignments: Mapped[list[ClassAssignment]] = relationship("ClassAssignment", back_populates="class_", cascade="all, delete-orphan", lazy="selectin")


class ClassAssignment(Base):
    __tablename__ = "class_assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"))
    teacher_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[str | None] = mapped_column(String)

    class_: Mapped[Class_] = relationship("Class_", back_populates="assignments", lazy="selectin")
    teacher: Mapped["User"] = relationship("User", foreign_keys=[teacher_id], lazy="selectin")  # type: ignore[name-defined]
