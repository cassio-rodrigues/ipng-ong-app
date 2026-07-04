from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.domains.users.schemas import UserCreate, UserUpdate
from app.models.user import TeacherProfile, User


async def list_users(db: AsyncSession, skip: int = 0, limit: int = 50, status: str | None = None) -> list[User]:
    q = select(User).options(selectinload(User.teacher_profile))
    if status:
        q = q.where(User.status == status)
    result = await db.execute(q.offset(skip).limit(limit))
    return list(result.scalars().all())


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(
        select(User).options(selectinload(User.teacher_profile)).where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    user = User(
        name=data.name.strip().title() if data.name else data.name,
        email=data.email,
        telefone=data.telefone,
        role=data.role,
        gender=data.gender,
        birth_date=data.birth_date,
        password_hash=hash_password(data.password),
        status="active",
        must_change_password=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(db: AsyncSession, user: User, data: UserUpdate) -> User:
    for field, value in data.model_dump(exclude_none=True, exclude={"password"}).items():
        if field == "name" and value:
            value = value.strip().title()
        setattr(user, field, value)
    if data.password:
        user.password_hash = hash_password(data.password)
        user.must_change_password = False
    await db.commit()
    await db.refresh(user)
    return user


async def deactivate_user(db: AsyncSession, user: User) -> User:
    user.status = "inactive"
    await db.commit()
    return user


async def upsert_teacher_profile(db: AsyncSession, user_id: uuid.UUID, data: dict) -> TeacherProfile:
    profile = await db.get(TeacherProfile, user_id)
    if profile:
        for k, v in data.items():
            if v is not None:
                setattr(profile, k, v)
    else:
        profile = TeacherProfile(user_id=user_id, **{k: v for k, v in data.items() if v is not None})
        db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile
