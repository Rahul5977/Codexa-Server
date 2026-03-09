.PHONY: help build up down restart logs clean rebuild migrate generate studio

# Default target
help:
	@echo "🚀 Codexa Server - Docker Commands"
	@echo ""
	@echo "Development Commands:"
	@echo "  make up          - Start all services in development mode (hot-reload)"
	@echo "  make down        - Stop all services"
	@echo "  make restart     - Restart all services"
	@echo "  make logs        - View logs from all services"
	@echo "  make logs-f      - Follow logs from all services"
	@echo "  make build       - Build all Docker images"
	@echo "  make rebuild     - Rebuild and restart all services"
	@echo ""
	@echo "Production Commands:"
	@echo "  make prod-up     - Start all services in production mode"
	@echo "  make prod-down   - Stop production services"
	@echo "  make prod-build  - Build production images"
	@echo ""
	@echo "Service-specific Commands:"
	@echo "  make auth        - View logs for auth-service"
	@echo "  make utils       - View logs for utils-service"
	@echo "  make problem     - View logs for problem-service"
	@echo "  make classroom   - View logs for classroom-service"
	@echo "  make code        - View logs for code-service"
	@echo "  make analytics   - View logs for analytics-service"
	@echo "  make ai          - View logs for ai-service"
	@echo ""
	@echo "Database Commands:"
	@echo "  make migrate     - Run database migrations"
	@echo "  make generate    - Generate Prisma client"
	@echo "  make studio      - Open Prisma Studio"
	@echo "  make db-seed     - Seed the database"
	@echo ""
	@echo "Cleanup Commands:"
	@echo "  make clean       - Stop and remove all containers, networks"
	@echo "  make clean-all   - Stop and remove containers, networks, volumes (⚠️  deletes data)"
	@echo "  make prune       - Remove unused Docker resources"
	@echo ""
	@echo "Status Commands:"
	@echo "  make ps          - List running containers"
	@echo "  make status      - Show service health status"

# Development commands
up:
	@echo "🚀 Starting Codexa services in development mode..."
	docker-compose up -d
	@echo "✅ Services started! Run 'make logs' to view logs"

down:
	@echo "🛑 Stopping all services..."
	docker-compose down
	@echo "✅ Services stopped"

restart:
	@echo "🔄 Restarting all services..."
	docker-compose restart
	@echo "✅ Services restarted"

build:
	@echo "🔨 Building Docker images..."
	docker-compose build
	@echo "✅ Build complete"

rebuild:
	@echo "🔨 Rebuilding and restarting services..."
	docker-compose up -d --build
	@echo "✅ Rebuild complete"

logs:
	docker-compose logs --tail=100

logs-f:
	docker-compose logs -f

# Production commands
prod-up:
	@echo "🚀 Starting Codexa services in production mode..."
	docker-compose -f docker-compose.prod.yml up -d
	@echo "✅ Production services started"

prod-down:
	@echo "🛑 Stopping production services..."
	docker-compose -f docker-compose.prod.yml down
	@echo "✅ Production services stopped"

prod-build:
	@echo "🔨 Building production Docker images..."
	docker-compose -f docker-compose.prod.yml build
	@echo "✅ Production build complete"

# Service-specific logs
auth:
	docker-compose logs -f auth-service

utils:
	docker-compose logs -f utils-service

problem:
	docker-compose logs -f problem-service

classroom:
	docker-compose logs -f classroom-service

code:
	docker-compose logs -f code-service

analytics:
	docker-compose logs -f analytics-service

ai:
	docker-compose logs -f ai-service

# Database commands
migrate:
	@echo "📊 Running database migrations..."
	docker-compose exec -w /app/db-service auth-service npx prisma migrate deploy
	@echo "✅ Migrations complete"

generate:
	@echo "🔧 Generating Prisma client..."
	docker-compose exec -w /app/db-service auth-service npx prisma generate
	@echo "✅ Prisma client generated"

studio:
	@echo "🎨 Opening Prisma Studio..."
	@echo "Access at: http://localhost:5555"
	docker-compose exec -w /app/db-service auth-service npx prisma studio

db-seed:
	@echo "🌱 Seeding database..."
	docker-compose exec auth-service node seed.js
	@echo "✅ Database seeded"

# Cleanup commands
clean:
	@echo "🧹 Cleaning up..."
	docker-compose down
	@echo "✅ Cleanup complete"

clean-all:
	@echo "⚠️  WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "✅ Full cleanup complete"; \
	else \
		echo "❌ Cleanup cancelled"; \
	fi

prune:
	@echo "🧹 Pruning unused Docker resources..."
	docker system prune -f
	@echo "✅ Prune complete"

# Status commands
ps:
	docker-compose ps

status:
	@echo "📊 Service Status:"
	@docker-compose ps
	@echo ""
	@echo "🔍 Health Checks:"
	@docker inspect codexa-postgres --format='Postgres: {{.State.Health.Status}}' 2>/dev/null || echo "Postgres: not running"
	@docker inspect codexa-redis --format='Redis: {{.State.Health.Status}}' 2>/dev/null || echo "Redis: not running"
	@docker inspect codexa-kafka --format='Kafka: {{.State.Health.Status}}' 2>/dev/null || echo "Kafka: not running"

# Shell access
shell-auth:
	docker-compose exec auth-service sh

shell-utils:
	docker-compose exec utils-service sh

shell-problem:
	docker-compose exec problem-service sh

shell-db:
	docker-compose exec postgres psql -U user -d codexa
