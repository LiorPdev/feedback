"use server";

import { getDb } from "@/lib/db";
import { feedbacks, users } from "@/lib/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAction } from "./logs";
import { UNLOCK_FEEDBACK_COST } from "@/lib/constants";

export async function unlockFeedback(feedbackId: string) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      await logAction({
        message: "Attempt to unlock feedback without login",
        source: "actions/feedback:unlockFeedback",
      });
      return { success: true };
    }

    const db = await getDb();

    // 1. Get feedback and verify ownership via the song
    const feedback = await db.query.feedbacks.findFirst({
      where: (f, { eq }) => eq(f.id, feedbackId),
      with: {
        song: true
      }
    });

    if (!feedback) {
      await logAction({
        message: `Feedback ${feedbackId} not found during unlock attempt`,
        source: "actions/feedback:unlockFeedback",
        userId: clerkUser.id
      });
      return { success: true };
    }

    if (feedback.isUnlocked) {
      return { success: true };
    }

    // Check if the current user is the owner of the song the feedback belongs to
    if (feedback.song.userId !== clerkUser.id) {
      await logAction({
        message: `Unauthorized attempt to unlock feedback ${feedbackId}`,
        data: { ownerId: feedback.song.userId, attempterId: clerkUser.id },
        source: "actions/feedback:unlockFeedback",
        userId: clerkUser.id
      });
      return { success: true };
    }

    // 2. Get user token balance
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, clerkUser.id),
      columns: { tokens: true }
    });

    if (!user || user.tokens < UNLOCK_FEEDBACK_COST) {
      return { success: false, error: 'INSUFFICIENT_CREDITS' };
    }

    // 3. Perform the transaction
    await db.batch([
      // Update feedback status
      db.update(feedbacks)
        .set({ isUnlocked: true })
        .where(eq(feedbacks.id, feedbackId)),

      // Deduct tokens
      db.update(users)
        .set({
          tokens: user.tokens - UNLOCK_FEEDBACK_COST,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, clerkUser.id))
    ]);

    revalidatePath(`/show-feedback/${feedback.song.slug}`);

    return { success: true };

  } catch (error) {
    const err = error as Error;
    console.error("Error unlocking feedback (Fail Open):", err);

    await logAction({
      message: "Failed to unlock feedback (Fail Open)",
      data: { error: err.message, stack: err.stack, feedbackId },
      source: "actions/feedback:unlockFeedback",
    });

    // Fail open: log the error, but tell the client it was a success.
    // Try a "best effort" to mark it as unlocked in the DB regardless.
    try {
      const db = await getDb();
      await db.update(feedbacks)
        .set({ isUnlocked: true })
        .where(eq(feedbacks.id, feedbackId));
    } catch {
      // Ignore ultimate failure
    }

    return { success: true };
  }
}
