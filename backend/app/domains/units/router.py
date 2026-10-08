from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.domains.units.schemas import UnitCreate, UnitListItem, UnitResponse, UnitUpdate
from app.domains.units.service import count_by_unit, create_unit, get_unit, list_units, update_unit

router = APIRouter(prefix="/units", tags=["Units"])


@router.get("", response_model=list[UnitListItem])
async def get_units(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    units = await list_units(db, skip, limit)
    classes, students = await count_by_unit(db)
    return [
        UnitListItem.model_validate(u).model_copy(
            update={"active_classes_count": classes.get(u.id, 0), "active_students_count": students.get(u.id, 0)}
        )
        for u in units
    ]


@router.post("", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
async def create(body: UnitCreate, db: AsyncSession = Depends(get_db), _=Depends(require_role("admin"))):
    return await create_unit(db, body)


@router.get("/{unit_id}", response_model=UnitResponse)
async def get_one(unit_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    unit = await get_unit(db, unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")
    return unit


@router.patch("/{unit_id}", response_model=UnitResponse)
async def update(
    unit_id: uuid.UUID,
    body: UnitUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    unit = await get_unit(db, unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")
    return await update_unit(db, unit, body)
