from __future__ import annotations

from pydantic import BaseModel


class GenderBreakdown(BaseModel):
    M: int = 0
    F: int = 0
    O: int = 0
    unknown: int = 0


class StudentStats(BaseModel):
    total: int
    active: int
    inactive: int
    by_gender: GenderBreakdown


class TeacherStats(BaseModel):
    total: int
    active: int
    inactive: int


class ClassStats(BaseModel):
    total: int
    active: int


class ClassCount(BaseModel):
    class_id: str
    class_name: str
    count: int


class DashboardStats(BaseModel):
    students: StudentStats
    teachers: TeacherStats
    classes: ClassStats
    students_per_class: list[ClassCount]
    absences_per_class: list[ClassCount]


class BirthdayPerson(BaseModel):
    id: str
    name: str
    type: str          # "student" | "teacher"
    birth_date: str    # YYYY-MM-DD
    day: int
    gender: str | None
    classes: list[str]  # nomes das turmas (alunos)
    unit: str | None    # nome da unidade (alunos)
    role: str | None    # role (professores)
