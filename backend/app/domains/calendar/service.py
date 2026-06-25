from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.calendar.schemas import CalendarEventCreate, CalendarEventUpdate
from app.models.calendar import CalendarEvent


async def list_events(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    unit_id: uuid.UUID | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> list[CalendarEvent]:
    q = select(CalendarEvent)
    if unit_id:
        q = q.where(CalendarEvent.unit_id == unit_id)
    if start_date:
        q = q.where(CalendarEvent.start_date >= start_date)
    if end_date:
        q = q.where(CalendarEvent.end_date <= end_date)
    result = await db.execute(q.order_by(CalendarEvent.start_date).offset(skip).limit(limit))
    return list(result.scalars().all())


async def get_event(db: AsyncSession, event_id: uuid.UUID) -> CalendarEvent | None:
    return await db.get(CalendarEvent, event_id)


async def create_event(db: AsyncSession, data: CalendarEventCreate, created_by: uuid.UUID) -> CalendarEvent:
    event = CalendarEvent(**data.model_dump(), created_by=created_by)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


async def update_event(db: AsyncSession, event: CalendarEvent, data: CalendarEventUpdate) -> CalendarEvent:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(event, field, value)
    await db.commit()
    await db.refresh(event)
    return event


async def delete_event(db: AsyncSession, event: CalendarEvent) -> None:
    await db.delete(event)
    await db.commit()
