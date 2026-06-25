from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AttendanceRecord(BaseModel):
    student_id: uuid.UUID
    status: str = "present"
    check_in_time: datetime | None = None
    notes: str | None = None


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
