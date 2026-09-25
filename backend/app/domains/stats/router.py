from __future__ import annotations

from datetime import date as date_type, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.core.tz import LOCAL_TZ
from app.models.book import Book
from app.domains.stats.schemas import (
    AnalysisClass,
    AnalysisStudent,
    PeriodMetric,
    PeriodStats,
    BirthdayPerson,
    ClassCount,
    ClassStats,
    DashboardStats,
    GenderBreakdown,
    StudentStats,
    TeacherStats,
)
from app.models.attendance import Attendance
from app.models.class_ import Class_
from app.models.lesson import Lesson
from app.models.student import Enrollment, Student
from app.models.unit import Unit
from app.models.user import User
from app.models.user import User

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    # Students
    student_rows = (await db.execute(
        select(Student.status, Student.gender, func.count().label("n"))
        .group_by(Student.status, Student.gender)
    )).all()

    s_total = sum(r.n for r in student_rows)
    s_active = sum(r.n for r in student_rows if r.status == "active")
    s_inactive = sum(r.n for r in student_rows if r.status != "active")
    gender = GenderBreakdown(
        M=sum(r.n for r in student_rows if r.gender == "M"),
        F=sum(r.n for r in student_rows if r.gender == "F"),
        O=sum(r.n for r in student_rows if r.gender == "O"),
        unknown=sum(r.n for r in student_rows if r.gender not in ("M", "F", "O")),
    )

    # Teachers
    teacher_rows = (await db.execute(
        select(User.status, func.count().label("n"))
        .where(User.role == "teacher")
        .group_by(User.status)
    )).all()

    t_total = sum(r.n for r in teacher_rows)
    t_active = sum(r.n for r in teacher_rows if r.status == "active")
    t_inactive = sum(r.n for r in teacher_rows if r.status != "active")

    # Classes
    class_rows = (await db.execute(
        select(Class_.status, func.count().label("n"))
        .group_by(Class_.status)
    )).all()

    c_total = sum(r.n for r in class_rows)
    c_active = sum(r.n for r in class_rows if r.status == "active")

    # Students per class (via enrollments)
    spc_rows = (await db.execute(
        select(Class_.id, Class_.name, func.count(Enrollment.id).label("n"))
        .join(Enrollment, Enrollment.class_id == Class_.id, isouter=True)
        .where(Enrollment.status == "active")
        .group_by(Class_.id, Class_.name)
        .order_by(func.count(Enrollment.id).desc())
        .limit(20)
    )).all()

    students_per_class = [
        ClassCount(class_id=str(r.id), class_name=r.name or "—", count=r.n)
        for r in spc_rows
    ]

    # Absences per class (via lessons → attendance)
    abs_rows = (await db.execute(
        select(Class_.id, Class_.name, func.count(Attendance.id).label("n"))
        .join(Lesson, Lesson.class_id == Class_.id)
        .join(Attendance, Attendance.lesson_id == Lesson.id)
        .where(Attendance.status == "absent")
        .group_by(Class_.id, Class_.name)
        .order_by(func.count(Attendance.id).desc())
        .limit(20)
    )).all()

    absences_per_class = [
        ClassCount(class_id=str(r.id), class_name=r.name or "—", count=r.n)
        for r in abs_rows
    ]

    return DashboardStats(
        students=StudentStats(total=s_total, active=s_active, inactive=s_inactive, by_gender=gender),
        teachers=TeacherStats(total=t_total, active=t_active, inactive=t_inactive),
        classes=ClassStats(total=c_total, active=c_active),
        students_per_class=students_per_class,
        absences_per_class=absences_per_class,
    )


@router.get("/birthdays", response_model=list[BirthdayPerson])
async def birthday_list(
    month: int | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    target_month = month if month else date_type.today().month

    # Alunos com aniversário no mês — agrega turmas via string_agg
    student_rows = (await db.execute(
        select(
            Student.id,
            Student.full_name,
            Student.birth_date,
            Student.gender,
            Student.phone,
            Unit.name.label("unit_name"),
            func.string_agg(Class_.name, ", ").label("class_names"),
        )
        .outerjoin(Unit, Unit.id == Student.unit_id)
        .outerjoin(
            Enrollment,
            (Enrollment.student_id == Student.id) & (Enrollment.status == "active"),
        )
        .outerjoin(Class_, Class_.id == Enrollment.class_id)
        .where(func.extract("month", Student.birth_date) == target_month)
        .where(Student.status == "active")
        .group_by(Student.id, Unit.name)
        .order_by(func.extract("day", Student.birth_date))
    )).all()

    # Professores/usuários com aniversário no mês
    teacher_rows = (await db.execute(
        select(User.id, User.name, User.birth_date, User.gender, User.role, User.telefone)
        .where(func.extract("month", User.birth_date) == target_month)
        .where(User.status == "active")
        .order_by(func.extract("day", User.birth_date))
    )).all()

    result: list[BirthdayPerson] = []

    for r in student_rows:
        if not r.birth_date:
            continue
        result.append(BirthdayPerson(
            id=str(r.id),
            name=r.full_name or "—",
            type="student",
            birth_date=r.birth_date.isoformat(),
            day=r.birth_date.day,
            gender=r.gender,
            classes=[c.strip() for c in r.class_names.split(",")] if r.class_names else [],
            unit=r.unit_name,
            role=None,
            phone=r.phone,
        ))

    for r in teacher_rows:
        if not r.birth_date:
            continue
        result.append(BirthdayPerson(
            id=str(r.id),
            name=r.name or "—",
            type="teacher",
            birth_date=r.birth_date.isoformat(),
            day=r.birth_date.day,
            gender=r.gender,
            classes=[],
            unit=None,
            role=r.role,
            phone=r.telefone,
        ))

    result.sort(key=lambda x: x.day)
    return result


# ── Análise cruzada ────────────────────────────────────────────────────────────
# Devolve uma linha por aluno com as dimensões; os filtros se cruzam no navegador
# (volume da ONG é de centenas de alunos). Só gestão: contém dados pessoais.

@router.get("/students-analysis", response_model=list[AnalysisStudent])
async def students_analysis(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    today = date_type.today()
    students = (await db.execute(select(Student))).scalars().all()

    class_rows = (await db.execute(
        select(Enrollment.student_id, Class_.id, Class_.name, Class_.level, Book.title)
        .join(Class_, Class_.id == Enrollment.class_id)
        .outerjoin(Book, Book.id == Class_.book_id)
        .where(Enrollment.status == "active")
    )).all()
    classes_by_student: dict = {}
    for r in class_rows:
        classes_by_student.setdefault(r.student_id, []).append(
            AnalysisClass(id=str(r.id), name=r.name, level=r.level, book=r.title)
        )

    att_rows = (await db.execute(
        select(
            Attendance.student_id,
            func.count().label("total"),
            func.sum(case((Attendance.status.in_(["present", "late"]), 1), else_=0)).label("attended"),
        ).group_by(Attendance.student_id)
    )).all()
    rate_by_student = {r.student_id: round(r.attended / r.total * 100, 1) for r in att_rows if r.total}

    def age(b):
        if not b:
            return None
        return today.year - b.year - ((today.month, today.day) < (b.month, b.day))

    return [
        AnalysisStudent(
            id=str(s.id), full_name=s.full_name, gender=s.gender,
            birth_date=s.birth_date.isoformat() if s.birth_date else None, age=age(s.birth_date),
            education_level=s.education_level,
            unit_id=str(s.unit_id) if s.unit_id else None, unit_name=s.unit.name if s.unit else None,
            status=s.status, created_at=s.created_at.isoformat() if s.created_at else None,
            classes=classes_by_student.get(s.id, []),
            attendance_rate=rate_by_student.get(s.id),
        )
        for s in students
    ]


# ── Comparativo temporal ───────────────────────────────────────────────────────

def _period_bounds(period: str, now: datetime) -> tuple[datetime, datetime, datetime, datetime]:
    """(início, fim, início anterior, fim anterior). Semestre/ano: período até hoje vs o
    mesmo trecho (mesma duração) do semestre/ano anterior."""
    if period == "semester":
        start = now.replace(month=1 if now.month <= 6 else 7, day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_start = start.replace(year=start.year - 1, month=7) if start.month == 1 else start.replace(month=1)
    elif period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_start = start.replace(year=start.year - 1)
    else:  # 30d
        start = now - timedelta(days=30)
        prev_start = start - timedelta(days=30)
    return start, now, prev_start, prev_start + (now - start)


@router.get("/period", response_model=PeriodStats)
async def period_stats(
    period: str = "30d",
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    if period not in ("30d", "semester", "year"):
        period = "30d"
    now = datetime.now(LOCAL_TZ)
    start, end, pstart, pend = _period_bounds(period, now)

    async def metrics(a: datetime, b: datetime) -> tuple[int, int, float, int]:
        new = (await db.execute(
            select(func.count()).select_from(Student).where(Student.created_at >= a, Student.created_at < b)
        )).scalar_one()
        att = (await db.execute(
            select(
                func.count(func.distinct(Attendance.lesson_id)).label("lessons"),
                func.count().label("total"),
                func.sum(case((Attendance.status.in_(["present", "late"]), 1), else_=0)).label("attended"),
                func.sum(case((Attendance.status == "absent", 1), else_=0)).label("absent"),
            )
            .join(Lesson, Lesson.id == Attendance.lesson_id)
            .where(Lesson.scheduled_at >= a, Lesson.scheduled_at < b)
        )).one()
        rate = round((att.attended or 0) / att.total * 100, 1) if att.total else 0.0
        return new, att.lessons or 0, rate, att.absent or 0

    cur, prev = await metrics(start, end), await metrics(pstart, pend)
    return PeriodStats(
        period=period, start=start.date().isoformat(), end=end.date().isoformat(),
        previous_start=pstart.date().isoformat(), previous_end=pend.date().isoformat(),
        new_students=PeriodMetric(current=cur[0], previous=prev[0]),
        lessons_given=PeriodMetric(current=cur[1], previous=prev[1]),
        attendance_rate=PeriodMetric(current=cur[2], previous=prev[2]),
        absences=PeriodMetric(current=cur[3], previous=prev[3]),
    )
