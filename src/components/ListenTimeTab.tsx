"use client";

import styles from "./ListenTimeTab.module.css";
import { Headphones, Clock } from "lucide-react";

interface ListenEvent {
  id: string;
  playedSeconds: number;
  createdAt: string;
  user?: { userGenre: string | null } | null;
}

interface ListenTimeTabProps {
  events: ListenEvent[];
  avgSeconds: number;
}

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0 שנ'";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} שנ'`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ListenTimeTab({ events, avgSeconds }: ListenTimeTabProps) {
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
      {/* Summary stat */}
      <div className={styles.listenSummary}>
        <div className={styles.listenSummaryItem}>
          <Headphones size={20} className={styles.listenSummaryIcon} />
          <div>
            <div className={styles.listenSummaryValue}>{events.length}</div>
            <div className={styles.listenSummaryLabel}>השמעות</div>
          </div>
        </div>
        <div className={styles.listenSummaryDivider} />
        <div className={styles.listenSummaryItem}>
          <Clock size={20} className={styles.listenSummaryIcon} />
          <div>
            <div className={styles.listenSummaryValue}>{formatDuration(avgSeconds)}</div>
            <div className={styles.listenSummaryLabel}>ממוצע האזנה</div>
          </div>
        </div>
      </div>

      {/* Events list */}
      <div className={styles.feedbacksList}>
        {events.map((ev) => {
          const genres = ev.user?.userGenre
            ? ev.user.userGenre.split(',').map((g: string) => g.trim()).filter(Boolean).slice(0, 3)
            : [];

          return (
            <div key={ev.id} className={styles.feedbackItem}>
              <div className={styles.fbHeader}>
                <span className={styles.listenDuration}>
                  <Clock size={13} style={{ display: 'inline', marginLeft: '6px', verticalAlign: 'middle', transform: 'translateY(-1px)' }} />
                  {formatDuration(ev.playedSeconds)}
                </span>
                <span className={styles.fbDate}>
                  {new Date(ev.createdAt).toLocaleDateString('he-IL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
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
