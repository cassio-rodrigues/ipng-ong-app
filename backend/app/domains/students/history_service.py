from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import Attendance
from app.models.assessment import StudentGrade
from app.models.activity import StudentActivity, StudentHighlight
from app.models.book_loan import BookLoan
from app.models.student import Student
from app.domains.students.history_schemas import (
    ActivityBrief,
    ActivityItem,
    AssessmentBrief,
    AttendanceItem,
    AttendanceSummary,
    EnrollmentClass,
    EnrollmentItem,
    GradeItem,
    HighlightItem,
    LessonBrief,
    LoanItem,
    LoanBook,
    StudentBasic,
    StudentHistory,
)


async def get_student_history(db: AsyncSession, student_id: uuid.UUID) -> StudentHistory | None:
    student = await db.get(Student, student_id)
    if not student:
        return None

    student_basic = StudentBasic(
        id=student.id,
        full_name=student.full_name,
        email=student.email,
        phone=student.phone,
        gender=student.gender,
        birth_date=student.birth_date,
        status=student.status,
        created_at=student.created_at,
        unit_name=student.unit.name if student.unit else None,
    )

    enrollments = [
        EnrollmentItem(
            id=e.id,
            class_id=e.class_id,
            status=e.status,
            enrollment_date=e.enrollment_date,
            class_=EnrollmentClass(
                id=e.class_.id,
                name=e.class_.name,
                level=e.class_.level,
                status=e.class_.status,
            ) if e.class_ else None,
        )
        for e in student.enrollments
    ]

    att_rows = (await db.execute(
        select(Attendance).where(Attendance.student_id == student_id)
        .order_by(Attendance.id)
    )).scalars().all()

    att_items = []
    for a in att_rows:
        lesson = a.lesson
        att_items.append(AttendanceItem(
            id=a.id,
            lesson_id=a.lesson_id,
            status=a.status,
            notes=a.notes,
            lesson=LessonBrief(
                id=lesson.id,
                scheduled_at=lesson.scheduled_at,
                class_name=lesson.class_.name if lesson.class_ else None,
            ) if lesson else None,
        ))

    total = len(att_items)
    present = sum(1 for a in att_items if a.status == "present")
    absent = sum(1 for a in att_items if a.status == "absent")
    late = sum(1 for a in att_items if a.status == "late")
    justified = sum(1 for a in att_items if a.status == "justified")
    rate = round((present + late) / total * 100, 1) if total > 0 else 0.0

    attendance = AttendanceSummary(
        total=total,
        present=present,
        absent=absent,
        late=late,
        justified=justified,
        rate=rate,
        records=sorted(att_items, key=lambda x: x.lesson.scheduled_at if x.lesson and x.lesson.scheduled_at else "", reverse=True),
    )

    grade_rows = (await db.execute(
        select(StudentGrade).where(StudentGrade.student_id == student_id)
        .order_by(StudentGrade.created_at.desc())
    )).scalars().all()

    grades = [
        GradeItem(
            id=g.id,
            assessment_id=g.assessment_id,
            score=g.score,
            feedback=g.feedback,
            created_at=g.created_at,
            assessment=AssessmentBrief(
                id=g.assessment.id,
                title=g.assessment.title,
                type=g.assessment.type,
                semester=g.assessment.semester,
                date=g.assessment.date,
                max_score=g.assessment.max_score,
                class_name=g.assessment.class_.name if g.assessment.class_ else None,
            ) if g.assessment else None,
        )
        for g in grade_rows
    ]

    activity_rows = (await db.execute(
        select(StudentActivity).where(StudentActivity.student_id == student_id)
        .order_by(StudentActivity.id)
    )).scalars().all()

    activities = [
        ActivityItem(
            id=a.id,
            activity_id=a.activity_id,
            status=a.status,
            score=a.score,
            notes=a.notes,
            activity=ActivityBrief(
                id=a.activity.id,
                title=a.activity.title,
                type=a.activity.type,
                date=a.activity.date,
                class_name=a.activity.class_.name if a.activity.class_ else None,
            ) if a.activity else None,
        )
        for a in activity_rows
    ]

    highlight_rows = (await db.execute(
        select(StudentHighlight).where(StudentHighlight.student_id == student_id)
        .order_by(StudentHighlight.created_at.desc())
    )).scalars().all()

    highlights = [
        HighlightItem(
            id=h.id,
            title=h.title,
            description=h.description,
            highlight_type=h.highlight_type,
            created_at=h.created_at,
            class_name=h.class_.name if h.class_ else None,
            teacher_name=h.teacher.name if h.teacher else None,
        )
        for h in highlight_rows
    ]

    loan_rows = (await db.execute(
        select(BookLoan).where(BookLoan.student_id == student_id)
        .order_by(BookLoan.borrowed_at.desc())
    )).scalars().all()

    loans = [
        LoanItem(
            id=l.id,
            book_id=l.book_id,
            borrowed_at=l.borrowed_at,
            due_date=l.due_date,
            returned_at=l.returned_at,
            status=l.status,
            notes=l.notes,
            book=LoanBook(
                id=l.book.id,
                title=l.book.title,
                author=l.book.author,
            ) if l.book else None,
        )
        for l in loan_rows
    ]

    return StudentHistory(
        student=student_basic,
        enrollments=enrollments,
        attendance=attendance,
        grades=grades,
        activities=activities,
        highlights=highlights,
        loans=loans,
    )
