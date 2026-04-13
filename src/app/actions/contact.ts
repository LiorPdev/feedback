"use server";

import { syncUser } from "@/lib/user-auth";
import { sendContactUsEmail } from "@/lib/mail";
import { logToDb } from "@/lib/logger";

export async function submitContactMessage(message: string) {
  const dbUser = await syncUser();

  if (!dbUser) {
    return { success: false, error: "עליך להיות מחובר כדי לשלוח הודעה" };
  }

  const userEmail = dbUser.email || "Unknown";
  const userName = dbUser.name || userEmail;

  try {
    const result = await sendContactUsEmail({
      fromEmail: userEmail,
      fromName: userName,
      message,
    });

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    await logToDb({
      message: "Failed to send contact message",
      data: error,
      source: "contact.ts:submitContactMessage",
      userId: dbUser.id,
    });
    return { success: false, error: "An unexpected error occurred" };
  }
}
