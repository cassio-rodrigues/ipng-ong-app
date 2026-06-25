from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Book(Base):
    __tablename__ = "books"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str | None] = mapped_column(String)
    author: Mapped[str | None] = mapped_column(String)
    level: Mapped[str | None] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text)
    isbn: Mapped[str | None] = mapped_column(String)
    active: Mapped[bool | None] = mapped_column(Boolean, default=True)

    chapters: Mapped[list[BookChapter]] = relationship("BookChapter", back_populates="book", cascade="all, delete-orphan", order_by="BookChapter.order_index", lazy="selectin")


class BookChapter(Base):
    __tablename__ = "book_chapters"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    book_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"))
    title: Mapped[str | None] = mapped_column(String)
    order_index: Mapped[int | None] = mapped_column(Integer)

    book: Mapped[Book] = relationship("Book", back_populates="chapters", lazy="selectin")
