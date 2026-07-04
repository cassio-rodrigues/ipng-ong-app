.PHONY: up down migrate seed logs shell reset prod-up prod-down prod-logs prod-migrate prod-deploy ssl-init

# ── Desenvolvimento ────────────────────────────────────────────────────────────

up:
	docker compose up -d

down:
	docker compose down

migrate:
	docker compose exec backend alembic upgrade head

seed:
	docker compose exec backend python seed.py

logs:
	docker compose logs -f backend

shell:
	docker compose exec backend bash

# Desfaz todas as migrations (cuidado: apaga dados)
reset:
	docker compose exec backend alembic downgrade base
	docker compose exec backend alembic upgrade head
	docker compose exec backend python seed.py

# ── Produção ───────────────────────────────────────────────────────────────────

prod-up:
	docker compose -f docker-compose.prod.yml up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f

prod-migrate:
	docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

prod-deploy:
	git pull
	docker compose -f docker-compose.prod.yml build --no-cache frontend backend
	docker compose -f docker-compose.prod.yml up -d

# Primeira configuração do SSL. Uso: make ssl-init DOMAIN=seudominio.com EMAIL=seu@email.com
ssl-init:
	@test -n "$(DOMAIN)" || (echo "Erro: DOMAIN não definido. Use: make ssl-init DOMAIN=seudominio.com EMAIL=seu@email.com" && exit 1)
	@test -n "$(EMAIL)" || (echo "Erro: EMAIL não definido. Use: make ssl-init DOMAIN=seudominio.com EMAIL=seu@email.com" && exit 1)
	./init-ssl.sh $(DOMAIN) $(EMAIL)
