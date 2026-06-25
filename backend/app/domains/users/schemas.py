from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class TeacherProfileBase(BaseModel):
    bio: str | None = None
    specialties: str | None = None
    experience_years: int | None = None
    availability: str | None = None


class TeacherProfileResponse(TeacherProfileBase):
    model_config = ConfigDict(from_attributes=True)
    user_id: uuid.UUID


class UserBase(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    telefone: str | None = None
    role: str | None = None
    gender: str | None = None
    birth_date: date | None = None


class UserCreate(UserBase):
    email: EmailStr
    password: str
    role: str = "teacher"


class UserUpdate(UserBase):
    password: str | None = None
    status: str | None = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    status: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    teacher_profile: TeacherProfileResponse | None = None
