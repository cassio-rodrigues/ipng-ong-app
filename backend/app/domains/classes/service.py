from __future__ import annotations

import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.classes.schemas import ClassAssignmentBase, ClassCreate, ClassUpdate
from app.models.class_ import Class_, ClassAssignment
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
    assignment = ClassAssignment(class_id=class_id, **data.model_dump())
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def get_class_students(db: AsyncSession, class_id: uuid.UUID):
    result = await db.execute(
        select(Student)
        .join(Enrollment, Enrollment.student_id == Student.id)
        .where(Enrollment.class_id == class_id, Enrollment.status == "active")
    )
    return list(result.scalars().all())
