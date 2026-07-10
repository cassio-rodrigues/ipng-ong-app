"""add structured form fields to student_highlights

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

NEW_COLS = [
    "student_occupation", "reason_primary", "reason_secondary",
    "level_assessment", "participation_spontaneous", "class_focus",
    "interest_beyond_class", "speaks_despite_errors", "curiosity_level",
    "homework_rate", "english_outside_contact", "english_outside_channels",
    "self_confidence", "previously_highlighted", "teacher_overall_perception",
]


def upgrade() -> None:
    for col in NEW_COLS:
        op.add_column("student_highlights", sa.Column(col, sa.String(), nullable=True))


def downgrade() -> None:
    for col in reversed(NEW_COLS):
        op.drop_column("student_highlights", col)
