from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import alphabetical

from app.domains.units.schemas import UnitCreate, UnitUpdate
from app.models.class_ import Class_
from app.models.student import Student
from app.models.unit import Unit


async def list_units(db: AsyncSession, skip: int = 0, limit: int = 50) -> list[Unit]:
    result = await db.execute(select(Unit).order_by(alphabetical(Unit.name)).offset(skip).limit(limit))
    return list(result.scalars().all())


async def count_by_unit(db: AsyncSession) -> tuple[dict[uuid.UUID, int], dict[uuid.UUID, int]]:
    """Turmas ativas e alunos ativos por unidade."""
    classes = await db.execute(
        select(Class_.unit_id, func.count()).where(Class_.status == "active").group_by(Class_.unit_id)
    )
    students = await db.execute(
        select(Student.unit_id, func.count()).where(Student.status == "active").group_by(Student.unit_id)
    )
    return dict(classes.all()), dict(students.all())


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
