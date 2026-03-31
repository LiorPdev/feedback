import { getDb } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import styles from "./show-feedback.module.css";
import BackButton from "@/components/BackButton";
import { auth } from "@clerk/nextjs/server";
import DashboardLink from "@/components/DashboardLink";
import ShareSongButton from "@/components/ShareSongButton";
import SongPlayer from "./SongPlayer";
import AuthOverlay from "@/components/AuthOverlay";
import { getListenTimeEvents } from "@/app/actions/songs";
import FeedbackTabs from "@/components/FeedbackTabs";

interface ShowFeedbackPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ShowFeedbackPage({ params }: ShowFeedbackPageProps) {
  const { slug } = await params;
  const db = await getDb();
  const { userId } = await auth();

  const song = await db.query.songs.findFirst({
    where: (songs, { eq }) => eq(songs.slug, slug),
    with: {
      user: { columns: { name: true } },
      feedbacks: {
        orderBy: (feedbacks, { desc }) => [desc(feedbacks.createdAt)]
      }
    },
  });

  if (!song) notFound();

  const isOwner = userId === song.userId;
  if (userId && !isOwner) redirect(`/give-feedback/${slug}`);

  // Averages
  const getAverage = (key: 'cat2' | 'cat3' | 'overall') => {
    const ratings = song.feedbacks.map(f => f[key] as number).filter(r => r > 0);
    if (ratings.length === 0) return null;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  };
  const averages = {
    cat2: getAverage('cat2'),
    cat3: getAverage('cat3'),
    overall: getAverage('overall'),
  };
  const hasAnyAverage = Object.values(averages).some(v => v !== null);

  // Resolve author genres for feedbacks
  const authorIds = Array.from(new Set(song.feedbacks.map(f => f.authorId).filter(Boolean))) as string[];
  const authors = authorIds.length > 0
    ? await db.query.users.findMany({
        where: (users, { inArray }) => inArray(users.id, authorIds),
        columns: { id: true, userGenre: true }
      })
    : [];
  const authorGenreMap = new Map(authors.map(a => [a.id, a.userGenre]));

  // Prepare serializable feedbacks (resolve genre inline)
  const feedbacks = song.feedbacks.map(fb => ({
    id: fb.id,
    playedSeconds: fb.playedSeconds,
    createdAt: fb.createdAt,
    authorGenre: fb.authorId ? (authorGenreMap.get(fb.authorId) ?? null) : null,
    cat2: fb.cat2,
    cat3: fb.cat3,
    overall: fb.overall,
    comment: fb.comment,
  }));

  // Listen events
  const listenData = await getListenTimeEvents(song.id);

  return (
    <div className={styles.container}>
      <div className={styles.blob} />

      <main className={`${styles.main} ${!userId ? styles.blurred : ""}`}>
        <div className={styles.card}>
          <BackButton href="/dashboard" title="חזרה לאיזור האישי" className={styles.backButton} />
          <SongPlayer url={song.url} />

          <div className={styles.titleRow}>
            <h1 className={styles.title}>{song.title}</h1>
            <span className={styles.subDate}>
              {new Date(song.createdAt).toLocaleDateString('he-IL')}
            </span>
          </div>

          {hasAnyAverage && (
            <div className={styles.averagesSection}>
              <div className={styles.averagesGrid}>
                {averages.cat2 && (
                  <div className={styles.averageItem}>
                    <span className={styles.avgLabel}>הפקה</span>
                    <span className={styles.avgValue}>{averages.cat2}</span>
                  </div>
                )}
                {averages.cat3 && (
                  <div className={styles.averageItem}>
                    <span className={styles.avgLabel}>שירה</span>
                    <span className={styles.avgValue}>{averages.cat3}</span>
                  </div>
                )}
                {averages.overall && (
                  <div className={styles.averageItem}>
                    <span className={styles.avgLabel}>כללי</span>
                    <span className={`${styles.avgValue} ${styles.avgOverall}`}>
                      {averages.overall}
                    </span>
                  </div>
                )}
              </div>
              <p className={styles.weightedNote}>* ממוצע משוקלל של כל הדירוגים</p>
            </div>
          )}

          <div className={styles.shareWrapper}>
            <ShareSongButton slug={song.slug} variant="large" />
          </div>
        </div>

        <FeedbackTabs
          feedbacks={feedbacks}
          listenEvents={listenData.events ?? []}
          listenAvgSeconds={listenData.avgSeconds ?? 0}
        />

        <DashboardLink />
      </main>

      {!userId && (
        <AuthOverlay
          message={
            <>
              כדי לצפות בפידבקים ובתובנות על השיר שלך, יש להתחבר למערכת.{"\n\n"}
            </>
          }
        />
      )}
    </div>
  );
}
