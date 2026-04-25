"use client";

import styles from "./ListenTimeTab.module.css";

interface ListenEvent {
  id: string;
  playedSeconds: number;
  createdAt: string;
  user?: { userGenre: string | null } | null;
}

interface ListenTimeTabProps {
  events: ListenEvent[];
}

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0 שנ'";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} שנ'`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ListenTimeTab({ events }: ListenTimeTabProps) {
  if (events.length === 0) {
    return (
      <section className={styles.feedbackSection}>
        <div className={styles.noFeedback}>
          עדיין אין השמעות לשיר זה.
        </div>
      </section>
    );
  }

  return (
    <section className={styles.feedbackSection}>


      {/* Events list */}
      <div className={styles.feedbacksList}>
        {events.map((ev) => {
          const genres = ev.user?.userGenre
            ? ev.user.userGenre.split(',').map((g: string) => g.trim()).filter(Boolean).slice(0, 3)
            : [];

          return (
            <div key={ev.id} className={styles.feedbackItem}>
              <div className={styles.fbHeader}>
                <div className={styles.headerMetrics}>
                  <span className={styles.listenDuration}>
                    זמן האזנה: {formatDuration(ev.playedSeconds)}
                  </span>
                </div>
                <span className={styles.fbDate}>
                  {new Date(ev.createdAt).toLocaleDateString("he-IL")}
                </span>
              </div>
              <div className={styles.fbRaterGenre}>
                סגנון המאזין: <span className={styles.genreList}>{genres.length > 0 ? genres.join(', ') : "לא הוגדר"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
