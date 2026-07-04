"""add book_loans table

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-04
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "book_loans",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("book_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("books.id"), nullable=False),
        sa.Column("borrowed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("returned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_book_loans_student_id", "book_loans", ["student_id"])
    op.create_index("ix_book_loans_book_id", "book_loans", ["book_id"])
    op.create_index("ix_book_loans_status", "book_loans", ["status"])


def downgrade() -> None:
    op.drop_index("ix_book_loans_status", table_name="book_loans")
    op.drop_index("ix_book_loans_book_id", table_name="book_loans")
    op.drop_index("ix_book_loans_student_id", table_name="book_loans")
    op.drop_table("book_loans")
