#!/bin/bash
# Inicialização do SSL — execute UMA VEZ no primeiro deploy.
# Uso: ./init-ssl.sh seudominio.com seu@email.com
set -e

DOMAIN=${1:?'Uso: ./init-ssl.sh <dominio> <email>'}
EMAIL=${2:?'Uso: ./init-ssl.sh <dominio> <email>'}

CERT_PATH="./certbot/conf/live/$DOMAIN"

echo "==> Domínio: $DOMAIN"
echo "==> Email:   $EMAIL"

# 1. Baixa parâmetros TLS recomendados pelo Certbot
echo "==> Baixando parâmetros TLS..."
mkdir -p ./certbot/conf
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    -o ./certbot/conf/options-ssl-nginx.conf
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/_internal/cli/cli-defaults.py | grep -o 'ssl_dhparams.*' || true
openssl dhparam -out ./certbot/conf/ssl-dhparams.pem 2048 2>/dev/null

# 2. Cria certificado autoassinado temporário para o Nginx conseguir subir
echo "==> Criando certificado temporário..."
mkdir -p "$CERT_PATH"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$CERT_PATH/privkey.pem" \
    -out "$CERT_PATH/fullchain.pem" \
    -subj "/CN=localhost" 2>/dev/null

# 3. Sobe apenas o Nginx (sem certbot ainda)
echo "==> Subindo Nginx..."
DOMAIN=$DOMAIN docker compose -f docker-compose.prod.yml up -d nginx

sleep 3

# 4. Obtém o certificado real via Certbot (validação HTTP-01 pelo Nginx)
echo "==> Obtendo certificado Let's Encrypt..."
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    -d "api.$DOMAIN"

# 5. Recarrega o Nginx com o certificado real
echo "==> Recarregando Nginx com certificado real..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo ""
echo "✓ SSL configurado com sucesso para $DOMAIN"
echo "  Suba os demais serviços com:"
echo "  docker compose -f docker-compose.prod.yml up -d"
