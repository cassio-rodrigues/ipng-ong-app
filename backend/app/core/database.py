from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy import ColumnElement
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


def alphabetical(column) -> ColumnElement:
    """Ordem alfabética em português: ignora maiúsculas e acentos ("Álvaro" antes de "Bruno").
    A collation padrão do banco (en_US no Alpine) ordena byte a byte e joga acentuados para o fim."""
    return column.collate("pt-BR-x-icu")
