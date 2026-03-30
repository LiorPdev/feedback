import { getFeedSongs } from "@/app/actions/songs";
import FeedContainer from "./FeedContainer";
import styles from "./feed.module.css";
import { auth } from "@clerk/nextjs/server";
export const dynamic = "force-dynamic";

export default async function GiveFeedbackFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ song?: string; from?: string; insufficient_credits?: string }>;
}) {
  const { song: songSlug, from, insufficient_credits } = await searchParams;
  const result = await getFeedSongs(songSlug);
  await auth();

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

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <FeedContainer 
          initialSongs={result.songs} 
          from={from} 
          initialSongSlug={songSlug} 
          showInsufficientCredits={insufficient_credits === 'true'}
        />
      </main>
    </div>
  );
}
