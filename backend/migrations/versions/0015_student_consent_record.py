"""students: registro do consentimento (data, versão do termo, quem consentiu)

Revision ID: 0015
Revises: 0014
Create Date: 2026-10-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("students", sa.Column("terms_version", sa.String(20), nullable=True))
    op.add_column("students", sa.Column("consent_given_by", sa.String(), nullable=True))
    op.add_column("students", sa.Column("image_consent_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("students", "image_consent_at")
    op.drop_column("students", "consent_given_by")
    op.drop_column("students", "terms_version")
    op.drop_column("students", "terms_accepted_at")
