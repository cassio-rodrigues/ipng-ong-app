from __future__ import annotations

import uuid
from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field


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
    schedule_weekday: int | None = Field(default=None, ge=0, le=6)  # 0 = segunda … 6 = domingo
    schedule_start: time | None = None
    schedule_end: time | None = None


class ClassCreate(ClassBase):
    name: str


class ClassUpdate(ClassBase):
    status: str | None = None


class ClassResponse(ClassBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    status: str | None = None
    assignments: list[ClassAssignmentResponse] = []
    student_count: int | None = None  # matrículas ativas; preenchido na listagem


class ClassStudentSummary(BaseModel):
    student_id: uuid.UUID
    full_name: str | None = None
    attendance_rate: float
    attendance_total: int = 0
    grade_average: float | None = None


class ClassSummary(BaseModel):
    class_id: uuid.UUID
    student_count: int
    attendance_rate: float
    attendance_total: int = 0
    grade_average: float | None = None
    students: list[ClassStudentSummary]


class GenerateLessonsRequest(BaseModel):
    until: date | None = None  # padrão: fim da turma ou 16 semanas


class GenerateLessonsResult(BaseModel):
    created: int
    existing: int
    skipped_holidays: list[date]
    until: date
