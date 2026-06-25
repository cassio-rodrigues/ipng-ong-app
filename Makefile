.PHONY: up down migrate seed logs shell reset

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
