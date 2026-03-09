# Codexa Server - Docker Setup

## 🚀 Quick Start

### Development Mode (with Hot Reload)

Start all services with hot-reload enabled:

```bash
docker-compose up -d
```

This will:
- Start all microservices in development mode
- Enable hot-reload (changes in source code will automatically restart the service)
- Mount source code as volumes for live editing
- Start supporting services (PostgreSQL, Redis, Kafka)

### Production Mode

Build and run optimized production containers:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📋 Prerequisites

1. **Docker** (v20.10+) and **Docker Compose** (v2.0+)
2. **Environment Variables**: Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## 🛠️ Services

The Codexa platform consists of these microservices:

| Service | Port | Description |
|---------|------|-------------|
| auth-service | 3000 | Authentication & Authorization |
| utils-service | 3001 | Email & File Upload |
| problem-service | 3002 | Problem Management |
| classroom-service | 3003 | Classroom & Assignment |
| code-service | 3004 | Code Execution |
| analytics-service | 3005 | Analytics & Metrics |
| ai-service | 3006 | AI-powered Features |
| postgres | 5432 | Database |
| redis | 6379 | Cache & Queues |
| kafka | 9092 | Message Broker |

## 📝 Common Commands

### Start Services
```bash
# Development mode (hot-reload enabled)
docker-compose up -d

# Production mode
docker-compose -f docker-compose.prod.yml up -d

# Start specific service
docker-compose up -d auth-service
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service

# Last 100 lines
docker-compose logs --tail=100 -f
```

### Stop Services
```bash
# Stop all
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Rebuild Services
```bash
# Rebuild all
docker-compose build

# Rebuild specific service
docker-compose build auth-service

# Rebuild and restart
docker-compose up -d --build
```

### Execute Commands in Container
```bash
# Run database migrations
docker-compose exec auth-service npm run db:migrate

# Access shell
docker-compose exec auth-service sh

# Run Prisma Studio
docker-compose exec auth-service npx prisma studio
```

### Database Operations
```bash
# Run migrations
docker-compose exec -w /app/db-service auth-service npx prisma migrate deploy

# Generate Prisma Client
docker-compose exec -w /app/db-service auth-service npx prisma generate

# Seed database
docker-compose exec auth-service node seed.js
```

## 🔧 Development Workflow

### Hot Reload
All services are configured with hot-reload in development mode:
- **TypeScript services**: Use `tsx` with `nodemon` or `tsx watch`
- **Changes**: Automatically detected when you edit files
- **Restart**: Services restart within 1-2 seconds

### Debugging
To debug a specific service:

1. Stop the service:
```bash
docker-compose stop auth-service
```

2. Run it interactively:
```bash
docker-compose run --rm -p 3000:3000 auth-service
```

### Adding Dependencies
```bash
# Install in container
docker-compose exec auth-service npm install <package-name>

# Or rebuild the service
docker-compose build auth-service
```

## 🌐 Environment Variables

Key environment variables (add to `.env`):

```env
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/codexa

# JWT Secrets
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# CORS
CORS_ORIGIN=http://localhost:3001

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@codexa.com

# Cloudinary (File Upload)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Judge0 (Code Execution)
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com

# Google AI
GOOGLE_API_KEY=your-google-api-key

# Build Target (development or production)
BUILD_TARGET=development
NODE_ENV=development
```

## 🐛 Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Check container status
docker-compose ps

# Restart all services
docker-compose restart
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check DATABASE_URL in .env
echo $DATABASE_URL

# Verify database is healthy
docker-compose exec postgres pg_isready -U user -d codexa
```

### Port conflicts
If a port is already in use, modify the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Maps host port 3001 to container port 3000
```

### Hot reload not working
```bash
# Ensure volumes are mounted correctly
docker-compose down
docker-compose up -d

# Check if nodemon/tsx is running
docker-compose logs auth-service
```

### Clean slate (reset everything)
```bash
# WARNING: This deletes all data
docker-compose down -v
docker system prune -a
docker-compose up -d
```

## 📦 Production Deployment

For production deployment:

1. Use `docker-compose.prod.yml`
2. Set `NODE_ENV=production` and `BUILD_TARGET=production` in `.env`
3. Use proper secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
4. Configure reverse proxy (nginx, Traefik)
5. Set up monitoring and logging

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Push to registry
docker-compose -f docker-compose.prod.yml push

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 🎯 Performance Tips

1. **Layer Caching**: Dockerfiles are optimized for layer caching
2. **Multi-stage Builds**: Separate build and runtime stages
3. **Volume Mounts**: Development uses volume mounts for hot-reload
4. **Health Checks**: Services wait for dependencies to be healthy
5. **Resource Limits**: Add resource limits in production

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma with Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)

## 📞 Support

For issues or questions, please contact the development team or create an issue in the repository.
