"""add attendance.homework_done

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("attendance", sa.Column("homework_done", sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column("attendance", "homework_done")
