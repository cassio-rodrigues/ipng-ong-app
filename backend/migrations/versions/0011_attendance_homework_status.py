"""attendance: homework_done (bool) → homework_status (done / not_done / na)

Permite registrar "não se aplica" separado de "não verificado" (NULL).

Revision ID: 0011
Revises: 0010
Create Date: 2026-09-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("attendance", sa.Column("homework_status", sa.String(10), nullable=True))
    op.execute("""
        UPDATE attendance SET homework_status = CASE homework_done WHEN true THEN 'done' WHEN false THEN 'not_done' END
        WHERE homework_done IS NOT NULL
    """)
    op.create_check_constraint(
        "ck_attendance_homework_status", "attendance", "homework_status IN ('done', 'not_done', 'na')"
    )
    op.drop_column("attendance", "homework_done")


def downgrade() -> None:
    op.add_column("attendance", sa.Column("homework_done", sa.Boolean(), nullable=True))
    # 'na' não tem equivalente booleano e volta como NULL
    op.execute("""
        UPDATE attendance SET homework_done = CASE homework_status WHEN 'done' THEN true WHEN 'not_done' THEN false END
        WHERE homework_status IN ('done', 'not_done')
    """)
    op.drop_constraint("ck_attendance_homework_status", "attendance", type_="check")
    op.drop_column("attendance", "homework_status")
