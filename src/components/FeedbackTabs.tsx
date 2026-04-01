"use client";

import { useState, useTransition } from "react";
import styles from "@/app/show-feedback/[slug]/show-feedback.module.css";
import ListenTimeTab from "@/components/ListenTimeTab";
import { Lock, Loader2 } from "lucide-react";
import { unlockFeedback } from "@/app/actions/feedback";
import { UNLOCK_FEEDBACK_COST } from "@/lib/constants";
import Link from "next/link";

interface FeedbackItem {
  id: string;
  playedSeconds: number | null;
  createdAt: string;
  authorGenre: string | null;
  isUnlocked: boolean;
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
  currentTokens: number;
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
  currentTokens,
  initialTab = "feedbacks",
}: FeedbackTabsProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isPending, startTransition] = useTransition();
  const [errorIds, setErrorIds] = useState<Record<string, string>>({});
  const [optimisticUnlocked, setOptimisticUnlocked] = useState<Set<string>>(new Set());

  const handleUnlock = async (feedbackId: string) => {
    if (isPending) return;

    startTransition(async () => {
      try {
        const result = await unlockFeedback(feedbackId);
        if (result.success) {
          // Trigger navbar update
          window.dispatchEvent(new CustomEvent("tokens-updated"));
          setOptimisticUnlocked(prev => new Set(prev).add(feedbackId));
        } else {
          if (result.error === 'INSUFFICIENT_CREDITS') {
            setErrorIds(prev => ({ ...prev, [feedbackId]: result.error }));
          } else {
            // "Fail open" - if it's a system error, just unlock it locally
            setOptimisticUnlocked(prev => new Set(prev).add(feedbackId));
          }
        }
      } catch {
        // "Fail open" for server actions failures
        setOptimisticUnlocked(prev => new Set(prev).add(feedbackId));
      }
    });
  };

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

                const isActuallyUnlocked = fb.isUnlocked || optimisticUnlocked.has(fb.id);

                return (
                  <div key={fb.id} className={`${styles.feedbackItem} ${!isActuallyUnlocked ? styles.lockedFeedback : ""}`}>
                    <div className={!isActuallyUnlocked ? styles.lockedContent : ""}>
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

                    {!isActuallyUnlocked && (
                      <div className={styles.unlockOverlay}>
                        {errorIds[fb.id] === 'INSUFFICIENT_CREDITS' ? (
                          <div>
                            <Link
                              href="/give-feedback"
                              style={{ textDecoration: 'underline', color: 'var(--brand-primary)', display: 'block', textAlign: 'center', fontSize: '0.95rem', fontWeight: 800 }}
                            >
                              <div style={{ marginBottom: '1rem' }}>להצגת הפידבק דרושים {UNLOCK_FEEDBACK_COST} תווי קרדיט</div>
                              <div style={{ marginBottom: '1rem' }}>יש לכם {currentTokens}</div>
                              <div>תנו פידבק לאחרים כדי לקבל עוד קרדיט</div>
                            </Link>
                          </div>
                        ) : (
                          <>
                            <h4 className={styles.unlockTitle}>פידבק חדש</h4>
                            <button
                              className={styles.unlockBtn}
                              onClick={() => handleUnlock(fb.id)}
                              disabled={isPending}
                            >
                              {isPending ? (
                                <Loader2 className={`${styles.lockIcon} animate-spin`} />
                              ) : (
                                <Lock className={styles.lockIcon} />
                              )}
                              לחצו כאן לצפיה בפידבק
                            </button>
                          </>
                        )}
                      </div>
                    )}
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
