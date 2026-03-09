# 🐳 Docker Quick Reference - Codexa Server

## 🚀 Quick Start

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start all services (Development with hot-reload)
docker-compose up -d

# View logs
docker-compose logs -f
```

## 📋 Common Commands

### Starting & Stopping

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start all services in background (dev mode with hot-reload) |
| `docker-compose -f docker-compose.prod.yml up -d` | Start in production mode |
| `docker-compose down` | Stop all services |
| `docker-compose restart` | Restart all services |
| `docker-compose restart auth-service` | Restart specific service |

### Logs & Monitoring

| Command | Description |
|---------|-------------|
| `docker-compose logs -f` | Follow all logs |
| `docker-compose logs -f auth-service` | Follow auth service logs |
| `docker-compose logs --tail=100` | Last 100 lines of all logs |
| `docker-compose ps` | List running containers |
| `docker stats` | Live resource usage stats |

### Building & Rebuilding

| Command | Description |
|---------|-------------|
| `docker-compose build` | Build all images |
| `docker-compose build auth-service` | Build specific service |
| `docker-compose up -d --build` | Rebuild and restart |
| `docker-compose build --no-cache` | Build without cache |

### Database Operations

| Command | Description |
|---------|-------------|
| `docker-compose exec auth-service npx prisma migrate deploy` | Run migrations |
| `docker-compose exec -w /app/db-service auth-service npx prisma generate` | Generate Prisma client |
| `docker-compose exec -w /app/db-service auth-service npx prisma studio` | Open Prisma Studio |
| `docker-compose exec postgres psql -U user -d codexa` | Access PostgreSQL shell |

### Service Shell Access

| Command | Description |
|---------|-------------|
| `docker-compose exec auth-service sh` | Access auth service shell |
| `docker-compose exec utils-service sh` | Access utils service shell |
| `docker-compose exec code-service sh` | Access code service shell |

### Cleanup Commands

| Command | Description |
|---------|-------------|
| `docker-compose down` | Stop and remove containers |
| `docker-compose down -v` | ⚠️  Stop and remove volumes (deletes data!) |
| `docker system prune` | Remove unused containers, networks, images |
| `docker system prune -a` | Remove all unused Docker resources |
| `docker volume prune` | Remove unused volumes |

## 🔍 Debugging Tips

### Check Service Health
```bash
# Check if services are running
docker-compose ps

# Check health status
docker inspect codexa-postgres --format='{{.State.Health.Status}}'
docker inspect codexa-redis --format='{{.State.Health.Status}}'
docker inspect codexa-kafka --format='{{.State.Health.Status}}'
```

### View Resource Usage
```bash
# CPU, Memory, Network usage
docker stats

# Specific container
docker stats codexa-auth-service
```

### Debug Container
```bash
# Run service interactively (not in background)
docker-compose run --rm auth-service

# View service configuration
docker-compose config

# Inspect a container
docker inspect codexa-auth-service
```

### Fix Common Issues

#### Services won't start
```bash
# Check logs for errors
docker-compose logs

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Database connection errors
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Restart database
docker-compose restart postgres

# Check DATABASE_URL
cat .env | grep DATABASE_URL
```

#### Hot reload not working
```bash
# Ensure volumes are mounted
docker-compose down
docker-compose up -d

# Check container logs
docker-compose logs auth-service | grep -i "nodemon\|tsx"
```

#### Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "3001:3000"  # Maps host 3001 to container 3000
```

## 🎯 Development Workflow

### Making Code Changes
1. Edit your code in the service directory
2. Changes are automatically detected (hot-reload)
3. Service restarts within 1-2 seconds
4. Check logs: `docker-compose logs -f <service-name>`

### Adding Dependencies
```bash
# Install in container
docker-compose exec auth-service npm install <package>

# Or rebuild the service
docker-compose build auth-service
docker-compose up -d auth-service
```

### Running Tests
```bash
# Run tests in a service
docker-compose exec auth-service npm test

# Run specific test file
docker-compose exec auth-service npm test -- auth.test.ts
```

## 📊 Service URLs (Default)

| Service | URL |
|---------|-----|
| Auth Service | http://localhost:3000 |
| Utils Service | http://localhost:3001 |
| Problem Service | http://localhost:3002 |
| Classroom Service | http://localhost:3003 |
| Code Service | http://localhost:3004 |
| Analytics Service | http://localhost:3005 |
| AI Service | http://localhost:3006 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| Kafka | localhost:9092 |
| Prisma Studio | http://localhost:5555 |

## 🔧 Makefile Shortcuts

If you have `make` installed:

```bash
make up          # Start development services
make down        # Stop services
make logs        # View logs
make logs-f      # Follow logs
make rebuild     # Rebuild and restart
make clean       # Clean up containers
make status      # Show service status
make help        # Show all commands
```

## 📱 Using the Interactive Script

```bash
# Make executable (first time only)
chmod +x start.sh

# Run interactive menu
./start.sh

# Or use directly
./start.sh start        # Start development
./start.sh start-prod   # Start production
./start.sh stop         # Stop services
./start.sh logs         # View logs
./start.sh status       # Show status
```

## 🎓 Learning Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

## 💡 Pro Tips

1. **Use `make` commands** for convenience
2. **Keep volumes mounted** in development for hot-reload
3. **Use production mode** for deployment/testing performance
4. **Monitor logs regularly** to catch issues early
5. **Run `docker system prune`** periodically to free up space
6. **Use health checks** to ensure service dependencies are ready
7. **Keep `.env` updated** with latest configuration

For more detailed documentation, see [DOCKER.md](./DOCKER.md)
