"use server";

import { getDb } from "@/lib/db";
import { feedbacks, users, songs } from "@/lib/schema";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAction } from "./logs";
import { UNLOCK_FEEDBACK_COST, FREE_FEEDBACKS_FOR_ARTIST } from "@/lib/constants";

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

    // 2. Check if this is one of the artist's first 2 (FREE_FEEDBACKS_FOR_ARTIST) feedbacks ever received (Artist-wide)
    const prevFeedbacksCount = await db.select({ value: sql<number>`count(*)` })
      .from(feedbacks)
      .innerJoin(songs, eq(feedbacks.songId, songs.id))
      .where(and(
        eq(songs.userId, feedback.song.userId),
        lt(feedbacks.createdAt, feedback.createdAt)
      ));

    const isFree = (prevFeedbacksCount[0]?.value ?? 0) < FREE_FEEDBACKS_FOR_ARTIST;

    if (!isFree) {
      // Get user token balance
      const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, clerkUser.id),
        columns: { tokens: true }
      });

      if (!user || user.tokens < UNLOCK_FEEDBACK_COST) {
        return { success: false, error: 'INSUFFICIENT_CREDITS' };
      }

      // Deduct tokens
      await db.update(users)
        .set({
          tokens: user.tokens - UNLOCK_FEEDBACK_COST,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, clerkUser.id));
    }

    // 3. Mark as unlocked (Deduction happened above if not free)
    await db.update(feedbacks)
      .set({ isUnlocked: true })
      .where(eq(feedbacks.id, feedbackId));

    revalidatePath(`/show-feedback/${feedback.song.slug}`);

    return { success: true };

  } catch (error) {
    const err = error as Error;
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
