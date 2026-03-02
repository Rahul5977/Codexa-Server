# Classroom Service

A microservice for managing classrooms, courses, student enrollments, assignments, and exams in the Codexa platform. This service allows teachers to create classrooms, manage assignments/exams with problems, and students to submit collective solutions.

## Features

- **Create Classroom**: Teachers can create new classrooms with auto-generated unique codes
- **Join Classroom**: Students can join classrooms using 6-character codes
- **Role Management**: Automatically updates user roles to TEACHER/STUDENT
- **Email Notifications**: Sends classroom codes via email (via Kafka)
- **Student Management**: View all enrolled students in a classroom
- **Classroom CRUD**: Full classroom management (create, read, update, delete)
- **Problem Management**: Teachers can create new problems or use existing ones
- **Assignment System**: Create assignments with multiple problems and deadlines
- **Exam System**: Create exams with duration limits and deadlines
- **Collective Submissions**: Students submit solution packets for all problems
- **Submission Review**: Teachers can view all student submissions

## API Endpoints

### Authentication Required

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Classroom Management

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

### Problem Management

#### Create Problem

```
POST /api/classroom/problem
```

**Access**: Teachers only
**Body**:

```json
{
  "title": "Two Sum",
  "difficulty": "EASY",
  "statement": "Given an array of integers...",
  "examples": [
    {
      "input": "[2,7,11,15], target = 9",
      "output": "[0,1]",
      "explanation": "Because nums[0] + nums[1] == 9"
    }
  ],
  "constraints": ["2 <= nums.length <= 10^4"],
  "tags": ["Array", "Hash Table"],
  "hints": ["Use a hash map"],
  "companies": ["Amazon", "Google"],
  "testcases": [
    {
      "input": "[2,7,11,15]\n9",
      "output": "[0,1]"
    }
  ]
}
```

#### Get Problems

```
GET /api/classroom/problems
```

**Access**: Teachers only
**Query Params**: `page`, `limit`, `search`, `difficulty`, `tags`

### Assignment Management

#### Create Assignment

```
POST /api/classroom/:classroomId/assignment
```

**Access**: Teacher of the classroom
**Body**:

```json
{
  "title": "Weekly Assignment 1",
  "subtitle": "Arrays and Strings",
  "description": "Complete all problems by the deadline",
  "deadline": "2026-03-15T23:59:59Z",
  "problems": [
    {
      "problemId": "problem-uuid",
      "order": 1
    },
    {
      "problemId": "another-problem-uuid",
      "order": 2
    }
  ]
}
```

#### Get Classroom Assignments

```
GET /api/classroom/:classroomId/assignments
```

**Access**: Teacher or enrolled students

#### Get Assignment Details

```
GET /api/classroom/assignment/:assignmentId
```

**Access**: Teacher or enrolled students

#### Submit Assignment

```
POST /api/classroom/assignment/:assignmentId/submit
```

**Access**: Enrolled students only
**Body**:

```json
{
  "solutions": {
    "problem-uuid-1": {
      "code": "def solution(nums, target): ...",
      "language": "python"
    },
    "problem-uuid-2": {
      "code": "class Solution { public int[] twoSum... }",
      "language": "java"
    }
  }
}
```

#### Get Assignment Submissions

```
GET /api/classroom/assignment/:assignmentId/submissions
```

**Access**: Teacher of the classroom

### Exam Management

#### Create Exam

```
POST /api/classroom/:classroomId/exam
```

**Access**: Teacher of the classroom
**Body**:

```json
{
  "title": "Midterm Exam",
  "subtitle": "Data Structures",
  "description": "90 minute exam covering arrays, linked lists, and stacks",
  "deadline": "2026-03-15T23:59:59Z",
  "duration": 90,
  "problems": [
    {
      "problemId": "problem-uuid",
      "order": 1
    }
  ]
}
```

#### Get Classroom Exams

```
GET /api/classroom/:classroomId/exams
```

**Access**: Teacher or enrolled students

#### Get Exam Details

```
GET /api/classroom/exam/:examId
```

**Access**: Teacher or enrolled students

#### Submit Exam

```
POST /api/classroom/exam/:examId/submit
```

**Access**: Enrolled students only
**Body**: Same format as assignment submission

#### Get Exam Submissions

```
GET /api/classroom/exam/:examId/submissions
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
npx prisma migrate dev --name add_assignment_exam_models
```

This adds the following models:

- `Classroom`: Stores classroom information and codes
- `ClassroomEnrollment`: Junction table for student enrollments
- `Assignment`: Stores assignment details with deadlines
- `AssignmentProblem`: Junction table for assignment-problem relationships
- `AssignmentSubmission`: Student submissions for assignments
- `Exam`: Stores exam details with deadlines and duration
- `ExamProblem`: Junction table for exam-problem relationships
- `ExamSubmission`: Student submissions for exams

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

### Assignment

- `id`: Unique identifier
- `title`: Assignment title
- `subtitle`: Optional subtitle
- `description`: Optional detailed description
- `deadline`: Submission deadline
- `classroomId`: Reference to Classroom
- `createdAt`, `updatedAt`: Timestamps

### AssignmentProblem

- `id`: Unique identifier
- `assignmentId`: Reference to Assignment
- `problemId`: Reference to Problem
- `order`: Order of problem in assignment (1, 2, 3...)
- Unique constraints on (assignmentId, problemId) and (assignmentId, order)

### AssignmentSubmission

- `id`: Unique identifier
- `assignmentId`: Reference to Assignment
- `studentId`: Reference to User (student)
- `solutions`: JSON object containing code solutions for each problem
- `submittedAt`, `updatedAt`: Timestamps
- Unique constraint on (assignmentId, studentId)

### Exam

- `id`: Unique identifier
- `title`: Exam title
- `subtitle`: Optional subtitle
- `description`: Optional detailed description
- `deadline`: Submission deadline
- `duration`: Optional duration in minutes
- `classroomId`: Reference to Classroom
- `createdAt`, `updatedAt`: Timestamps

### ExamProblem

- `id`: Unique identifier
- `examId`: Reference to Exam
- `problemId`: Reference to Problem
- `order`: Order of problem in exam (1, 2, 3...)
- Unique constraints on (examId, problemId) and (examId, order)

### ExamSubmission

- `id`: Unique identifier
- `examId`: Reference to Exam
- `studentId`: Reference to User (student)
- `solutions`: JSON object containing code solutions for each problem
- `submittedAt`, `updatedAt`: Timestamps
- Unique constraint on (examId, studentId)

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
