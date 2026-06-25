from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    book_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="SET NULL"), nullable=True)
    chapter_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("book_chapters.id", ondelete="SET NULL"), nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str | None] = mapped_column(String, default="scheduled")

    class_: Mapped["Class_ | None"] = relationship("Class_", foreign_keys=[class_id])  # type: ignore[name-defined]
    teacher: Mapped["User | None"] = relationship("User", foreign_keys=[teacher_id])  # type: ignore[name-defined]
    book: Mapped["Book | None"] = relationship("Book", foreign_keys=[book_id])  # type: ignore[name-defined]
    chapter: Mapped["BookChapter | None"] = relationship("BookChapter", foreign_keys=[chapter_id])  # type: ignore[name-defined]
    report: Mapped[LessonReport | None] = relationship("LessonReport", back_populates="lesson", uselist=False, cascade="all, delete-orphan")
    materials: Mapped[list[LessonMaterial]] = relationship("LessonMaterial", back_populates="lesson", cascade="all, delete-orphan")


class LessonReport(Base):
    __tablename__ = "lesson_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), unique=True)
    summary: Mapped[str | None] = mapped_column(Text)
    activities_done: Mapped[str | None] = mapped_column(Text)
    homework: Mapped[str | None] = mapped_column(Text)
    observations: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lesson: Mapped[Lesson] = relationship("Lesson", back_populates="report")


class LessonMaterial(Base):
    __tablename__ = "lesson_materials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"))
    type: Mapped[str | None] = mapped_column(String)
    title: Mapped[str | None] = mapped_column(String)
    content: Mapped[str | None] = mapped_column(Text)

    lesson: Mapped[Lesson] = relationship("Lesson", back_populates="materials")
