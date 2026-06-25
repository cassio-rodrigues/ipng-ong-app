from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LessonReportBase(BaseModel):
    summary: str | None = None
    activities_done: str | None = None
    homework: str | None = None
    observations: str | None = None


class LessonReportResponse(LessonReportBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    lesson_id: uuid.UUID
    created_at: datetime | None = None


class LessonMaterialBase(BaseModel):
    type: str | None = None
    title: str | None = None
    content: str | None = None


class LessonMaterialResponse(LessonMaterialBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    lesson_id: uuid.UUID


class LessonBase(BaseModel):
    class_id: uuid.UUID | None = None
    teacher_id: uuid.UUID | None = None
    book_id: uuid.UUID | None = None
    chapter_id: uuid.UUID | None = None
    scheduled_at: datetime | None = None


class LessonCreate(LessonBase):
    class_id: uuid.UUID
    scheduled_at: datetime


class LessonUpdate(LessonBase):
    status: str | None = None


class LessonResponse(LessonBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    status: str | None = None
    report: LessonReportResponse | None = None
    materials: list[LessonMaterialResponse] = []
