from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.domains.books.schemas import BookChapterCreate, BookChapterResponse, BookChapterUpdate, BookCreate, BookResponse, BookUpdate
from app.domains.books.service import add_chapter, create_book, get_book, get_chapter, list_books, update_book, update_chapter

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("", response_model=list[BookResponse])
async def get_books(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    return await list_books(db, skip, limit)


@router.post("", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create(body: BookCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin", "coordinator"))):
    return await create_book(db, body)


@router.get("/{book_id}", response_model=BookResponse)
async def get_one(book_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    book = await get_book(db, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    return book


@router.patch("/{book_id}", response_model=BookResponse)
async def update(book_id: uuid.UUID, body: BookUpdate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin", "coordinator"))):
    book = await get_book(db, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    return await update_book(db, book, body)


@router.post("/{book_id}/chapters", response_model=BookChapterResponse, status_code=status.HTTP_201_CREATED)
async def add_chapter_route(book_id: uuid.UUID, body: BookChapterCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin", "coordinator"))):
    book = await get_book(db, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    return await add_chapter(db, book_id, body)


@router.patch("/{book_id}/chapters/{chapter_id}", response_model=BookChapterResponse)
async def update_chapter_route(
    book_id: uuid.UUID,
    chapter_id: uuid.UUID,
    body: BookChapterUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    chapter = await get_chapter(db, chapter_id)
    if not chapter or chapter.book_id != book_id:
        raise HTTPException(status_code=404, detail="Capítulo não encontrado")
    return await update_chapter(db, chapter, body)
