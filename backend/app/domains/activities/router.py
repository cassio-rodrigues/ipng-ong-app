from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import check_owner, get_current_user
from app.domains.activities.schemas import (
    ActivityCreate,
    ActivityResponse,
    ActivityUpdate,
    HighlightCreate,
    HighlightResponse,
    HighlightUpdate,
    StudentActivityBulk,
    StudentActivityResponse,
)
from app.domains.activities.service import (
    bulk_responses,
    create_activity,
    create_highlight,
    get_activity,
    list_activities,
    list_highlights,
    update_activity,
    update_highlight,
)

router = APIRouter(tags=["Activities & Highlights"])


@router.get("/activities", response_model=list[ActivityResponse])
async def get_activities(
    skip: int = 0,
    limit: int = 50,
    class_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await list_activities(db, skip, limit, class_id)


@router.post("/activities", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def create(body: ActivityCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    return await create_activity(db, body, current_user.id)


@router.get("/activities/{activity_id}", response_model=ActivityResponse)
async def get_one(activity_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    activity = await get_activity(db, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")
    return activity


@router.patch("/activities/{activity_id}", response_model=ActivityResponse)
async def update(activity_id: uuid.UUID, body: ActivityUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    activity = await get_activity(db, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")
    check_owner(activity.created_by, current_user)
    return await update_activity(db, activity, body)


@router.post("/activities/{activity_id}/student-responses", response_model=list[StudentActivityResponse])
async def post_responses(activity_id: uuid.UUID, body: StudentActivityBulk, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    activity = await get_activity(db, activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada")
    return await bulk_responses(db, activity_id, body)


@router.get("/highlights", response_model=list[HighlightResponse])
async def get_highlights(
    skip: int = 0,
    limit: int = 50,
    student_id: uuid.UUID | None = None,
    class_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await list_highlights(db, skip, limit, student_id, class_id)


@router.post("/highlights", response_model=HighlightResponse, status_code=status.HTTP_201_CREATED)
async def create_highlight_route(body: HighlightCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    return await create_highlight(db, body, current_user.id)


@router.patch("/highlights/{highlight_id}", response_model=HighlightResponse)
async def update_highlight_route(
    highlight_id: uuid.UUID,
    body: HighlightUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app.models.activity import StudentHighlight
    from sqlalchemy import select

    result = await db.execute(select(StudentHighlight).where(StudentHighlight.id == highlight_id))
    highlight = result.scalar_one_or_none()
    if not highlight:
        raise HTTPException(status_code=404, detail="Destaque não encontrado")
    check_owner(highlight.teacher_id, current_user)
    return await update_highlight(db, highlight, body)
