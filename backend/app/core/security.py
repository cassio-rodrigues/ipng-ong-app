from __future__ import annotations

from datetime import UTC, datetime, timedelta

import hashlib

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(UTC) + expires_delta
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(user_id: str, email: str, role: str, version: int = 0) -> str:
    return _create_token(
        {"sub": user_id, "email": email, "role": role, "type": "access", "ver": version},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str, version: int = 0) -> str:
    return _create_token(
        {"sub": user_id, "type": "refresh", "ver": version},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def password_fingerprint(password_hash: str | None) -> str:
    """Muda sempre que a senha muda: torna o link de redefinição de uso único."""
    return hashlib.sha256((password_hash or "").encode()).hexdigest()[:16]


def create_reset_token(user_id: str, version: int, password_hash: str | None) -> str:
    return _create_token(
        {"sub": user_id, "type": "reset", "ver": version, "pwh": password_fingerprint(password_hash)},
        timedelta(minutes=settings.PASSWORD_RESET_MINUTES),
    )


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
