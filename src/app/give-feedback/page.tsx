import { getFeedSongs } from "@/app/actions/songs";
import FeedContainer from "./FeedContainer";
import styles from "./feed.module.css";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";


export const dynamic = "force-dynamic";

export default async function GiveFeedbackFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ song?: string; from?: string; insufficient_credits?: string }>;
}) {
  const { song: songSlug, from, insufficient_credits } = await searchParams;
  const result = await getFeedSongs(songSlug);
  const { userId } = await auth();

  if (!result.success || !result.songs) {
    return (
      <div className={styles.container}>
        <div className={styles.main}>
          <div className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>שגיאה בטעינת השירים</h2>
            <p>{result.error || "אנא נסו שוב מאוחר יותר."}</p>
          </div>
        </div>
      </div>
    );
  }

  interface Feedback {
    id: string;
    cat2: number;
    cat3: number;
    overall: number;
    comment: string;
    createdAt: string;
  }

  let initialFeedback: Feedback | null = null;
  if (userId && result.songs.length > 0) {
    const db = await getDb();
    const existingFeedback = await db.query.feedbacks.findFirst({
      where: (f, { eq, and }) => and(eq(f.authorId, userId), eq(f.songId, result.songs[0].id))
    });
    if (existingFeedback) {
      initialFeedback = existingFeedback as unknown as Feedback;
    }
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <FeedContainer
          initialSongs={result.songs}
          initialFeedback={initialFeedback}
          from={from}
          initialSongSlug={songSlug}
          showInsufficientCredits={insufficient_credits === 'true'}
        />
      </main>
    </div>
  );
}
