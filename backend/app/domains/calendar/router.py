from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.core.deps import check_owner, get_current_user, require_role
from app.domains.calendar.holidays import br_holidays
from app.models.calendar import CalendarEvent
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
async def update(event_id: uuid.UUID, body: CalendarEventUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    event = await get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    check_owner(event.created_by, current_user)
    return await update_event(db, event, body)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(event_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    event = await get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    check_owner(event.created_by, current_user)
    await delete_event(db, event)


class HolidayImport(BaseModel):
    year: int = Field(ge=2000, le=2100)
    include_sp: bool = False


class HolidayImportResult(BaseModel):
    created: int
    skipped: int


@router.post("/holidays/import", response_model=HolidayImportResult)
async def import_holidays(
    body: HolidayImport,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "coordinator")),
):
    """Cadastra os feriados nacionais do ano (válidos para todas as unidades).
    Pula dias que já têm um feriado geral cadastrado, então pode ser rodado de novo sem duplicar."""
    # Mesma convenção dos eventos de dia inteiro: data local gravada como 00:00–23:59 UTC
    year_start = datetime(body.year, 1, 1, tzinfo=timezone.utc)
    existing = await db.execute(
        select(CalendarEvent.start_date).where(
            CalendarEvent.event_type == "holiday",
            CalendarEvent.unit_id.is_(None),
            CalendarEvent.start_date >= year_start,
            CalendarEvent.start_date < year_start.replace(year=body.year + 1),
        )
    )
    taken = {d.date() for d in existing.scalars().all() if d}

    created = skipped = 0
    for day, title in br_holidays(body.year, body.include_sp):
        if day in taken:
            skipped += 1
            continue
        db.add(CalendarEvent(
            title=title, event_type="holiday", visibility="all", is_all_day=True, created_by=current_user.id,
            start_date=datetime(day.year, day.month, day.day, 0, 0, tzinfo=timezone.utc),
            end_date=datetime(day.year, day.month, day.day, 23, 59, tzinfo=timezone.utc),
        ))
        created += 1
    await db.commit()
    return HolidayImportResult(created=created, skipped=skipped)
