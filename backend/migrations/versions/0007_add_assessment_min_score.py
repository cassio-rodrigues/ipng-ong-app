"""add assessment min_score

Revision ID: 0007
Revises: 0006
Create Date: 2026-08-03
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("assessments", sa.Column("min_score", sa.Numeric(5, 2), nullable=True, server_default="4"))


def downgrade() -> None:
    op.drop_column("assessments", "min_score")
