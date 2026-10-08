"""audit_logs: label + details (JSONB) e índices para consulta

A auditoria passa a ser gravada automaticamente (app/core/audit.py).

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("audit_logs", sa.Column("label", sa.String(), nullable=True))
    op.add_column("audit_logs", sa.Column("details", postgresql.JSONB(), nullable=True))
    op.create_index("ix_audit_logs_entity", "audit_logs", ["entity_type", "entity_id"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity", table_name="audit_logs")
    op.drop_column("audit_logs", "details")
    op.drop_column("audit_logs", "label")
