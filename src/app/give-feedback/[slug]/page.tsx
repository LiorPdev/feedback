import { getDb } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import styles from "./give-feedback.module.css";
import Link from "next/link";
import { ArrowLeft, Music, Calendar, Disc, Star } from "lucide-react";
import FeedbackForm from "@/components/FeedbackForm";
import { auth } from "@clerk/nextjs/server";

interface GiveFeedbackPageProps {
  params: {
    slug: string;
  };
}

export default async function GiveFeedbackPage({ params }: GiveFeedbackPageProps) {
  const { slug } = await params;
  const db = getDb(process);
  const { userId } = await auth();

  const song = await db.song.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          name: true,
        },
      },
      feedbacks: {
        orderBy: {
          createdAt: 'desc'
        }
      }
    },
  });

  if (!song) {
    notFound();
  }

  // If owner tries to give feedback, redirect to results
  if (userId === song.userId) {
    redirect(`/show-feedback/${slug}`);
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
          <FeedbackForm songId={song.id} />
          
          {song.feedbacks.length > 0 && (
            <div className={styles.feedbacksList}>
              <h3 className={styles.listHeading}>ביקורות קודמות ({song.feedbacks.length})</h3>
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
          )}
        </section>

        <Link href="/dashboard" className={styles.homeLink}>
          <ArrowLeft size={16} /> חזרה למרחב האישי
        </Link>
      </main>
    </div>
  );
}
