from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import check_owner, get_current_user, require_role
from app.domains.assessments.schemas import AssessmentCreate, AssessmentResponse, AssessmentUpdate, GradeBulkCreate, StudentGradeResponse
from app.domains.assessments.service import bulk_grades, create_assessment, get_assessment, list_assessments, update_assessment

router = APIRouter(prefix="/assessments", tags=["Assessments"])


@router.get("", response_model=list[AssessmentResponse])
async def get_assessments(
    skip: int = 0,
    limit: int = 50,
    class_id: uuid.UUID | None = None,
    semester: str | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await list_assessments(db, skip, limit, class_id, semester)


@router.post("", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
async def create(
    body: AssessmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await create_assessment(db, body, current_user.id)


@router.get("/{assessment_id}", response_model=AssessmentResponse)
async def get_one(assessment_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    assessment = await get_assessment(db, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    return assessment


@router.patch("/{assessment_id}", response_model=AssessmentResponse)
async def update(assessment_id: uuid.UUID, body: AssessmentUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    assessment = await get_assessment(db, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    check_owner(assessment.created_by, current_user)
    return await update_assessment(db, assessment, body)


@router.post("/{assessment_id}/grades", response_model=list[StudentGradeResponse])
async def post_grades(assessment_id: uuid.UUID, body: GradeBulkCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    assessment = await get_assessment(db, assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    check_owner(assessment.created_by, current_user)
    return await bulk_grades(db, assessment_id, body)
