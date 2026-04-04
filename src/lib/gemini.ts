/**
 * FFU - Infrastructure for AI features
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logToDb } from "./logger";

/**
 * Generic function to call Gemini AI with a specific prompt and text.
 * Falls back to null if there's an error (Fail-Open policy).
 */
export async function callGemini(systemPrompt: string, userText: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    await logToDb({
      message: "GEMINI_API_KEY is not set. AI features will be skipped.",
      source: "src/lib/gemini.ts:callGemini",
    });
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `${systemPrompt}\n\nText to analyze:\n"${userText}"`;

    // Using a timeout to ensure we don't block the user too long
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Gemini Timeout (30s)")), 30000))
    ]);

    if (!result || !('response' in result)) {
      return null;
    }

    const response = await result.response;
    const text = response.text().trim();

    return text;
  } catch (error) {
    const isBusy = error instanceof Error &&
      (error.message.includes("503") || error.message.includes("429") || error.message.includes("Service Unavailable") || error.message.includes("high demand"));

    if (isBusy) {
      return "האתר עמוס כרגע. אנא נסה שוב בעוד מספר רגעים.";
    }

    await logToDb({
      message: `Gemini AI error: ${error instanceof Error ? error.message : String(error)}`,
      data: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
      source: "src/lib/gemini.ts:callGemini",
    });
    return null;
  }
}
