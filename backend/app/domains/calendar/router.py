from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.domains.calendar.schemas import CalendarEventCreate, CalendarEventResponse, CalendarEventUpdate
from app.domains.calendar.service import create_event, delete_event, get_event, list_events, update_event

router = APIRouter(prefix="/calendar", tags=["Calendar"])


@router.get("/events", response_model=list[CalendarEventResponse])
async def get_events(
    skip: int = 0,
    limit: int = 100,
    unit_id: uuid.UUID | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await list_events(db, skip, limit, unit_id, start_date, end_date)


@router.post("/events", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED)
async def create(body: CalendarEventCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    return await create_event(db, body, current_user.id)


@router.patch("/events/{event_id}", response_model=CalendarEventResponse)
async def update(event_id: uuid.UUID, body: CalendarEventUpdate, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    event = await get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return await update_event(db, event, body)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(event_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    event = await get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    await delete_event(db, event)
