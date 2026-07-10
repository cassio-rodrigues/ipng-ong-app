from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class EnrollmentCreate(BaseModel):
    class_id: uuid.UUID


class EnrollmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    student_id: uuid.UUID
    class_id: uuid.UUID
    enrollment_date: datetime | None = None
    status: str | None = None


class StudentBase(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    gender: str | None = None
    birth_date: date | None = None
    unit_id: uuid.UUID | None = None
    address: str | None = None
    rg: str | None = None
    cpf: str | None = None
    education_level: str | None = None
    guardian_name: str | None = None
    guardian_rg: str | None = None
    guardian_cpf: str | None = None
    terms_accepted: bool | None = None
    image_consent: bool | None = None


class StudentCreate(StudentBase):
    full_name: str


class StudentUpdate(StudentBase):
    status: str | None = None


class StudentResponse(StudentBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    status: str | None = None
    created_at: datetime | None = None
