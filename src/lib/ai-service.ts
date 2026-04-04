/**
 * AI Service for processing song data - Currently unused (FFU).
 */
import { callGemini } from "./gemini";
import { logToDb } from "./logger";

/**
 * Checks if the given text (Hebrew) is offensive, hateful, or inappropriate.
 * Returns { isOffensive: true } ONLY if it's highly likely to be offensive.
 * Fails open (returns false) on any error.
 */
export async function checkIsOffensive(text: string): Promise<{ isOffensive: boolean }> {
  if (!text || text.trim().length === 0) {
    return { isOffensive: false };
  }

  const systemPrompt = `
    Role: Hebrew music community moderator.
    Task: Classify Hebrew text for hate speech or severe personal attacks.
    Note: Negative music criticism (e.g., "bad song") is ALLOWED.
    Output: Return ONLY 'TRUE' (offensive) or 'FALSE' (safe).
  `;

  try {
    const response = await callGemini(systemPrompt, text);

    if (!response) return { isOffensive: false }; // Fail-open

    // Check if the response contains 'TRUE' (case-insensitive)
    const isOffensive = response.toUpperCase().includes("TRUE");

    return { isOffensive };
  } catch (error) {
    await logToDb({
      message: "checkIsOffensive error",
      data: error,
      source: "src/lib/ai-service.ts:checkIsOffensive",
    });
    return { isOffensive: false }; // Fail-open
  }
}