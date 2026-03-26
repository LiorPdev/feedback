import { getDb } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import styles from "./show-feedback.module.css";
import BackButton from "@/components/BackButton";
import { auth } from "@clerk/nextjs/server";
import DashboardLink from "@/components/DashboardLink";
import ShareSongButton from "@/components/ShareSongButton";
import SongPlayer from "./SongPlayer";
import { SignInButton } from "@clerk/nextjs";
import { LogIn } from "lucide-react";

interface ShowFeedbackPageProps {
  params: Promise<{
    slug: string;
  }>;
}

function formatSeconds(seconds: number | null | undefined) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `זמן נגינה: ${s} שנ'`;
  return `זמן נגינה: ${m}:${s.toString().padStart(2, '0')}`;
}

export default async function ShowFeedbackPage({ params }: ShowFeedbackPageProps) {
  const { slug } = await params;
  const db = await getDb();
  const { userId } = await auth();

  const song = await db.query.songs.findFirst({
    where: (songs, { eq }) => eq(songs.slug, slug),
    with: {
      user: {
        columns: {
          name: true,
        },
      },
      feedbacks: {
        orderBy: (feedbacks, { desc }) => [desc(feedbacks.createdAt)]
      }
    },
  });

  if (!song) {
    notFound();
  }

  const isOwner = userId === song.userId;

  // If AUTHENTICATED but NOT owner, send them to give feedback
  if (userId && !isOwner) {
    redirect(`/give-feedback/${slug}`);
  }

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

  return (
    <div className={styles.container}>
      <div className={styles.blob} />

      <main className={`${styles.main} ${!userId ? styles.blurred : ""}`}>
        <div className={styles.card}>
          <BackButton
            href="/dashboard"
            title="חזרה לאיזור האישי"
            className={styles.backButton}
          />
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
              <p className={styles.weightedNote}>* ממוצע משוקלל של הדירוגים</p>
            </div>
          )}

          <div className={styles.shareWrapper}>
            <ShareSongButton slug={song.slug} variant="large" />
          </div>
        </div>

        <section className={styles.feedbackSection}>
          {song.feedbacks.length > 0 ? (
            <div className={styles.feedbacksList}>
              <h3 className={styles.listHeading}>
                דירוגים שהתקבלו ({song.feedbacks.length})
              </h3>
              {song.feedbacks.map((fb) => (
                <div key={fb.id} className={styles.feedbackItem}>
                  <div className={styles.fbHeader}>
                    {(() => {
                      const formatted = formatSeconds(fb.playedSeconds);
                      return formatted ? (
                        <span className={styles.fbPlaytime}>{formatted}</span>
                      ) : <span />;
                    })()}
                    <span className={styles.fbDate}>
                      {new Date(fb.createdAt).toLocaleDateString('he-IL')}
                    </span>
                  </div>

                  <div className={styles.fbRatingsRow}>
                    <span className={styles.fbRatingLabel}>דירוג:</span>
                    <span>הפקה: {fb.cat2}</span>
                    <span>שירה: {fb.cat3}</span>
                    <span className={styles.fbOverallBadge}>כללי: {fb.overall}</span>
                  </div>
                  <p className={styles.fbComment}>{fb.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noFeedback}>עדיין אין פידבקים לשיר זה.</div>
          )}
        </section>

        <DashboardLink />
      </main>

      {!userId && (
        <div className={styles.authOverlay}>
          <div className={styles.authContent}>
            <p className={styles.subHeading}>
              כדי לצפות בפידבקים ובתובנות על השיר שלך, יש להתחבר למערכת.
              הגישה לתוצאות מורשית לבעלי השיר בלבד.
            </p>
            <SignInButton mode="modal">
              <button className={styles.loginBtn}>
                <LogIn size={20} />
                <span>התחברות למערכת</span>
              </button>
            </SignInButton>
          </div>
        </div>
      )}
    </div>
  );
}
