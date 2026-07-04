from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class BookLoan(Base):
    __tablename__ = "book_loans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("students.id"))
    book_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("books.id"))
    borrowed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    returned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    student: Mapped["Student"] = relationship("Student", lazy="selectin")  # type: ignore[name-defined]
    book: Mapped["Book"] = relationship("Book", lazy="selectin")  # type: ignore[name-defined]
