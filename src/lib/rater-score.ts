import { getDb } from "./db";
import { logToDb } from "./logger";
import { feedbacks, users } from "./schema";
import { eq } from "drizzle-orm";
import { 
  RATER_WEIGHT_LIKES_RATE, 
  RATER_WEIGHT_FEEDBACKS_COUNT, 
  RATER_LIKES_THRESHOLD,
  RATER_FEEDBACKS_VOLUME_THRESHOLD 
} from "./constants";

interface FeedbackShape {
  isLiked: number;
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
      if (fb.isLiked === 1) likedCount += 1;
    }

    const totalCount = userFeedbacks.length;
    
    // 1. Likes Rate Score (Quality)
    const likesRatio = totalCount > 0 ? (likedCount / totalCount) : 0;
    const likesRateScore = Math.min(likesRatio / RATER_LIKES_THRESHOLD, 1);
    
    // 2. Feedbacks Count Score (Quantity)
    const feedbacksCountScore = Math.min(totalCount / RATER_FEEDBACKS_VOLUME_THRESHOLD, 1);

    // Weighted final score (out of 1.0) multiplied by 5 stars
    const finalScore = (
      (likesRateScore * RATER_WEIGHT_LIKES_RATE) + 
      (feedbacksCountScore * RATER_WEIGHT_FEEDBACKS_COUNT)
    ) * 5;

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
