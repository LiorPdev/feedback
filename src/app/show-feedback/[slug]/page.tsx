import { getDb } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import styles from "./show-feedback.module.css";
import Link from "next/link";
import { Music, Calendar, Disc } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import DashboardLink from "@/components/DashboardLink";


interface ShowFeedbackPageProps {
  params: Promise<{
    slug: string;
  }>;
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

  // If NOT owner tries to view results, send them to give feedback
  if (!isOwner) {
    redirect(`/give-feedback/${slug}`);
  }

  return (
    <div className={styles.container}>
      <div className={styles.blob} />

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.iconWrapper}>
            <Music size={40} strokeWidth={1.5} />
          </div>

          <h1 className={styles.title}>{song.title}</h1>

          <div className={styles.stats}>
            <div className={styles.statItem}>
              <Disc size={18} />
              <span>{song.genre}</span>
            </div>
            <div className={styles.statItem}>
              <Calendar size={18} />
              <span>{new Date(song.createdAt).toLocaleDateString('he-IL')}</span>
            </div>
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
                  <div className={styles.fbMeta}>
                    <div className={styles.fbRatingsRow}>
                      <span>מילים: {fb.lyrics}</span>
                      <span>לחן: {fb.composition}</span>
                      <span>הפקה: {fb.production}</span>
                      <span className={styles.fbOverallBadge}>כללי: {fb.overall}</span>
                    </div>
                    <span className={styles.fbDate}>
                      {new Date(fb.createdAt).toLocaleDateString('he-IL')}
                    </span>
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
    </div>
  );
}
