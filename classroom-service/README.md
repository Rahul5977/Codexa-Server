# Classroom Service

A microservice for managing classrooms, courses, and student enrollments in the Codexa platform. This service allows teachers to create classrooms and students to join them using unique codes.

## Features

- **Create Classroom**: Teachers can create new classrooms with auto-generated unique codes
- **Join Classroom**: Students can join classrooms using 6-character codes
- **Role Management**: Automatically updates user roles to TEACHER/STUDENT
- **Email Notifications**: Sends classroom codes via email (via Kafka)
- **Student Management**: View all enrolled students in a classroom
- **Classroom CRUD**: Full classroom management (create, read, update, delete)

## API Endpoints

### Authentication Required

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Endpoints

#### Create Classroom

```
POST /api/classroom/create
```

**Access**: Teachers only
**Body**:

```json
{
  "name": "Advanced JavaScript",
  "description": "Learn advanced JS concepts",
  "imageUrl": "https://example.com/image.jpg" // optional
}
```

#### Join Classroom

```
POST /api/classroom/join
```

**Access**: Students only
**Body**:

```json
{
  "code": "ABC123"
}
```

#### Get My Classrooms

```
GET /api/classroom/my-classrooms
```

**Access**: All authenticated users
**Returns**: Both teaching and enrolled classrooms

#### Get Enrolled Students

```
GET /api/classroom/:classroomId/students
```

**Access**: Teacher of the classroom
**Returns**: List of enrolled students with stats

#### Update Classroom

```
PUT /api/classroom/:classroomId
```

**Access**: Teacher of the classroom
**Body**: Same as create (all fields optional)

#### Delete Classroom

```
DELETE /api/classroom/:classroomId
```

**Access**: Teacher of the classroom

## Setup Instructions

### 1. Environment Variables

Create a `.env` file based on `.env.example`:

```env
NODE_ENV=development
PORT=3003

# JWT (should match auth-service)
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Database (should match db-service)
DATABASE_URL=postgresql://username:password@localhost:5432/codexa-db

# Kafka (for email notifications)
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=classroom-service
```

### 2. Database Migration

Before running the service, apply the database migration:

```bash
cd ../db-service
npx prisma migrate dev --name add_classroom_models
```

This adds the following models:

- `Classroom`: Stores classroom information and codes
- `ClassroomEnrollment`: Junction table for student enrollments

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Service

**Development**:

```bash
npm run dev
```

**Production**:

```bash
npm run build
npm start
```

## Database Models

### Classroom

- `id`: Unique identifier
- `name`: Classroom name
- `code`: 6-character unique join code (auto-generated)
- `teacherId`: Reference to User (teacher)
- `description`: Optional description
- `imageUrl`: Optional classroom image
- `createdAt`, `updatedAt`: Timestamps

### ClassroomEnrollment

- `id`: Unique identifier
- `classroomId`: Reference to Classroom
- `studentId`: Reference to User (student)
- `joinedAt`: Enrollment timestamp
- Unique constraint on (classroomId, studentId)

## Dependencies

The classroom service depends on:

1. **db-service**: For database access via `@codexa/db` package
2. **auth-service**: For JWT token validation (shares JWT secrets)
3. **utils-service**: For email notifications via Kafka

## Email Notifications

The service sends email notifications for:

- **Classroom Creation**: Sends code to teacher
- **Classroom Joining**: Confirmation to student

Emails are sent via Kafka to the `notifications` topic, processed by utils-service.

## Role Management

- Creating a classroom automatically sets user role to `TEACHER`
- Joining a classroom automatically sets user role to `STUDENT`
- `ADMIN` users can access any classroom functionality

## Security

- JWT token validation on all endpoints
- Role-based access control (RBAC)
- Teachers can only manage their own classrooms
- Students can only join classrooms (not create/manage)
- Unique classroom codes prevent unauthorized access

## Docker

Build and run with Docker:

```bash
docker build -t classroom-service .
docker run -p 3003:3003 --env-file .env classroom-service
```

## Health Check

```
GET /health
```

Returns service status and uptime information.
