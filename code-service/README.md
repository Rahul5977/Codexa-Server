# Code Execution Service

This service provides code execution functionality using Judge0 for the Codexa platform.

## Features

- ✅ Execute code in multiple programming languages
- ✅ Support for custom input (stdin)
- ✅ Batch submission processing for problem test cases
- ✅ Queue-based processing with BullMQ (when Redis is available)
- ✅ Analytics integration for submission tracking

## Setup

### Prerequisites

1. **Judge0** - Local Judge0 instance running on `http://localhost:2358`
   - See Judge0 deployment guide for setup instructions
   
2. **PostgreSQL** - For storing submissions
3. **Redis** (optional) - For job queue processing
   - Required for full submission workflow with test cases
   - Service works in development mode without Redis (direct execution only)

### Environment Variables

Create a `.env` file in the `code-service` directory:

```env
PORT=8003
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/codexa?schema=public"

# Judge0 Configuration
JUDGE0_URL=http://localhost:2358

# Redis Configuration (optional for dev)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Installation

```bash
cd code-service
npm install
npm run dev
```

## API Endpoints

### 1. Run Code (Dry Run)

Execute code immediately without saving to database. Perfect for testing code with custom input.

**Endpoint:** `POST /submissions/run`

**Request Body:**
```json
{
  "code": "print(5 + 3)",
  "languageId": 71,
  "stdin": ""
}
```

**Response:**
```json
{
  "status": "Accepted",
  "stdout": "8\n",
  "stderr": null,
  "compile_output": null,
  "time": "0.012",
  "memory": 3504
}
```

**Example with stdin:**
```bash
curl -X POST http://localhost:8003/submissions/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "name = input()\nprint(f\"Hello, {name}!\")",
    "languageId": 71,
    "stdin": "World"
  }'
```

### 2. Submit Code (For Problems)

Submit code to be tested against problem test cases. Requires Redis for queue processing.

**Endpoint:** `POST /submissions`

**Request Body:**
```json
{
  "userId": "user-uuid",
  "problemId": "problem-uuid",
  "code": "def solution(n): return n * 2",
  "languageId": 71
}
```

**Response:**
```json
{
  "message": "Submission queued successfully",
  "submissionId": "submission-uuid"
}
```

### 3. Get Submission Status

Poll for submission results.

**Endpoint:** `GET /submissions/:id`

**Response:**
```json
{
  "message": "Submission fetched successfully",
  "submission": {
    "id": "submission-uuid",
    "status": "ACCEPTED",
    "stdout": "8\n",
    "stderr": null,
    "time": "0.012",
    "memory": 3504,
    "createdAt": "2026-03-02T10:00:00Z",
    "languageId": 71
  }
}
```

### 4. Get Submission History

Get list of submissions for a user/problem.

**Endpoint:** `GET /submissions?userId=uuid&problemId=uuid`

**Response:**
```json
[
  {
    "id": "submission-uuid",
    "status": "ACCEPTED",
    "time": "0.012",
    "memory": 3504,
    "createdAt": "2026-03-02T10:00:00Z",
    "languageId": 71
  }
]
```

## Supported Languages

| Language   | Language ID | Notes                    |
|------------|-------------|--------------------------|
| C          | 50          | GCC 9.2.0                |
| C++        | 54          | G++ 9.2.0                |
| Java       | 62          | OpenJDK 13.0.1           |
| JavaScript | 63          | Node.js 12.14.0          |
| Python     | 71          | Python 3.8.1             |
| Ruby       | 72          | Ruby 2.7.0               |
| Rust       | 73          | Rust 1.40.0              |
| TypeScript | 74          | TypeScript 3.7.4         |
| Kotlin     | 78          | Kotlin 1.3.70            |
| Go         | 60          | Go 1.13.5                |
| PHP        | 68          | PHP 7.4.1                |
| C#         | 51          | Mono 6.6.0.161           |
| Swift      | 83          | Swift 5.2.3              |

To get the full list of available languages:
```bash
curl http://localhost:2358/languages
```

## Submission Status Codes

- `PENDING` - Submission is queued
- `PROCESSING` - Submission is being executed
- `ACCEPTED` - All test cases passed
- `WRONG_ANSWER` - Output doesn't match expected
- `TIME_LIMIT_EXCEEDED` - Execution took too long
- `COMPILATION_ERROR` - Code failed to compile
- `RUNTIME_ERROR` - Code crashed during execution
- `ERROR` - System error

## Architecture

### Without Redis (Development Mode)

```
Client → Code Service → Judge0 → Response
```

Only `/submissions/run` endpoint works. Direct execution without queuing.

### With Redis (Production Mode)

```
Client → Code Service → BullMQ → Worker → Judge0
                ↓                            ↓
           Submission DB              Test Results
                ↑                            ↓
          Client Polling ← Analytics ← Worker
```

1. Client submits code
2. Submission saved to DB with PENDING status
3. Job queued in BullMQ
4. Worker picks up job
5. Worker fetches test cases from DB
6. Worker calls Judge0 with batch submission
7. Worker updates submission with results
8. Worker sends analytics event
9. Client polls for results

## Testing

### Test Code Execution

```bash
# Python
curl -X POST http://localhost:8003/submissions/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(5+3)",
    "languageId": 71
  }'

# C++
curl -X POST http://localhost:8003/submissions/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "#include <iostream>\nusing namespace std;\nint main() {\n    cout << \"Hello!\" << endl;\n    return 0;\n}",
    "languageId": 54
  }'

# JavaScript
curl -X POST http://localhost:8003/submissions/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "console.log(\"Hello from JavaScript!\");",
    "languageId": 63
  }'
```

### Test Error Handling

```bash
# Runtime error
curl -X POST http://localhost:8003/submissions/run \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(undefined_var)",
    "languageId": 71
  }'
```

## Troubleshooting

### Judge0 Connection Issues

If you see "Failed to execute code on Judge0" errors:

1. Check if Judge0 is running:
```bash
docker ps | grep judge0
```

2. Test Judge0 directly:
```bash
curl http://localhost:2358/about
```

3. Verify the JUDGE0_URL in `.env` matches your Judge0 instance

### Redis Connection Issues

If Redis is not available:
- Service will run in development mode
- Only `/submissions/run` endpoint will work
- Full submission workflow requires Redis

To start Redis:
```bash
docker-compose up -d redis
```

## Performance Notes

- Batch submissions poll for results with 500ms intervals
- Maximum 10 polling attempts (5 seconds total)
- Judge0 processes <20 test cases efficiently in <10 seconds
- Consider async polling for >50 test cases

## License

MIT
