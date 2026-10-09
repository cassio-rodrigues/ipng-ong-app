"""audit_logs: mascara documentos, contato e nascimento já gravados nos detalhes

A partir de agora o listener de auditoria não grava esses valores; esta migração
limpa os registros antigos. Irreversível por natureza (os valores são descartados).

Revision ID: 0014
Revises: 0013
Create Date: 2026-10-09
"""
from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None

FIELDS = (
    "password_hash", "cpf", "rg", "guardian_cpf", "guardian_rg", "address",
    "email", "phone", "telefone", "birth_date", "guardian_name", "consent_given_by",
)


def upgrade() -> None:
    for f in FIELDS:
        # Criação/exclusão: {"values": {campo: valor}}
        op.execute(f"""
            UPDATE audit_logs SET details = jsonb_set(details, '{{values,{f}}}', '"***"')
            WHERE details -> 'values' ? '{f}' AND details -> 'values' ->> '{f}' IS NOT NULL
        """)
        # Edição: {"changes": {campo: [antes, depois]}}
        op.execute(f"""
            UPDATE audit_logs SET details = jsonb_set(details, '{{changes,{f}}}', '["***", "***"]')
            WHERE details -> 'changes' ? '{f}'
        """)


def downgrade() -> None:
    pass
