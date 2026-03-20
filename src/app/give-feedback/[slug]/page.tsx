import { getFeedSongs } from "@/app/actions/songs";
import { getDb } from "@/lib/db";
import FeedContainer from "../FeedContainer";
import styles from "../feed.module.css";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

interface GiveFeedbackPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function GiveFeedbackPage({ params }: GiveFeedbackPageProps) {
  const { slug } = await params;
  const { userId } = await auth();

  // Ownership check
  const db = await getDb();
  const song = await db.query.songs.findFirst({
    where: (s, { eq }) => eq(s.slug, slug),
    columns: { userId: true }
  });

  if (!song) {
    notFound();
  }

  if (userId === song.userId) {
    redirect(`/show-feedback/${slug}`);
  }

  const result = await getFeedSongs(slug);

  if (!result.success || !result.songs || result.songs.length === 0) {
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
        <FeedContainer initialSongs={result.songs} />
      </main>
    </div>
  );
}
