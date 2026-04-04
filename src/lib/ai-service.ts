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

/**
 * Provides a detailed sound and production analysis for a given YouTube URL.
 * Returns a formatted Hebrew string with sections for Mix, EQ, Dynamics, Effects, and Production.
 */
export async function analyzeSong(youtubeUrl: string): Promise<string> {

  if (!youtubeUrl || youtubeUrl.trim().length === 0) {
    return "קישור לא נמצא. אנא ספק קישור תקין ליוטיוב.";
  }

  const systemPrompt = `
    Role: Professional Music Producer & Sound Engineer.
    Task: Provide a detailed sound & production analysis in Hebrew for the provided YouTube link.
    Sections: 1. Mix Balance, 2. EQ & Tone, 3. Dynamics, 4. Space/FX, 5. General Production.
    End: Short summary + warm compliment.
    Tone: Professional Hebrew. One formatted string.
  `;

  try {
    const response = await callGemini(systemPrompt, youtubeUrl);

    if (!response) {
      return "לא ניתן היה לנתח את השיר כרגע. אנא נסה שוב מאוחר יותר.";
    }

    return response;
  } catch (error) {
    await logToDb({
      message: "analyzeSong error",
      data: error,
      source: "src/lib/ai-service.ts:analyzeSong",
    });
    return "שגיאה בניתוח השיר. אנא וודא שהקישור תקין ונסה שוב.";
  }
}
