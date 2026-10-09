from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import check_owner, get_current_user, require_role
from app.core.privacy import SENSITIVE_USER_FIELDS, redact
from app.domains.users.schemas import TeacherProfileBase, TeacherProfileResponse, UserCreate, UserResponse, UserUpdate
from app.domains.users.service import (
    create_user,
    deactivate_user,
    get_user,
    list_users,
    update_user,
    upsert_teacher_profile,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    return await list_users(db, skip, limit, status)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    return await create_user(db, body)


@router.get("/{user_id}", response_model=UserResponse)
async def get_one(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    user = await get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    response = UserResponse.model_validate(user)
    # Colegas veem nome e perfil; contato e dados pessoais só o próprio usuário e a coordenação
    return response if user.id == current_user.id else redact(response, current_user, SENSITIVE_USER_FIELDS)


@router.patch("/{user_id}", response_model=UserResponse)
async def update(
    user_id: uuid.UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin", "coordinator")),
):
    user = await get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    # Coordenação não mexe em contas de admin nem concede perfil de admin (inclusive a si mesma)
    if current_user.role != "admin" and (
        user.role == "admin" or body.role == "admin" or "admin" in (body.atribuicoes or [])
    ):
        raise HTTPException(status_code=403, detail="Somente um admin pode alterar contas ou perfis de admin")
    return await update_user(db, user, body)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_route(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin")),
):
    user = await get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    await db.delete(user)
    await db.commit()


@router.get("/{user_id}/teacher-profile", response_model=TeacherProfileResponse)
async def get_teacher_profile(user_id: uuid.UUID, db: AsyncSession = Depends(get_db), _=Depends(get_current_user)):
    user = await get_user(db, user_id)
    if not user or not user.teacher_profile:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    return user.teacher_profile


@router.put("/{user_id}/teacher-profile", response_model=TeacherProfileResponse)
async def upsert_profile(
    user_id: uuid.UUID,
    body: TeacherProfileBase,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    check_owner(user_id, current_user)
    return await upsert_teacher_profile(db, user_id, body.model_dump())
