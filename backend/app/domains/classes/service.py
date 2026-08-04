from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.classes.schemas import ClassAssignmentBase, ClassCreate, ClassSummary, ClassStudentSummary, ClassUpdate
from app.models.assessment import Assessment, StudentGrade
from app.models.attendance import Attendance
from app.models.class_ import Class_, ClassAssignment
from app.models.lesson import Lesson
from app.models.student import Enrollment, Student


async def list_classes(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    unit_id: uuid.UUID | None = None,
    status: str | None = None,
    level: str | None = None,
    teacher_id: uuid.UUID | None = None,
) -> list[Class_]:
    q = select(Class_).options(selectinload(Class_.assignments))
    if unit_id:
        q = q.where(Class_.unit_id == unit_id)
    if status:
        q = q.where(Class_.status == status)
    if level:
        q = q.where(Class_.level == level)
    if teacher_id:
        assigned = select(ClassAssignment.class_id).where(ClassAssignment.teacher_id == teacher_id)
        q = q.where(or_(Class_.main_teacher_id == teacher_id, Class_.id.in_(assigned)))
    result = await db.execute(q.offset(skip).limit(limit))
    return list(result.scalars().all())


async def get_class(db: AsyncSession, class_id: uuid.UUID) -> Class_ | None:
    result = await db.execute(
        select(Class_).options(selectinload(Class_.assignments)).where(Class_.id == class_id)
    )
    return result.scalar_one_or_none()


async def create_class(db: AsyncSession, data: ClassCreate) -> Class_:
    obj = Class_(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_class(db: AsyncSession, obj: Class_, data: ClassUpdate) -> Class_:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def add_assignment(db: AsyncSession, class_id: uuid.UUID, data: ClassAssignmentBase) -> ClassAssignment:
    existing = await db.execute(
        select(ClassAssignment).where(
            ClassAssignment.class_id == class_id, ClassAssignment.teacher_id == data.teacher_id
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Professor já atribuído a esta turma")
    assignment = ClassAssignment(class_id=class_id, **data.model_dump())
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def get_assignment(db: AsyncSession, assignment_id: uuid.UUID) -> ClassAssignment | None:
    return await db.get(ClassAssignment, assignment_id)


async def remove_assignment(db: AsyncSession, assignment: ClassAssignment) -> None:
    await db.delete(assignment)
    await db.commit()


async def get_class_students(db: AsyncSession, class_id: uuid.UUID):
    result = await db.execute(
        select(Student)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .where(Enrollment.class_id == class_id, Enrollment.status == "active")
    )
    return list(result.scalars().all())


async def get_class_summary(db: AsyncSession, class_id: uuid.UUID) -> ClassSummary:
    students = await get_class_students(db, class_id)

    att_rows = (await db.execute(
        select(Attendance.student_id, Attendance.status, func.count().label("n"))
        .join(Lesson, Lesson.id == Attendance.lesson_id)
        .where(Lesson.class_id == class_id)
        .group_by(Attendance.student_id, Attendance.status)
    )).all()

    att_by_student: dict[uuid.UUID, dict[str, int]] = {}
    for row in att_rows:
        att_by_student.setdefault(row.student_id, {})[row.status] = row.n

    grade_rows = (await db.execute(
        select(StudentGrade.student_id, func.avg(StudentGrade.score).label("avg"))
        .join(Assessment, Assessment.id == StudentGrade.assessment_id)
        .where(Assessment.class_id == class_id)
        .group_by(StudentGrade.student_id)
    )).all()
    grade_by_student = {row.student_id: float(row.avg) for row in grade_rows if row.avg is not None}

    student_summaries = []
    total_present_late = 0
    total_records = 0
    for s in students:
        counts = att_by_student.get(s.id, {})
        present = counts.get("present", 0)
        late = counts.get("late", 0)
        total = sum(counts.values())
        rate = round((present + late) / total * 100, 1) if total > 0 else 0.0
        total_present_late += present + late
        total_records += total
        student_summaries.append(ClassStudentSummary(
            student_id=s.id,
            full_name=s.full_name,
            attendance_rate=rate,
            grade_average=round(grade_by_student[s.id], 1) if s.id in grade_by_student else None,
        ))

    class_rate = round(total_present_late / total_records * 100, 1) if total_records > 0 else 0.0
    class_grade_values = list(grade_by_student.values())
    class_grade_average = round(sum(class_grade_values) / len(class_grade_values), 1) if class_grade_values else None

    return ClassSummary(
        class_id=class_id,
        student_count=len(students),
        attendance_rate=class_rate,
        grade_average=class_grade_average,
        students=student_summaries,
    )
