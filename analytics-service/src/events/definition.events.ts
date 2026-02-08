//Responsibility: Define the Types.
export interface SubmissionCompletedEvent {
  userId: string;
  problemId: string;
  submissionId: string;
  status:
    | "ACCEPTED"
    | "WRONG_ANSWER"
    | "TIME_LIMIT_EXCEEDED"
    | "MEMORY_LIMIT_EXCEEDED"
    | "COMPILATION_ERROR"
    | "ERROR";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topics: string[];
  language: string; // e.g. "python", "cpp", "java"
  executionTimeMs: number; // parsed execution time in ms
  memoryKb: number; // memory in KB
  attemptNumber: number; // which attempt for this user+problem
  createdAt: string; // ISO string
}
