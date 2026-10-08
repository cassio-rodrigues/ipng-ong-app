from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UnitBase(BaseModel):
    name: str | None = None
    address: str | None = None
    coordinator_id: uuid.UUID | None = None


class UnitCreate(UnitBase):
    name: str


class UnitUpdate(UnitBase):
    status: str | None = None


class UnitResponse(UnitBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    status: str | None = None
    created_at: datetime | None = None


class UnitListItem(UnitResponse):
    active_classes_count: int = 0
    active_students_count: int = 0
