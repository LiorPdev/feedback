"use server";

import { getDb } from "@/lib/db";
import { feedbacks, users, songs } from "@/lib/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAction } from "./logs";
import { UNLOCK_FEEDBACK_COST, FREE_FEEDBACKS_FOR_ARTIST, LIKE_FEEDBACK_REWARD, FEEDBACK_COUNT_FACTOR } from "@/lib/constants";
import { updateRaterScore } from "@/lib/rater-score";
import { syncUser } from "@/lib/user-auth";

export async function getMyGivenFeedbacksCount(): Promise<number> {
  try {
    const dbUser = await syncUser();
    if (!dbUser) return 0;

    const db = await getDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(feedbacks)
      .where(eq(feedbacks.authorId, dbUser.id));

    return result[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

export interface GivenFeedbackItem {
  id: string;
  songId: string;
  songTitle: string;
  songSlug: string;
  songUrl: string;
  overall: number;
  comment: string;
  playedSeconds: number | null;
  createdAt: string;
  isLiked: number;
}

export async function getMyGivenFeedbacks(): Promise<GivenFeedbackItem[]> {
  try {
    const dbUser = await syncUser();
    if (!dbUser) return [];

    const db = await getDb();

    const rows = await db.query.feedbacks.findMany({
      where: (f, { eq }) => eq(f.authorId, dbUser.id),
      with: { song: { columns: { title: true, slug: true, url: true } } },
      orderBy: (f, { desc }) => [desc(f.createdAt)],
    });

    return rows.map((row) => ({
      id: row.id,
      songId: row.songId,
      songTitle: row.song.title,
      songSlug: row.song.slug,
      songUrl: row.song.url,
      overall: row.overall,
      comment: row.comment,
      playedSeconds: row.playedSeconds,
      createdAt: row.createdAt,
      isLiked: row.isLiked,
    }));
  } catch {
    return [];
  }
}


export async function unlockFeedback(feedbackId: string) {
  try {
    const dbUser = await syncUser();
    if (!dbUser) {
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
      return { success: true };
    }

    if (feedback.isUnlocked) {
      return { success: true };
    }

    // Check if the current user is the owner of the song the feedback belongs to
    if (feedback.song.userId !== dbUser.id) {
      return { success: true };
    }

    // 2. Check if the artist has already used their free (FREE_FEEDBACKS_FOR_ARTIST) unlocks (Artist-wide)
    const unlockedFeedbacksCount = await db.select({ value: sql<number>`count(*)` })
      .from(feedbacks)
      .innerJoin(songs, eq(feedbacks.songId, songs.id))
      .where(and(
        eq(songs.userId, dbUser.id),
        eq(feedbacks.isUnlocked, true)
      ));

    const isFree = (unlockedFeedbacksCount[0]?.value ?? 0) < FREE_FEEDBACKS_FOR_ARTIST;

    if (!isFree) {
      if (dbUser.tokens < UNLOCK_FEEDBACK_COST) {
        return { success: false, error: 'INSUFFICIENT_CREDITS' };
      }

      // Deduct tokens
      await db.update(users)
        .set({
          tokens: dbUser.tokens - UNLOCK_FEEDBACK_COST,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, dbUser.id));
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

export async function setFeedbackReaction(feedbackId: string, newReaction: -1 | 0 | 1) {
  try {
    const dbUser = await syncUser();
    if (!dbUser) return { success: false, error: 'NOT_LOGGED_IN' };

    const db = await getDb();

    // 1. Get feedback and verify artist ownership via the song
    const feedback = await db.query.feedbacks.findFirst({
      where: (f, { eq }) => eq(f.id, feedbackId),
      with: {
        song: true
      }
    });

    if (!feedback) return { success: false, error: 'FEEDBACK_NOT_FOUND' };
    if (feedback.isLiked === newReaction) return { success: false, error: 'ALREADY_SET' };
    if (feedback.song.userId !== dbUser.id) return { success: false, error: 'UNAUTHORIZED' };
    if (!feedback.authorId) return { success: false, error: 'ANONYMOUS_FEEDBACK' };

    // 2. Handle token rewards/deductions
    const previousReaction = feedback.isLiked;
    let tokenDelta = 0;

    if (previousReaction !== 1 && newReaction === 1) {
      // Changing to Liked from 0 or -1
      tokenDelta = LIKE_FEEDBACK_REWARD;
    } else if (previousReaction === 1 && newReaction !== 1) {
      // Changing away from Liked to 0 or -1
      tokenDelta = -LIKE_FEEDBACK_REWARD;
    }

    if (tokenDelta !== 0) {
      const rater = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, feedback.authorId!),
        columns: { tokens: true }
      });

      if (rater) {
        await db.update(users)
          .set({
            tokens: Math.max(0, rater.tokens + tokenDelta),
            updatedAt: new Date().toISOString()
          })
          .where(eq(users.id, feedback.authorId!));
      }
    }

    // 3. Mark the new reaction
    await db.update(feedbacks)
      .set({ isLiked: newReaction })
      .where(eq(feedbacks.id, feedbackId));

    revalidatePath(`/show-feedback/${feedback.song.slug}`);

    // Update rater quality index
    await updateRaterScore(feedback.authorId!);

    return { success: true };

  } catch (error) {
    const err = error as Error;
    await logAction({
      message: "Failed to set feedback reaction",
      data: { error: err.message, stack: err.stack, feedbackId, newReaction },
      source: "actions/feedback:setFeedbackReaction",
    });
    return { success: false, error: 'SERVER_ERROR' };
  }
}

//
// Returns a "small cheat" number to display as feedbacks count on the landing page
//
export async function getDisplayFeedbacksCount(): Promise<number> {
  try {
    const db = await getDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(feedbacks);

    const total = result[0]?.count ?? 0;
    const base = Math.floor(total / FEEDBACK_COUNT_FACTOR);

    // Calculate dynamic part based on time
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();

    const displayNumber = base + hour + Math.floor(minutes / 5);

    return displayNumber;
  } catch {
    return 0;
  }
}
