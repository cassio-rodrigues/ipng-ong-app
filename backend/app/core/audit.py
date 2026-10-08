"""Auditoria automática: toda criação, edição e exclusão feita via ORM numa requisição
autenticada gera uma linha em audit_logs, na mesma transação da alteração.

O usuário vem de `current_user_id`, preenchido por `get_current_user`. Sem usuário
(login, scripts de seed, tarefas internas) nada é registrado. Exclusões em massa via
`delete(Model)` não passam pelo flush do ORM e, portanto, não aparecem aqui.
"""
from __future__ import annotations

import uuid
from contextvars import ContextVar
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

current_user_id: ContextVar[uuid.UUID | None] = ContextVar("current_user_id", default=None)

# Campos que nunca têm o valor gravado no log — só a indicação de que mudaram
MASKED_FIELDS = {"password_hash"}
# Campos usados (nesta ordem) como rótulo legível da entidade
LABEL_FIELDS = ("full_name", "name", "title")


def _json(value: Any) -> Any:
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, (uuid.UUID, Decimal)):
        return str(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, (list, tuple)):
        return [_json(v) for v in value]
    return str(value)


def _masked(key: str, value: Any) -> Any:
    return "***" if key in MASKED_FIELDS and value is not None else _json(value)


def _snapshot(obj) -> dict[str, Any]:
    """Valores das colunas já carregadas (não dispara lazy load — estamos dentro do flush)."""
    state = inspect(obj)
    loaded = state.dict
    return {
        attr.key: _masked(attr.key, loaded[attr.key])
        for attr in state.mapper.column_attrs
        if attr.key in loaded and loaded[attr.key] is not None
    }


def _changes(obj) -> dict[str, list[Any]]:
    state = inspect(obj)
    changes: dict[str, list[Any]] = {}
    for attr in state.mapper.column_attrs:
        hist = state.attrs[attr.key].history
        if not hist.added:
            continue
        old = hist.deleted[0] if hist.deleted else None
        new = hist.added[0]
        if old == new:
            continue
        changes[attr.key] = [_masked(attr.key, old), _masked(attr.key, new)]
    return changes


def _label(obj) -> str | None:
    loaded = inspect(obj).dict
    for field in LABEL_FIELDS:
        if loaded.get(field):
            return str(loaded[field])[:200]
    return None


def _ensure_pk(obj) -> uuid.UUID | None:
    """Objetos novos ainda não têm id antes do flush; gera aqui para o log apontar para ele."""
    mapper = inspect(obj).mapper
    if len(mapper.primary_key) != 1:
        return None
    attr = mapper.get_property_by_column(mapper.primary_key[0]).key
    value = getattr(obj, attr)
    if value is None and mapper.primary_key[0].type.python_type is uuid.UUID:
        value = uuid.uuid4()
        setattr(obj, attr, value)
    return value if isinstance(value, uuid.UUID) else None


@event.listens_for(Session, "before_flush")
def _record_audit(session: Session, flush_context, instances) -> None:
    user_id = current_user_id.get()
    if user_id is None:
        return

    from app.models.audit import AuditLog

    entries: list[AuditLog] = []

    for obj in session.new:
        if isinstance(obj, AuditLog):
            continue
        entries.append(AuditLog(
            user_id=user_id, action="create", entity_type=obj.__tablename__,
            entity_id=_ensure_pk(obj), label=_label(obj), details={"values": _snapshot(obj)},
        ))

    for obj in session.dirty:
        if isinstance(obj, AuditLog) or not session.is_modified(obj, include_collections=False):
            continue
        changes = _changes(obj)
        if not changes:
            continue
        entries.append(AuditLog(
            user_id=user_id, action="update", entity_type=obj.__tablename__,
            entity_id=_ensure_pk(obj), label=_label(obj), details={"changes": changes},
        ))

    for obj in session.deleted:
        if isinstance(obj, AuditLog):
            continue
        entries.append(AuditLog(
            user_id=user_id, action="delete", entity_type=obj.__tablename__,
            entity_id=_ensure_pk(obj), label=_label(obj), details={"values": _snapshot(obj)},
        ))

    session.add_all(entries)
