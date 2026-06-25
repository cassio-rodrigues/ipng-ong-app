"""
Seed inicial: cria usuário admin padrão.

Uso:
    docker compose exec backend python seed.py
    # ou, localmente com PYTHONPATH ajustado:
    DATABASE_URL=postgresql+asyncpg://... python seed.py
"""
from __future__ import annotations

import asyncio
import os
import sys

# Garante que o pacote app é encontrado quando rodado direto
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models import User  # noqa — importa todos os modelos


ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@ipng.org")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "admin123")
ADMIN_NAME = os.getenv("SEED_ADMIN_NAME", "Administrador")


async def seed(db: AsyncSession) -> None:
    result = await db.execute(select(User).where(User.email == ADMIN_EMAIL))
    existing = result.scalar_one_or_none()

    if existing:
        print(f"[seed] Usuário '{ADMIN_EMAIL}' já existe — nenhuma alteração feita.")
        return

    admin = User(
        name=ADMIN_NAME,
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        role="admin",
        status="active",
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)

    print(f"[seed] Admin criado com sucesso:")
    print(f"       id    : {admin.id}")
    print(f"       email : {admin.email}")
    print(f"       senha : {ADMIN_PASSWORD}  ← altere em produção!")


async def main() -> None:
    async with AsyncSessionLocal() as db:
        await seed(db)


if __name__ == "__main__":
    asyncio.run(main())
