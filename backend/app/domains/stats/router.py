from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.domains.stats.schemas import (
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
