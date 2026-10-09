from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token, verify_password
from app.models.user import User


async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email, User.status == "active"))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def build_tokens(user: User) -> dict:
    return {
        "access_token": create_access_token(str(user.id), user.email or "", user.role or "", user.token_version or 0),
        "refresh_token": create_refresh_token(str(user.id), user.token_version or 0),
        "token_type": "bearer",
    }
