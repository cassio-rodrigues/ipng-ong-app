"""add extra fields to students

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("address", sa.String(), nullable=True))
    op.add_column("students", sa.Column("rg", sa.String(), nullable=True))
    op.add_column("students", sa.Column("cpf", sa.String(), nullable=True))
    op.add_column("students", sa.Column("education_level", sa.String(), nullable=True))
    op.add_column("students", sa.Column("guardian_name", sa.String(), nullable=True))
    op.add_column("students", sa.Column("guardian_rg", sa.String(), nullable=True))
    op.add_column("students", sa.Column("guardian_cpf", sa.String(), nullable=True))
    op.add_column("students", sa.Column("terms_accepted", sa.Boolean(), nullable=True, server_default="false"))
    op.add_column("students", sa.Column("image_consent", sa.Boolean(), nullable=True, server_default="false"))


def downgrade() -> None:
    op.drop_column("students", "image_consent")
    op.drop_column("students", "terms_accepted")
    op.drop_column("students", "guardian_cpf")
    op.drop_column("students", "guardian_rg")
    op.drop_column("students", "guardian_name")
    op.drop_column("students", "education_level")
    op.drop_column("students", "cpf")
    op.drop_column("students", "rg")
    op.drop_column("students", "address")
