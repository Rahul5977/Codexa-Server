import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export const generateAIResponse = async (prompt: string, context: string) => {
  try {
    const fullPrompt = `${context}\n\n---\n\nUser Input:\n${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("AI Service Failed");
  }
};
