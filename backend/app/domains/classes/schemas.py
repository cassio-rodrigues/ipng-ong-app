from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ClassAssignmentBase(BaseModel):
    teacher_id: uuid.UUID
    role: str | None = None


class ClassAssignmentResponse(ClassAssignmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    class_id: uuid.UUID


class ClassBase(BaseModel):
    name: str | None = None
    level: str | None = None
    unit_id: uuid.UUID | None = None
    main_teacher_id: uuid.UUID | None = None
    book_id: uuid.UUID | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class ClassCreate(ClassBase):
    name: str


class ClassUpdate(ClassBase):
    status: str | None = None


class ClassResponse(ClassBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    status: str | None = None
    assignments: list[ClassAssignmentResponse] = []
