from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class GradeRecord(BaseModel):
    student_id: uuid.UUID
    score: Decimal
    feedback: str | None = None


class GradeBulkCreate(BaseModel):
    grades: list[GradeRecord]


class StudentGradeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    assessment_id: uuid.UUID
    student_id: uuid.UUID
    score: Decimal | None = None
    feedback: str | None = None
    created_at: datetime | None = None


class AssessmentBase(BaseModel):
    class_id: uuid.UUID | None = None
    title: str | None = None
    type: str | None = None
    semester: str | None = None
    date: datetime | None = None
    max_score: int | None = None


class AssessmentCreate(AssessmentBase):
    title: str
    class_id: uuid.UUID


class AssessmentUpdate(AssessmentBase):
    pass


class AssessmentResponse(AssessmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_by: uuid.UUID | None = None
    grades: list[StudentGradeResponse] = []
