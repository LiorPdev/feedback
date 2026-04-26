import { getFeedSongs, getUserSongCount } from "@/app/actions/songs";
import FeedContainer from "./FeedContainer";
import FeedInfoFooter from "./FeedInfoFooter";
import styles from "./feed.module.css";
import { getDb } from "@/lib/db";
import { syncUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

interface Feedback {
  id: string;
  overall: number;
  comment: string;
  createdAt: string;
}

export default async function GiveFeedbackFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ song?: string; from?: string; utm_source?: string; insufficient_credits?: string; backHome?: string }>;
}) {
  const { song: songSlug, from, insufficient_credits, backHome } = await searchParams;
  const result = await getFeedSongs(songSlug);
  const dbUser = await syncUser();
  const userId = dbUser?.id;

  const songCountResult = await getUserSongCount();
  const hasSongs = (songCountResult.success && songCountResult.count > 0);

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

  let initialFeedback: Feedback | null = null;
  if (userId && result.songs.length > 0) {
    const firstSong = result.songs[0];
    if (firstSong) {
      const db = await getDb();
      const existingFeedback = await db.query.feedbacks.findFirst({
        where: (f, { eq, and }) => and(eq(f.authorId, userId), eq(f.songId, firstSong.id))
      });
      if (existingFeedback) {
        initialFeedback = existingFeedback as unknown as Feedback;
      }
    }
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <FeedContainer
          initialSongs={result.songs}
          initialFeedback={initialFeedback}
          from={from}
          showInsufficientCredits={insufficient_credits === 'true'}
          backHome={backHome === 'true'}
          isLoggedIn={!!dbUser}
        />
        <FeedInfoFooter hasSongs={hasSongs} raterScore={dbUser?.raterScore} />
      </main>
    </div>
  );
}
