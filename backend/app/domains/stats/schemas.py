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
    phone: str | None = None  # telefone para contato (WhatsApp)


class AnalysisClass(BaseModel):
    id: str
    name: str | None
    level: str | None
    book: str | None


class AnalysisStudent(BaseModel):
    id: str
    full_name: str | None
    gender: str | None
    birth_date: str | None      # YYYY-MM-DD
    age: int | None
    education_level: str | None
    unit_id: str | None
    unit_name: str | None
    status: str | None
    created_at: str | None
    classes: list[AnalysisClass]
    attendance_rate: float | None  # geral, None sem registros


class PeriodMetric(BaseModel):
    current: float
    previous: float


class PeriodStats(BaseModel):
    period: str
    start: str
    end: str
    previous_start: str
    previous_end: str
    new_students: PeriodMetric
    lessons_given: PeriodMetric      # aulas com presença lançada
    attendance_rate: PeriodMetric    # % presente+atrasado sobre registros do período
    absences: PeriodMetric


# ── Resumo de relatórios (texto montado no navegador) ──────────────────────────

class SummaryLesson(BaseModel):
    date: str
    status: str | None = None
    teacher: str | None = None
    chapter: str | None = None
    attended: int = 0
    total: int = 0
    summary: str | None = None
    activities_done: str | None = None
    homework: str | None = None
    observations: str | None = None


class SummaryLowAttendance(BaseModel):
    name: str
    rate: float
    absences: int
    total: int


class SummaryClass(BaseModel):
    id: str
    name: str | None = None
    unit: str | None = None
    level: str | None = None
    teacher: str | None = None
    attendance_rate: float | None = None
    lessons: list[SummaryLesson]
    low_attendance: list[SummaryLowAttendance]
    student_names: list[str]       # para o navegador ocultar nomes no texto copiado


class SummaryHighlight(BaseModel):
    student: str | None = None
    class_name: str | None = None
    type: str | None = None
    title: str | None = None
    date: str


class ReportSummary(BaseModel):
    start: str
    end: str
    active_students: int
    new_students: int
    lessons_given: int
    lessons_with_report: int
    attendance_rate: float
    absences: int
    classes: list[SummaryClass]
    highlights: list[SummaryHighlight]
