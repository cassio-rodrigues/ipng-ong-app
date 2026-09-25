from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

AlertType = Literal["attendance_risk", "negative_highlight", "homework_check", "overdue_loan", "lesson_on_holiday", "low_grade",
    "positive_highlight", "class_without_teacher", "lesson_missing_attendance", "teacher_inactive",
]


class LastFollowup(BaseModel):
    resolution: str
    note: str | None = None
    created_by_name: str | None = None
    created_at: datetime


class AlertResponse(BaseModel):
    key: str
    type: AlertType
    severity: Literal["high", "medium", "low"]  # low = oportunidade (ex.: destaque positivo)
    ref_id: uuid.UUID
    student_id: uuid.UUID | None = None
    student_name: str | None = None
    student_phone: str | None = None
    teacher_name: str | None = None
    teacher_phone: str | None = None
    class_id: uuid.UUID | None = None
    class_name: str | None = None
    lesson_id: uuid.UUID | None = None
    title: str
    detail: str
    occurred_at: datetime | None = None
    # Último acompanhamento anterior (ex.: adiado ou resolvido e o problema voltou)
    last_followup: LastFollowup | None = None


class FollowupCreate(BaseModel):
    alert_type: AlertType
    ref_id: uuid.UUID
    student_id: uuid.UUID | None = None
    resolution: Literal["resolved", "snoozed"]
    note: str | None = Field(default=None, max_length=2000)
    snooze_days: int = Field(default=7, ge=1, le=90)


class FollowupResponse(BaseModel):
    id: uuid.UUID
    alert_type: str
    ref_id: uuid.UUID
    student_id: uuid.UUID | None = None
    resolution: str
    note: str | None = None
    snooze_until: datetime | None = None
    created_by_name: str | None = None
    created_at: datetime
