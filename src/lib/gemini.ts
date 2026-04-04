import { GoogleGenerativeAI } from "@google/generative-ai";
import { logToDb } from "./logger";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Generic function to call Gemini AI with a specific prompt and text.
 * Falls back to null if there's an error (Fail-Open policy).
 */
export async function callGemini(systemPrompt: string, userText: string): Promise<string | null> {
  if (!process.env.GEMINI_API_KEY) {
    await logToDb({
      message: "GEMINI_API_KEY is not set. AI features will be skipped.",
      source: "src/lib/gemini.ts:callGemini",
    });
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `${systemPrompt}\n\nText to analyze:\n"${userText}"`;

    // Using a timeout to ensure we don't block the user too long
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
    ]);

    if (!result || !('response' in result)) return null;

    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    await logToDb({
      message: "Gemini AI error",
      data: error,
      source: "src/lib/gemini.ts:callGemini",
    });
    // Fail-open: return null to indicate the AI check couldn't be completed
    return null;
  }
}
