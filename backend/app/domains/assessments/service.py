from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.assessments.schemas import AssessmentCreate, AssessmentUpdate, GradeBulkCreate
from app.models.assessment import Assessment, StudentGrade


async def list_assessments(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    class_id: uuid.UUID | None = None,
    semester: str | None = None,
) -> list[Assessment]:
    q = select(Assessment).options(selectinload(Assessment.grades))
    if class_id:
        q = q.where(Assessment.class_id == class_id)
    if semester:
        q = q.where(Assessment.semester == semester)
    result = await db.execute(q.offset(skip).limit(limit))
    return list(result.scalars().all())


async def get_assessment(db: AsyncSession, assessment_id: uuid.UUID) -> Assessment | None:
    result = await db.execute(
        select(Assessment).options(selectinload(Assessment.grades)).where(Assessment.id == assessment_id)
    )
    return result.scalar_one_or_none()


async def create_assessment(db: AsyncSession, data: AssessmentCreate, created_by: uuid.UUID) -> Assessment:
    assessment = Assessment(**data.model_dump(), created_by=created_by)
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    return assessment


async def update_assessment(db: AsyncSession, assessment: Assessment, data: AssessmentUpdate) -> Assessment:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(assessment, field, value)
    await db.commit()
    await db.refresh(assessment)
    return assessment


async def bulk_grades(db: AsyncSession, assessment_id: uuid.UUID, data: GradeBulkCreate) -> list[StudentGrade]:
    existing_result = await db.execute(select(StudentGrade).where(StudentGrade.assessment_id == assessment_id))
    existing = {g.student_id: g for g in existing_result.scalars().all()}

    grades = []
    for rec in data.grades:
        if rec.student_id in existing:
            g = existing[rec.student_id]
            g.score = rec.score
            g.feedback = rec.feedback
        else:
            g = StudentGrade(assessment_id=assessment_id, student_id=rec.student_id, score=rec.score, feedback=rec.feedback)
            db.add(g)
        grades.append(g)

    await db.commit()
    for g in grades:
        await db.refresh(g)
    return grades
