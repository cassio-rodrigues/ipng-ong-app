from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.books.schemas import BookChapterCreate, BookChapterUpdate, BookCreate, BookUpdate
from app.models.book import Book, BookChapter


async def list_books(db: AsyncSession, skip: int = 0, limit: int = 50) -> list[Book]:
    result = await db.execute(
        select(Book).options(selectinload(Book.chapters)).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


async def get_book(db: AsyncSession, book_id: uuid.UUID) -> Book | None:
    result = await db.execute(
        select(Book).options(selectinload(Book.chapters)).where(Book.id == book_id)
    )
    return result.scalar_one_or_none()


async def create_book(db: AsyncSession, data: BookCreate) -> Book:
    book = Book(**data.model_dump())
    db.add(book)
    await db.commit()
    await db.refresh(book)
    return book


async def update_book(db: AsyncSession, book: Book, data: BookUpdate) -> Book:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(book, field, value)
    await db.commit()
    await db.refresh(book)
    return book


async def add_chapter(db: AsyncSession, book_id: uuid.UUID, data: BookChapterCreate) -> BookChapter:
    chapter = BookChapter(book_id=book_id, **data.model_dump())
    db.add(chapter)
    await db.commit()
    await db.refresh(chapter)
    return chapter


async def update_chapter(db: AsyncSession, chapter: BookChapter, data: BookChapterUpdate) -> BookChapter:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(chapter, field, value)
    await db.commit()
    await db.refresh(chapter)
    return chapter


async def get_chapter(db: AsyncSession, chapter_id: uuid.UUID) -> BookChapter | None:
    return await db.get(BookChapter, chapter_id)
