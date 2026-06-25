from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class StudentActivityRecord(BaseModel):
    student_id: uuid.UUID
    status: str | None = None
    score: Decimal | None = None
    notes: str | None = None


class StudentActivityBulk(BaseModel):
    responses: list[StudentActivityRecord]


class StudentActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    activity_id: uuid.UUID
    student_id: uuid.UUID
    status: str | None = None
    score: Decimal | None = None
    notes: str | None = None


class ActivityBase(BaseModel):
    class_id: uuid.UUID | None = None
    title: str | None = None
    description: str | None = None
    type: str | None = None
    date: datetime | None = None


class ActivityCreate(ActivityBase):
    title: str
    class_id: uuid.UUID


class ActivityUpdate(ActivityBase):
    pass


class ActivityResponse(ActivityBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_by: uuid.UUID | None = None


class HighlightBase(BaseModel):
    student_id: uuid.UUID
    class_id: uuid.UUID | None = None
    title: str | None = None
    description: str | None = None
    highlight_type: str | None = None


class HighlightCreate(HighlightBase):
    student_id: uuid.UUID


class HighlightUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    highlight_type: str | None = None


class HighlightResponse(HighlightBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    teacher_id: uuid.UUID | None = None
    created_at: datetime | None = None
