from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


# done = fez, not_done = não fez, na = não se aplica; ausente/None = não verificado
HomeworkStatus = Literal["done", "not_done", "na"]


class AttendanceRecord(BaseModel):
    student_id: uuid.UUID
    status: str = "present"
    check_in_time: datetime | None = None
    notes: str | None = None
    homework_status: HomeworkStatus | None = None


class AttendanceBulkCreate(BaseModel):
    records: list[AttendanceRecord]


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    lesson_id: uuid.UUID
    student_id: uuid.UUID
    status: str | None = None
    check_in_time: datetime | None = None
    notes: str | None = None
    homework_status: HomeworkStatus | None = None
