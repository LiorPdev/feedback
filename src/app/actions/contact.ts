"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { sendContactEmail } from "@/lib/mail";
import { logToDb } from "@/lib/logger";

export async function submitContactMessage(message: string) {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return { success: false, error: "You must be logged in to send a message" };
  }

  const userEmail = user.emailAddresses[0]?.emailAddress || "Unknown";
  const userName = user.firstName ? `${user.firstName} ${user.lastName || ""}` : userEmail;

  try {
    const result = await sendContactEmail({
      fromEmail: userEmail,
      fromName: userName,
      message,
    });

    if (result.success) {
      await logToDb({
        message: "Contact message sent",
        source: "contact.ts:submitContactMessage",
        userId,
      });
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    await logToDb({
      message: "Failed to send contact message",
      data: error,
      source: "contact.ts:submitContactMessage",
      userId,
    });
    return { success: false, error: "An unexpected error occurred" };
  }
}
