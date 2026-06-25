from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict


class BookChapterBase(BaseModel):
    title: str | None = None
    order_index: int | None = None


class BookChapterCreate(BookChapterBase):
    title: str
    order_index: int


class BookChapterUpdate(BookChapterBase):
    pass


class BookChapterResponse(BookChapterBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    book_id: uuid.UUID


class BookBase(BaseModel):
    title: str | None = None
    author: str | None = None
    level: str | None = None
    description: str | None = None
    isbn: str | None = None
    active: bool | None = True


class BookCreate(BookBase):
    title: str


class BookUpdate(BookBase):
    pass


class BookResponse(BookBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    chapters: list[BookChapterResponse] = []
