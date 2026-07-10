from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.students.schemas import EnrollmentCreate, StudentCreate, StudentUpdate
from app.models.class_ import Class_
from app.models.student import Enrollment, Student


async def list_students(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 200,
    unit_id: uuid.UUID | None = None,
    status: str | None = None,
    teacher_id: uuid.UUID | None = None,
) -> list[Student]:
    q = select(Student)
    if teacher_id:
        q = (q
             .join(Enrollment, Enrollment.student_id == Student.id)
             .join(Class_, Class_.id == Enrollment.class_id)
             .where(Class_.main_teacher_id == teacher_id)
             .distinct())
    if unit_id:
        q = q.where(Student.unit_id == unit_id)
    if status:
        q = q.where(Student.status == status)
    result = await db.execute(q.offset(skip).limit(limit))
    return list(result.scalars().all())


async def get_student(db: AsyncSession, student_id: uuid.UUID) -> Student | None:
    return await db.get(Student, student_id)


async def create_student(db: AsyncSession, data: StudentCreate) -> Student:
    payload = data.model_dump()
    if payload.get("full_name"):
        payload["full_name"] = payload["full_name"].strip().title()
    student = Student(**payload)
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


async def update_student(db: AsyncSession, student: Student, data: StudentUpdate) -> Student:
    for field, value in data.model_dump(exclude_none=True).items():
        if field == "full_name" and value:
            value = value.strip().title()
        setattr(student, field, value)
    await db.commit()
    await db.refresh(student)
    return student


async def get_enrollments(db: AsyncSession, student_id: uuid.UUID) -> list[Enrollment]:
    result = await db.execute(select(Enrollment).where(Enrollment.student_id == student_id))
    return list(result.scalars().all())


async def enroll_student(db: AsyncSession, student_id: uuid.UUID, data: EnrollmentCreate) -> Enrollment:
    enrollment = Enrollment(student_id=student_id, class_id=data.class_id, status="active")
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    return enrollment


async def get_enrollment(db: AsyncSession, enrollment_id: uuid.UUID) -> Enrollment | None:
    return await db.get(Enrollment, enrollment_id)


async def delete_enrollment(db: AsyncSession, enrollment: Enrollment) -> None:
    await db.delete(enrollment)
    await db.commit()
