"use client";

import { useState } from "react";
import styles from "@/app/show-feedback/[slug]/show-feedback.module.css";
import ListenTimeTab from "@/components/ListenTimeTab";

interface FeedbackItem {
  id: string;
  playedSeconds: number | null;
  createdAt: string;
  authorGenre: string | null;
  cat2: number | null;
  cat3: number | null;
  overall: number | null;
  comment: string | null;
}

interface ListenEvent {
  id: string;
  playedSeconds: number;
  createdAt: string;
  user?: { userGenre: string | null } | null;
}

interface FeedbackTabsProps {
  feedbacks: FeedbackItem[];
  listenEvents: ListenEvent[];
  listenAvgSeconds: number;
  initialTab?: string;
}

function formatSeconds(seconds: number | null | undefined) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `זמן נגינה: ${s} שנ'`;
  return `זמן נגינה: ${m}:${s.toString().padStart(2, "0")}`;
}

export default function FeedbackTabs({
  feedbacks,
  listenEvents,
  listenAvgSeconds,
  initialTab = "feedbacks",
}: FeedbackTabsProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <>
      {/* Tab bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === "feedbacks" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("feedbacks")}
        >
          פידבקים ({feedbacks.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "listens" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("listens")}
        >
          השמעות ({listenEvents.length})
        </button>
      </div>

      {/* Feedbacks Tab */}
      {activeTab === "feedbacks" && (
        <section className={styles.feedbackSection}>
          {feedbacks.length > 0 ? (
            <div className={styles.feedbacksList}>
              <h3 className={styles.listHeading}>
                דירוגים שהתקבלו ({feedbacks.length})
              </h3>
              {feedbacks.map((fb) => {
                const genres = fb.authorGenre
                  ? fb.authorGenre.split(",").map((g) => g.trim()).filter(Boolean).slice(0, 3)
                  : [];

                return (
                  <div key={fb.id} className={styles.feedbackItem}>
                    <div className={styles.fbHeader}>
                      {(() => {
                        const formatted = formatSeconds(fb.playedSeconds);
                        return formatted ? (
                          <span className={styles.fbPlaytime}>{formatted}</span>
                        ) : (
                          <span />
                        );
                      })()}
                      <span className={styles.fbDate}>
                        {new Date(fb.createdAt).toLocaleDateString("he-IL")}
                      </span>
                    </div>

                    <div className={styles.fbRaterGenre}>
                      סגנון מאזין:{" "}
                      <span className={styles.genreList}>
                        {genres.length > 0 ? genres.join(", ") : "לא הוגדר"}
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
                );
              })}
            </div>
          ) : (
            <div className={styles.noFeedback}>עדיין אין פידבקים לשיר זה.</div>
          )}
        </section>
      )}

      {/* Listens Tab */}
      {activeTab === "listens" && (
        <ListenTimeTab
          events={listenEvents}
          avgSeconds={listenAvgSeconds}
        />
      )}
    </>
  );
}
