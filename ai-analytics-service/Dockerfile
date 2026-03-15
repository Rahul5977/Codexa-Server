# ==========================================
# STAGE 1: Base Image
# ==========================================
FROM node:20-alpine AS base

WORKDIR /app

# Copy Root Configs
COPY package.json package-lock.json ./

# Copy the Shared Library (db-service)
COPY db-service ./db-service

# Copy the Service
COPY ai-analytics-service ./ai-analytics-service

# Install Dependencies
RUN npm ci

# Generate Prisma Client
WORKDIR /app/db-service
ENV DATABASE_URL="postgresql://user:password@postgres:5432/codexa?schema=public"
RUN npx prisma generate

# ==========================================
# STAGE 2: Development Image (Hot Reload)
# ==========================================
FROM node:20-alpine AS development

WORKDIR /app

# Copy node_modules from base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json

# Copy db-service (for Prisma client)
COPY --from=base /app/db-service ./db-service

# The source code will be mounted as a volume
# Install tsx globally for hot reload
RUN npm install -g tsx

WORKDIR /app/ai-analytics-service

# Development command with hot reload (tsx watch)
CMD ["npm", "run", "dev"]

# ==========================================
# STAGE 3: Builder (Production Build)
# ==========================================
FROM base AS builder

# Build the Service
WORKDIR /app/db-service
RUN npm run build

WORKDIR /app/ai-analytics-service
RUN npm run build

# ==========================================
# STAGE 4: Production Image
# ==========================================
FROM node:20-alpine AS production

WORKDIR /app

# Copy necessary runtime files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy the built DB Library
COPY --from=builder /app/db-service/dist ./db-service/dist
COPY --from=builder /app/db-service/package.json ./db-service/package.json
COPY --from=builder /app/db-service/prisma ./db-service/prisma

# Copy the built Service
COPY --from=builder /app/ai-analytics-service/dist ./ai-analytics-service/dist
COPY --from=builder /app/ai-analytics-service/package.json ./ai-analytics-service/package.json
COPY --from=builder /app/ai-analytics-service/node_modules ./ai-analytics-service/node_modules

WORKDIR /app/ai-analytics-service

CMD ["npm", "start"]