# Codexa Server - Competitive Programming Platform

Codexa is a comprehensive microservices-based competitive programming platform built with modern technologies. The platform provides code execution, problem management, user authentication, analytics, and AI-powered features.

## 🏗️ Architecture

This project follows a **microservices architecture** with the following services:

### Services Overview

| Service | Port | Description |
|---------|------|-------------|
| **Auth Service** | 3000 | User authentication, authorization, JWT token management, and user profile management |
| **Utils Service** | 3001 | Email notifications via Kafka consumer, file upload handling with Cloudinary integration |
| **Problem Service** | 3002 | CRUD operations for coding problems, test cases, and problem metadata |
| **Code Service** | - | Code execution engine with Judge0 integration, submission processing with BullMQ queues |
| **AI Service** | - | AI-powered features using Google Generative AI for hints and explanations |
| **Analytics Service** | - | User performance analytics, problem statistics, and rivalry tracking engine |
| **DB Service** | - | Shared database package with Prisma ORM for all services |

## 🛠️ Technology Stack

### Core Technologies
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **ORM**: Prisma (v7.3.0)
- **Message Queue**: Apache Kafka (v3.7.0)
- **Task Queue**: BullMQ with Redis (for code execution)
- **Authentication**: JWT with refresh tokens, Argon2 for password hashing
- **AI Integration**: Google Generative AI
- **File Storage**: Cloudinary
- **Email**: Nodemailer with SMTP
- **Containerization**: Docker & Docker Compose

### Key Dependencies
- **Express**: v5.2.1
- **Prisma**: v7.3.0
- **Kafka**: kafkajs v2.2.4
- **BullMQ**: v5.67.2
- **TypeScript**: v5.9.3
- **Zod**: v4.3.5+ (validation)

## 📊 Database Schema

The platform uses PostgreSQL with the following main entities:

- **User**: User accounts with roles (USER, STUDENT, TEACHER, ADMIN), profiles, and statistics
- **Problem**: Coding problems with difficulty levels, test cases, tags, and constraints
- **Submission**: Code submissions with execution results and performance metrics
- **UserAnalytics**: Comprehensive user statistics including streaks, topic strengths, and activity logs
- **TopicAttempt**: Per-topic performance tracking for radar charts
- **ProblemAnalytics**: Global problem statistics and language-specific performance data

### Enums
- **Role**: USER, STUDENT, TEACHER, ADMIN
- **Difficulty**: EASY, MEDIUM, HARD
- **SubmissionStatus**: PENDING, PROCESSING, ACCEPTED, WRONG_ANSWER, ERROR, TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED, COMPILATION_ERROR
- **AccountStatus**: ACTIVE, INACTIVE, SUSPENDED, DELETED

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Docker & Docker Compose
- PostgreSQL 15
- Redis (for BullMQ)
- Apache Kafka

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rahul5977/Codexa-Server.git
   cd Codexa-Server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Each service has an `.env.example` file. Copy and configure them:
   ```bash
   # For each service
   cp auth-service/.env.example auth-service/.env
   cp utils-service/.env.example utils-service/.env
   cp problem-service/.env.example problem-service/.env
   # Configure the .env files with your values
   ```

4. **Set up the database**
   ```bash
   cd db-service
   npm run db:push
   npm run generate
   ```

5. **Start infrastructure services**
   ```bash
   # Start PostgreSQL and Kafka services defined in docker-compose.yml
   docker-compose up postgres kafka -d
   ```

6. **Run development servers**
   ```bash
   # Using npm workspaces
   npm run dev
   
   # Or run individual services
   npm start --workspace=auth-service
   npm start --workspace=problem-service
   npm start --workspace=utils-service
   ```

### Docker Deployment (Recommended)

The easiest way to get started is using Docker! All services are containerized with hot-reload support for development.

#### Quick Start with Docker

**Option 1: Interactive Script**
```bash
./start.sh
```

**Option 2: Docker Compose**
```bash
# Development mode (with hot-reload)
docker-compose up -d

# Production mode
docker-compose -f docker-compose.prod.yml up -d
```

**Option 3: Makefile Commands**
```bash
make up      # Start development services
make logs    # View logs
make down    # Stop services
make help    # See all available commands
```

📚 **For detailed Docker documentation, see [DOCKER.md](./DOCKER.md)**

#### Manual Setup

To run the entire stack with Docker:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- Kafka message broker
- Auth Service (port 3000)
- Utils Service (port 3001)
- Problem Service (port 3002)
- Classroom Service (port 3003)
- Code Service (port 3004)
- Analytics Service (port 3005)
- AI Service (port 3006)

## 📝 Service Details

### Auth Service
- User registration and login
- JWT-based authentication (access + refresh tokens)
- Password hashing with Argon2
- User profile management with image uploads
- Email verification workflow
- Kafka integration for async operations

### Utils Service
- Email notification consumer (Kafka)
- SMTP email sending with Nodemailer
- File upload handling
- Cloudinary integration for image storage
- CORS configuration

### Problem Service
- Problem CRUD operations
- Test case management
- Problem filtering and search
- Tags and company associations
- Difficulty-based categorization

### Code Service
- Code submission processing
- Judge0 integration for code execution
- BullMQ queue management
- Multi-language support
- Execution time and memory tracking

### AI Service
- Google Generative AI integration
- AI-powered hints generation
- Code explanation and suggestions
- Problem-solving guidance

### Analytics Service
- User performance tracking
- Streak calculation
- Topic-wise strength analysis
- Activity heatmaps
- Rivalry engine
- Problem statistics aggregation

### DB Service
- Centralized Prisma schema
- Database migrations
- Shared across all services
- Type-safe database access

## 🔧 Development Workflow

### Workspace Structure
This project uses **npm workspaces** for monorepo management:

```
Codexa-Server/
├── auth-service/          # Authentication & authorization service
├── utils-service/         # Email & file upload utilities
├── problem-service/       # Problem management service
├── code-service/          # Code execution service
├── ai-service/            # AI-powered features service
├── analytics-service/     # Analytics & tracking service
├── db-service/            # Shared database package
├── docker-compose.yml     # Docker orchestration
└── package.json           # Root workspace config
```

### Scripts
- `npm run dev` - Start auth and code services concurrently
- `npm start --workspace=<service-name>` - Start a specific service
- `npm run build --workspace=<service-name>` - Build a specific service

### Database Management
```bash
cd db-service
npm run db:push      # Push schema changes
npm run db:studio    # Open Prisma Studio
npm run generate     # Generate Prisma Client
```

## 🔒 Environment Variables

Key environment variables needed:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `KAFKA_BROKERS` - Kafka broker addresses
- `SMTP_*` - Email configuration
- `CLOUDINARY_*` - Cloudinary credentials
- `CORS_ORIGIN` - Allowed CORS origins

## 📦 Project Status

This is an active development project with the following completed features:

✅ Microservices architecture setup  
✅ User authentication and authorization  
✅ Problem management system  
✅ Database schema design  
✅ Kafka-based event system  
✅ Docker containerization  
✅ Code execution pipeline (BullMQ)  
✅ Analytics and tracking system  
✅ AI integration for hints  
✅ Email notification system  

## 🤝 Contributing

This is a learning project. Contributions are welcome!

## 📄 License

ISC
