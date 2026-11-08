"""book_loans.student_id: ON DELETE CASCADE

Sem isso, excluir um aluno que já pegou livro emprestado falhava com violação de FK (500).
Empréstimos em aberto são barrados antes, na rota de exclusão.

Revision ID: 0017
Revises: 0016
Create Date: 2026-11-08
"""
from alembic import op

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("book_loans_student_id_fkey", "book_loans", type_="foreignkey")
    op.create_foreign_key(
        "book_loans_student_id_fkey", "book_loans", "students",
        ["student_id"], ["id"], ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("book_loans_student_id_fkey", "book_loans", type_="foreignkey")
    op.create_foreign_key("book_loans_student_id_fkey", "book_loans", "students", ["student_id"], ["id"])
