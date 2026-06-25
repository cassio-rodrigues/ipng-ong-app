from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.units.schemas import UnitCreate, UnitUpdate
from app.models.unit import Unit


async def list_units(db: AsyncSession, skip: int = 0, limit: int = 50) -> list[Unit]:
    result = await db.execute(select(Unit).offset(skip).limit(limit))
    return list(result.scalars().all())


async def get_unit(db: AsyncSession, unit_id: uuid.UUID) -> Unit | None:
    return await db.get(Unit, unit_id)


async def create_unit(db: AsyncSession, data: UnitCreate) -> Unit:
    unit = Unit(**data.model_dump())
    db.add(unit)
    await db.commit()
    await db.refresh(unit)
    return unit


async def update_unit(db: AsyncSession, unit: Unit, data: UnitUpdate) -> Unit:
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(unit, field, value)
    await db.commit()
    await db.refresh(unit)
    return unit
