import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const JUDGE0_URL = process.env.JUDGE0_URL || "http://localhost:2358";

// Type for a single test case execution request
interface BatchSubmissionItem {
  language_id: number;
  source_code: string;
  stdin?: string;           // Input for the test case
  expected_output?: string; // The correct answer
}

interface SubmissionToken {
  token: string;
}

interface SubmissionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string;
  memory: number;
  status: {
    id: number;
    description: string;
  };
  token: string;
  message: string | null;
}

/**
 * Execute code submissions in batch using Judge0
 * @param submissions Array of submission items to execute
 * @returns Array of execution results from Judge0
 */
export const executeBatch = async (submissions: BatchSubmissionItem[]): Promise<SubmissionResult[]> => {
  try {
    // Step 1: Submit the batch and get tokens
    const submitResponse = await axios.post<SubmissionToken[]>(
      `${JUDGE0_URL}/submissions/batch?base64_encoded=false`,
      { submissions },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const tokens = submitResponse.data.map(item => item.token).join(',');
    
    // Step 2: Poll for results (with retries)
    let attempts = 0;
    const maxAttempts = 10;
    const delayMs = 500;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      const resultsResponse = await axios.get<{ submissions: SubmissionResult[] }>(
        `${JUDGE0_URL}/submissions/batch?tokens=${tokens}&base64_encoded=false`
      );

      const results = resultsResponse.data.submissions;
      
      // Check if all submissions are completed (status.id not in [1, 2])
      // Status 1 = In Queue, Status 2 = Processing
      const allCompleted = results.every(r => r.status.id !== 1 && r.status.id !== 2);
      
      if (allCompleted) {
        return results;
      }
      
      attempts++;
    }

    throw new Error("Batch execution timed out");
  } catch (error: any) {
    console.error("Judge0 API Error:", error.response?.data || error.message);
    throw new Error("Failed to execute code on Judge0");
  }
};

/**
 * Get supported languages from Judge0
 * Useful for displaying available languages to users
 */
export const getLanguages = async () => {
  try {
    const response = await axios.get(`${JUDGE0_URL}/languages`);
    return response.data;
  } catch (error: any) {
    console.error("Judge0 Languages Error:", error.message);
    throw new Error("Failed to fetch supported languages");
  }
};

/**
 * Common Judge0 Language IDs for reference
 */
export const LANGUAGE_IDS = {
  C: 50,
  CPP: 54,
  JAVA: 62,
  JAVASCRIPT: 63,
  PYTHON: 71,
  RUBY: 72,
  RUST: 73,
  TYPESCRIPT: 74,
  KOTLIN: 78,
  GO: 60,
  PHP: 68,
  CSHARP: 51,
  SWIFT: 83,
} as const;