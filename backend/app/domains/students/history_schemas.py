from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class EnrollmentClass(BaseModel):
    id: uuid.UUID
    name: str | None
    level: str | None
    status: str | None
    model_config = {"from_attributes": True}


class EnrollmentItem(BaseModel):
    id: uuid.UUID
    class_id: uuid.UUID
    status: str | None
    enrollment_date: datetime | None
    class_: EnrollmentClass | None = None
    model_config = {"from_attributes": True}


class LessonBrief(BaseModel):
    id: uuid.UUID
    scheduled_at: datetime | None
    class_name: str | None = None
    model_config = {"from_attributes": True}


class AttendanceItem(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    status: str | None
    notes: str | None
    lesson: LessonBrief | None = None
    model_config = {"from_attributes": True}


class AttendanceSummary(BaseModel):
    total: int
    present: int
    absent: int
    late: int
    justified: int
    rate: float  # % de presença
    records: list[AttendanceItem]


class AssessmentBrief(BaseModel):
    id: uuid.UUID
    title: str | None
    type: str | None
    semester: str | None
    date: datetime | None
    max_score: int | None
    class_name: str | None = None
    model_config = {"from_attributes": True}


class GradeItem(BaseModel):
    id: uuid.UUID
    assessment_id: uuid.UUID
    score: Decimal | None
    feedback: str | None
    created_at: datetime | None
    assessment: AssessmentBrief | None = None
    model_config = {"from_attributes": True}


class ActivityBrief(BaseModel):
    id: uuid.UUID
    title: str | None
    type: str | None
    date: datetime | None
    class_name: str | None = None
    model_config = {"from_attributes": True}


class ActivityItem(BaseModel):
    id: uuid.UUID
    activity_id: uuid.UUID
    status: str | None
    score: Decimal | None
    notes: str | None
    activity: ActivityBrief | None = None
    model_config = {"from_attributes": True}


class HighlightItem(BaseModel):
    id: uuid.UUID
    title: str | None
    description: str | None
    highlight_type: str | None
    created_at: datetime | None
    class_name: str | None = None
    teacher_name: str | None = None
    model_config = {"from_attributes": True}


class LoanBook(BaseModel):
    id: uuid.UUID
    title: str | None
    author: str | None = None
    model_config = {"from_attributes": True}


class LoanItem(BaseModel):
    id: uuid.UUID
    book_id: uuid.UUID
    borrowed_at: datetime
    due_date: datetime | None
    returned_at: datetime | None
    status: str
    notes: str | None
    book: LoanBook | None = None
    model_config = {"from_attributes": True}


class StudentBasic(BaseModel):
    id: uuid.UUID
    full_name: str | None
    email: str | None
    phone: str | None
    gender: str | None
    birth_date: date | None
    status: str | None
    created_at: datetime | None
    unit_name: str | None = None
    model_config = {"from_attributes": True}


class StudentHistory(BaseModel):
    student: StudentBasic
    enrollments: list[EnrollmentItem]
    attendance: AttendanceSummary
    grades: list[GradeItem]
    activities: list[ActivityItem]
    highlights: list[HighlightItem]
    loans: list[LoanItem]
