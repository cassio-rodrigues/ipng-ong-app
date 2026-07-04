from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class LoanCreate(BaseModel):
    student_id: uuid.UUID
    book_id: uuid.UUID
    due_date: datetime | None = None
    notes: str | None = None


class LoanReturn(BaseModel):
    notes: str | None = None


class StudentInfo(BaseModel):
    id: uuid.UUID
    full_name: str | None

    model_config = {"from_attributes": True}


class BookInfo(BaseModel):
    id: uuid.UUID
    title: str | None
    author: str | None = None

    model_config = {"from_attributes": True}


class LoanResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    book_id: uuid.UUID
    borrowed_at: datetime
    due_date: datetime | None
    returned_at: datetime | None
    status: str
    notes: str | None
    student: StudentInfo | None = None
    book: BookInfo | None = None

    model_config = {"from_attributes": True}
