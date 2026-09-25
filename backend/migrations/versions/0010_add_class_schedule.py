"""add class weekly schedule

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("classes", sa.Column("schedule_weekday", sa.SmallInteger(), nullable=True))
    op.add_column("classes", sa.Column("schedule_start", sa.Time(), nullable=True))
    op.add_column("classes", sa.Column("schedule_end", sa.Time(), nullable=True))


def downgrade() -> None:
    op.drop_column("classes", "schedule_end")
    op.drop_column("classes", "schedule_start")
    op.drop_column("classes", "schedule_weekday")
