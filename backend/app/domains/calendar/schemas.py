from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CalendarEventBase(BaseModel):
    unit_id: uuid.UUID | None = None
    title: str | None = None
    description: str | None = None
    event_type: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_all_day: bool | None = False
    visibility: str | None = "all"


class CalendarEventCreate(CalendarEventBase):
    title: str
    start_date: datetime


class CalendarEventUpdate(CalendarEventBase):
    pass


class CalendarEventResponse(CalendarEventBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_by: uuid.UUID | None = None
