import { getDb } from "./db";
import { logToDb } from "./logger";
import { feedbacks, users } from "./schema";
import { eq } from "drizzle-orm";
import { RATER_WEIGHT_LIKES, RATER_LIKES_THRESHOLD } from "./constants";

interface FeedbackShape {
  isLiked: boolean;
}

export async function updateRaterScore(userId: string) {
  const db = await getDb();

  try {
    // 1. Get all feedbacks by this user (only need isLiked status)
    const userFeedbacks = await db.query.feedbacks.findMany({
      where: eq(feedbacks.authorId, userId),
      columns: {
        isLiked: true
      }
    }) as FeedbackShape[];

    if (userFeedbacks.length === 0) {
      await db.update(users)
        .set({ raterScore: 0 })
        .where(eq(users.id, userId));
      return;
    }

    let likedCount = 0;
    for (const fb of userFeedbacks) {
      if (fb.isLiked) likedCount += 1;
    }

    const count = userFeedbacks.length;
    const likesRatio = likedCount / count;
    const likesScore = Math.min(likesRatio / RATER_LIKES_THRESHOLD, 1);

    const finalScore = (likesScore * RATER_WEIGHT_LIKES) * 5;

    // Round to 1 decimal place
    const roundedScore = Math.round(finalScore * 10) / 10;

    await db.update(users)
      .set({ raterScore: roundedScore })
      .where(eq(users.id, userId));

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logToDb({
      message: `Error updating rater score: ${errorMessage}`,
      data: error,
      source: "rater-score.ts:updateRaterScore",
      userId
    });
  }
}
