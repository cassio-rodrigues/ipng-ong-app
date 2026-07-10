from __future__ import annotations

from datetime import date as date_type

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.domains.stats.schemas import (
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
        select(User.id, User.name, User.birth_date, User.gender, User.role)
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
        ))

    result.sort(key=lambda x: x.day)
    return result
