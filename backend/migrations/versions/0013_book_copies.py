"""books.copies: número de exemplares para controle de empréstimos

NULL = estoque não controlado (comportamento anterior).

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-08
"""
from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("books", sa.Column("copies", sa.Integer(), nullable=True))
    op.create_check_constraint("ck_books_copies_non_negative", "books", "copies IS NULL OR copies >= 0")


def downgrade() -> None:
    op.drop_constraint("ck_books_copies_non_negative", "books", type_="check")
    op.drop_column("books", "copies")
