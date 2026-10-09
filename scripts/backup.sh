#!/usr/bin/env bash
# Backup criptografado do banco de produção (LGPD art. 46: segurança dos dados).
#
#   ./scripts/backup.sh            → gera backups/ipng_AAAA-MM-DD_HHMM.sql.gz.enc
#   ./scripts/backup.sh restore <arquivo>   → mostra o comando para restaurar
#
# Requer BACKUP_PASSPHRASE no .env. Sem ela, o arquivo não é gerado: um dump aberto com
# CPF e endereço de menores não pode ficar largado no disco.
# Guarda os BACKUP_KEEP mais recentes (padrão 14). Copie a pasta backups/ para fora da VPS.
#
# Agendamento diário às 3h (crontab -e na VPS):
#   0 3 * * * cd /root/ipng-ong-app && ./scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; source .env; set +a
: "${BACKUP_PASSPHRASE:?Defina BACKUP_PASSPHRASE no .env (ex.: openssl rand -base64 32)}"
KEEP="${BACKUP_KEEP:-14}"
COMPOSE="${COMPOSE:-docker compose -f docker-compose.prod.yml}"

if [[ "${1:-}" == "restore" ]]; then
  file="${2:?Uso: ./scripts/backup.sh restore backups/arquivo.sql.gz.enc}"
  echo "Para restaurar (APAGA os dados atuais do banco), rode:"
  echo "  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in $file \\"
  echo "    | gunzip | $COMPOSE exec -T db psql -U \$POSTGRES_USER -d \$POSTGRES_DB"
  exit 0
fi

mkdir -p backups
chmod 700 backups
out="backups/ipng_$(date +%Y-%m-%d_%H%M).sql.gz.enc"

$COMPOSE exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_PASSPHRASE -out "$out"
chmod 600 "$out"
echo "$(date '+%F %T') backup gerado: $out ($(du -h "$out" | cut -f1))"

# Mantém só os mais recentes
ls -1t backups/ipng_*.sql.gz.enc | tail -n +"$((KEEP + 1))" | xargs -r rm --
