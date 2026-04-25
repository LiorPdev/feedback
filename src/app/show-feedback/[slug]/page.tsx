import { notFound, redirect } from "next/navigation";
import { getListenTimeEvents } from "@/app/actions/songs";
import AuthOverlay from "@/components/AuthOverlay";
import DashboardLink from "@/components/DashboardLink";
import FeedbackTabs from "@/components/FeedbackTabs";
import ManualBackButton from "@/components/ManualBackButton";
import { getDb } from "@/lib/db";
import { syncUser } from "@/lib/user-auth";
import SongPlayer from "./SongPlayer";
import styles from "./show-feedback.module.css";
export const dynamic = "force-dynamic";

interface ShowFeedbackPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ShowFeedbackPage({ params }: ShowFeedbackPageProps) {
  const { slug } = await params;
  const db = await getDb();
  const dbUser = await syncUser();
  const userId = dbUser?.id;

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
  const getAverage = (key: 'overall') => {
    const ratings = song.feedbacks.map(f => f[key] as number).filter(r => r > 0);
    if (ratings.length === 0) return null;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  };

  const formatSeconds = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m === 0) return `${s} שנ'`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const averages = {
    overall: getAverage('overall'),
  };
  const hasAnyAverage = averages.overall !== null;

  // Resolve author genres for feedbacks
  const authorIds = Array.from(new Set(song.feedbacks.map(f => f.authorId).filter(Boolean))) as string[];
  const authors = authorIds.length > 0
    ? await db.query.users.findMany({
      where: (users, { inArray }) => inArray(users.id, authorIds),
      columns: { id: true, userGenre: true, raterScore: true }
    })
    : [];
  const authorGenreMap = new Map(authors.map(a => [a.id, a.userGenre]));
  const authorRaterScoreMap = new Map(authors.map(a => [a.id, a.raterScore]));

  // Prepare serializable feedbacks (resolve genre inline)
  const feedbacks = song.feedbacks.map(fb => ({
    id: fb.id,
    playedSeconds: fb.playedSeconds,
    createdAt: fb.createdAt,
    authorGenre: fb.authorId ? (authorGenreMap.get(fb.authorId) ?? null) : null,
    authorRaterScore: fb.authorId ? (authorRaterScoreMap.get(fb.authorId) ?? 0) : 0,
    isUnlocked: fb.isUnlocked,
    isLiked: fb.isLiked,
    authorId: fb.authorId,
    overall: fb.overall,
    comment: fb.comment,
  }));

  // Listen events
  const listenData = await getListenTimeEvents(song.id);

  // Fetch current user tokens
  const currentUserRecord = userId
    ? await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      columns: { tokens: true }
    })
    : null;
  return (
    <div className={styles.container}>
      <div className={styles.blob} />

      <main className={`${styles.main} ${!userId ? styles.blurred : ""}`}>
        <div className={styles.card}>
          <div className={styles.topHeader}>
            <ManualBackButton className={styles.backButton} />

            <div className={styles.titleRow}>
              <h1 className={styles.title}>{song.title}</h1>
            </div>
          </div>
          <SongPlayer url={song.url} className={styles.playerOverride} />

          {hasAnyAverage && (
            <div className={styles.averagesGrid}>
              {averages.overall && (
                <div className={styles.averageItem}>
                  <span className={styles.avgLabel}>דירוג ממוצע לשיר:</span>
                  <span className={styles.avgValue}>{averages.overall}</span>
                </div>
              )}
              {listenData.avgSeconds > 0 && (
                <div className={styles.averageItem}>
                  <span className={styles.avgLabel}>זמן האזנה ממוצע:</span>
                  <span className={styles.avgValue}>
                    {formatSeconds(listenData.avgSeconds)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <FeedbackTabs
          feedbacks={feedbacks}
          listenEvents={listenData.events ?? []}
          currentTokens={currentUserRecord?.tokens ?? 0}
          isOwner={isOwner}
        />

        <DashboardLink />
      </main>

      {!userId && (
        <AuthOverlay
          redirectUrl={`/show-feedback/${slug}`}
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
