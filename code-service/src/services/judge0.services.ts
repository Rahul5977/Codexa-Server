import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const RAPID_API_URL = process.env.RAPID_API_URL!;
const RAPID_API_KEY = process.env.RAPID_API_KEY!;
const RAPID_API_HOST = process.env.RAPID_API_HOST!;

// Type for a single test case execution request
interface BatchSubmissionItem {
  language_id: number;
  source_code: string;
  stdin: string;           // Input for the test case
  expected_output: string; // The correct answer
}

export const executeBatch = async (submissions: BatchSubmissionItem[]) => {
  try {
    // Judge0 Batch Endpoint
    // base64_encoded=true is safer for special characters
    // wait=true tells Judge0 "Process this NOW and give me the result" (Good for < 20 test cases)
    // For 100+ test cases, we might need a different async strategy (polling), 
    // but batch is usually fast enough for <10s execution.
    const response = await axios.post(
      `${RAPID_API_URL}/submissions/batch?base64_encoded=false&wait=true`,
      { submissions },
      {
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": RAPID_API_KEY,
          "X-RapidAPI-Host": RAPID_API_HOST,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Judge0 API Error:", error);
    throw new Error("Failed to execute code on Judge0");
  }
};