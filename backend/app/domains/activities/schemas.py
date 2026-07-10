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
    student_occupation: str | None = None
    reason_primary: str | None = None
    reason_secondary: str | None = None
    level_assessment: str | None = None
    participation_spontaneous: str | None = None
    class_focus: str | None = None
    interest_beyond_class: str | None = None
    speaks_despite_errors: str | None = None
    curiosity_level: str | None = None
    homework_rate: str | None = None
    english_outside_contact: str | None = None
    english_outside_channels: str | None = None
    self_confidence: str | None = None
    previously_highlighted: str | None = None
    teacher_overall_perception: str | None = None


class HighlightCreate(HighlightBase):
    student_id: uuid.UUID


class HighlightUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    highlight_type: str | None = None
    student_occupation: str | None = None
    reason_primary: str | None = None
    reason_secondary: str | None = None
    level_assessment: str | None = None
    participation_spontaneous: str | None = None
    class_focus: str | None = None
    interest_beyond_class: str | None = None
    speaks_despite_errors: str | None = None
    curiosity_level: str | None = None
    homework_rate: str | None = None
    english_outside_contact: str | None = None
    english_outside_channels: str | None = None
    self_confidence: str | None = None
    previously_highlighted: str | None = None
    teacher_overall_perception: str | None = None


class HighlightResponse(HighlightBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    teacher_id: uuid.UUID | None = None
    created_at: datetime | None = None
