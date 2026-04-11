import { getDb } from "./db";
import { logToDb } from "./logger";
import { feedbacks, users } from "./schema";
import { eq } from "drizzle-orm";
import {
  RATER_WEIGHT_TEXT,
  RATER_WEIGHT_LIKES,
  RATER_WEIGHT_CONSENSUS,
  RATER_MIN_REVIEWS_TO_COMPARE,
  WEIGHT_PRODUCTION,
  WEIGHT_SINGING,
  WEIGHT_OVERALL
} from "./constants";

interface FeedbackShape {
  id: string;
  cat2: number;
  cat3: number;
  overall: number;
  comment?: string | null;
  isLiked: boolean;
  song: {
    feedbacks: {
      id: string;
      cat2: number;
      cat3: number;
      overall: number;
    }[];
  };
}

export async function updateRaterScore(userId: string) {
  const db = await getDb();

  try {
    // 1. Get all feedbacks by this user
    const userFeedbacks = await db.query.feedbacks.findMany({
      where: eq(feedbacks.authorId, userId),
      with: {
        song: {
          with: {
            feedbacks: true
          }
        }
      }
    }) as unknown as FeedbackShape[];

    if (userFeedbacks.length === 0) {
      await db.update(users)
        .set({ raterScore: 0 })
        .where(eq(users.id, userId));
      return;
    }

    let totalTextScore = 0;
    let totalConsensusScore = 0;
    let likedCount = 0;

    // Helper to calculate weighted rating
    const getRating = (f: { cat2: number; cat3: number; overall: number }) => 
      (f.cat2 * WEIGHT_PRODUCTION + f.cat3 * WEIGHT_SINGING + f.overall * WEIGHT_OVERALL);

    for (const fb of userFeedbacks) {
      // Text Presence Component
      const charCount = fb.comment ? fb.comment.trim().length : 0;
      if (charCount > 0) totalTextScore += 1;

      // Likes Component
      if (fb.isLiked) likedCount += 1;

      // Consensus Component
      const userRating = getRating(fb);
      const otherFeedbacks = fb.song.feedbacks.filter(f => f.id !== fb.id && f.overall > 0);

      if (otherFeedbacks.length >= RATER_MIN_REVIEWS_TO_COMPARE) {
        const othersAvg = otherFeedbacks.reduce((sum, f) => sum + getRating(f), 0) / otherFeedbacks.length;
        const diff = Math.abs(userRating - othersAvg);
        // Max diff is 9 (10-1 or 1-10)
        const similarity = Math.max(0, 1 - (diff / 9));
        totalConsensusScore += similarity;
      } else {
        // Not enough data, give benefit of the doubt
        totalConsensusScore += 0.5;
      }
    }

    const count = userFeedbacks.length;
    const avgText = totalTextScore / count;
    const avgConsensus = totalConsensusScore / count;
    
    // 50% liked is enough for full points (1.0) in this component
    const likesScore = Math.min((likedCount / count) * 2, 1);

    const finalScore = (
      (likesScore * RATER_WEIGHT_LIKES) +
      (avgText * RATER_WEIGHT_TEXT) +
      (avgConsensus * RATER_WEIGHT_CONSENSUS)
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
