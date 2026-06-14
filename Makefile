# ============================================================
# Makefile — TMS Sistema de Gestión de Transporte
# ============================================================

.PHONY: help build up down restart logs shell migrate seed test lint clean

COMPOSE=docker compose
BACKEND=$(COMPOSE) exec backend
MANAGE=$(BACKEND) python manage.py

help:
	@echo ""
	@echo "  TMS — Comandos disponibles"
	@echo "  ──────────────────────────────────────────"
	@echo "  make build      Construir imágenes Docker"
	@echo "  make up         Levantar todos los servicios"
	@echo "  make down       Detener servicios"
	@echo "  make restart    Reiniciar backend"
	@echo "  make logs       Ver logs en tiempo real"
	@echo "  make shell      Shell Django interactivo"
	@echo "  make migrate    Ejecutar migraciones"
	@echo "  make seed       Cargar datos de prueba"
	@echo "  make test       Ejecutar tests"
	@echo "  make lint       Verificar código"
	@echo "  make clean      Limpiar volúmenes (¡cuidado!)"
	@echo ""

build:
	$(COMPOSE) build --no-cache

up:
	@cp -n .env.example .env 2>/dev/null || true
	$(COMPOSE) up -d
	@echo "✅ Sistema levantado."
	@echo "   App:     http://localhost"
	@echo "   API:     http://localhost/api/v1/"
	@echo "   Swagger: http://localhost/api/docs/"
	@echo "   Grafana: http://localhost/grafana/"

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart backend celery_worker celery_beat

logs:
	$(COMPOSE) logs -f --tail=100

shell:
	$(MANAGE) shell_plus 2>/dev/null || $(MANAGE) shell

migrate:
	$(MANAGE) makemigrations
	$(MANAGE) migrate

seed:
	$(BACKEND) python scripts/seed_data.py

superuser:
	$(MANAGE) createsuperuser

test:
	$(BACKEND) pytest tests/ -v --cov=tms_project --cov-report=term-missing

lint:
	$(BACKEND) python -m flake8 tms_project/ --max-line-length=100 --exclude=migrations

clean:
	@echo "⚠️  Esto eliminará todos los datos. ¿Continuar? [y/N]" && read ans && [ $${ans:-N} = y ]
	$(COMPOSE) down -v
	docker system prune -f

# Comandos de base de datos
db-backup:
	$(COMPOSE) exec db pg_dump -U $$POSTGRES_USER $$POSTGRES_DB > backup_$(shell date +%Y%m%d_%H%M%S).sql

db-restore:
	@echo "Uso: make db-restore FILE=backup.sql"
	$(COMPOSE) exec -T db psql -U $$POSTGRES_USER $$POSTGRES_DB < $(FILE)

# Actualizar dependencias
update-deps:
	$(BACKEND) pip install --upgrade pip
	$(BACKEND) pip install -r requirements.txt --upgrade
