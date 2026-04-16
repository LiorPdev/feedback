"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import ListenTimeTab from "@/components/ListenTimeTab";
import RaterScoreInfo from "@/components/RaterScoreInfo";
import { Eye, Loader2 } from "lucide-react";
import { unlockFeedback } from "@/app/actions/feedback";
import { UNLOCK_FEEDBACK_COST, LIKE_FEEDBACK_REWARD } from "@/lib/constants";
import Link from "next/link";
import styles from "./FeedbackTabs.module.css";
import { Heart } from "lucide-react";
import { likeFeedback, unlikeFeedback } from "@/app/actions/feedback";
import Tooltip from "@/components/Tooltip";

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
  authorRaterScore?: number;
  isLiked?: boolean;
  authorId?: string | null;
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
  isOwner?: boolean;
  initialTab?: string;
}
function formatSeconds(seconds: number | null | undefined) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const label = <strong className={styles.fbLabel}>זמן השמעה:</strong>;
  if (m === 0) return <>{label} {s} שנ&apos;</>;
  return <>{label} {m}:{s.toString().padStart(2, "0")}</>;
}



export default function FeedbackTabs({
  feedbacks,
  listenEvents,
  listenAvgSeconds,
  currentTokens,
  isOwner = false,
  initialTab = "feedbacks",
}: FeedbackTabsProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isPending, startTransition] = useTransition();
  const [errorIds, setErrorIds] = useState<Record<string, string>>({});
  const [optimisticUnlocked, setOptimisticUnlocked] = useState<Set<string>>(new Set());
  const [optimisticLiked, setOptimisticLiked] = useState<Set<string>>(new Set());
  const [showLikeTooltip, setShowLikeTooltip] = useState<string | null>(null);

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
  const handleToggleLike = async (feedbackId: string, isCurrentlyLiked: boolean) => {
    if (isPending) return;

    // Optimistically update
    if (isCurrentlyLiked) {
      setOptimisticLiked(prev => {
        const next = new Set(prev);
        next.delete(feedbackId);
        return next;
      });
      if (showLikeTooltip === feedbackId) setShowLikeTooltip(null);
    } else {
      setOptimisticLiked(prev => new Set(prev).add(feedbackId));
    }

    startTransition(async () => {
      try {
        if (isCurrentlyLiked) {
          const result = await unlikeFeedback(feedbackId);
          if (!result.success) {
            // Revert
            setOptimisticLiked(prev => new Set(prev).add(feedbackId));
          }
        } else {
          const result = await likeFeedback(feedbackId);
          if (result.success) {
            setShowLikeTooltip(feedbackId);
            setTimeout(() => setShowLikeTooltip(null), 4000);
          } else {
            // Revert
            setOptimisticLiked(prev => {
              const next = new Set(prev);
              next.delete(feedbackId);
              return next;
            });
          }
        }
      } catch {
        // Revert on error
        if (isCurrentlyLiked) {
          setOptimisticLiked(prev => new Set(prev).add(feedbackId));
        } else {
          setOptimisticLiked(prev => {
            const next = new Set(prev);
            next.delete(feedbackId);
            return next;
          });
        }
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
              {feedbacks.map((fb) => {
                const genres = fb.authorGenre
                  ? fb.authorGenre.split(",").map((g) => g.trim()).filter(Boolean).slice(0, 3)
                  : [];

                const isActuallyUnlocked = fb.isUnlocked || optimisticUnlocked.has(fb.id);

                return (
                  <div key={fb.id} className={`${styles.feedbackItem} ${!isActuallyUnlocked ? styles.lockedFeedback : ""}`}>
                    <div className={!isActuallyUnlocked ? styles.lockedContent : ""}>
                      {(() => {
                        const formatted = formatSeconds(fb.playedSeconds);
                        return (
                          <div className={styles.fbHeader}>
                            {formatted && <span className={styles.fbPlaytime}>{formatted}</span>}
                            <span className={styles.fbDate}>
                              {new Date(fb.createdAt).toLocaleDateString("he-IL")}
                            </span>
                          </div>
                        );
                      })()}

                      <div className={styles.fbAuthorInfo}>
                        {genres.length > 0 && (
                          <div className={styles.fbRaterGenre}>
                            <strong className={styles.fbLabel}>סגנון המדרג:</strong>{" "}
                            <span className={styles.genreList}>
                              {genres.join(", ")}
                            </span>
                          </div>
                        )}
                        <RaterScoreInfo
                          score={fb.authorRaterScore}
                          variant="plain"
                          className={styles.fbRaterScore}
                        />
                      </div>

                      {((fb.cat2 || 0) > 0 || (fb.cat3 || 0) > 0 || (fb.overall || 0) > 0) && (
                        <div className={styles.fbRatingsRow}>
                          <strong className={styles.fbRatingLabel}>דירוג:</strong>
                          <span><strong className={styles.fbLabel}>הפקה:</strong>{fb.cat2}</span>
                          <span><strong className={styles.fbLabel}>שירה:</strong>{fb.cat3}</span>
                          <span className={styles.fbOverallBadge}><strong className={styles.fbLabel}>כללי:</strong>{fb.overall}</span>
                        </div>
                      )}
                      <p className={styles.fbComment}>
                        {fb.comment?.split(/(\*\*.*?\*\*)/g).map((part, i) => (
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={i}>{part.slice(2, -2)}</strong>
                            : part
                        ))}
                      </p>

                      {isOwner && isActuallyUnlocked && (fb.authorId) && (
                        <div className={styles.fbFooter}>
                          <div className={styles.likeBtnContainer}>
                            <motion.button
                              className={`${styles.likeBtn} ${fb.isLiked || optimisticLiked.has(fb.id) ? styles.liked : ""}`}
                              onClick={() => handleToggleLike(fb.id, fb.isLiked || optimisticLiked.has(fb.id))}
                              disabled={isPending}
                              title={(fb.isLiked || optimisticLiked.has(fb.id)) ? "ביטול" : "תודה, זה עזר לי"}
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 2 }}
                              transition={{ type: "spring", stiffness: 200, damping: 10 }}
                            >
                              <Heart size={18} fill={(fb.isLiked || optimisticLiked.has(fb.id)) ? "currentColor" : "none"} />
                            </motion.button>
                            <Tooltip
                              show={showLikeTooltip === fb.id}
                              message={`כותב המשוב תוגמל ב-${LIKE_FEEDBACK_REWARD} נק' קרדיט!`}
                              align="left"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {!isActuallyUnlocked && (
                      <div className={styles.unlockOverlay}>
                        {errorIds[fb.id] === 'INSUFFICIENT_CREDITS' ? (
                          <div>
                            <div className={styles.unlockErrorText}>להצגת הפידבק דרושים {UNLOCK_FEEDBACK_COST} תווי קרדיט</div>
                            <div className={styles.unlockErrorText}>יש לכם {currentTokens}</div>
                            <Link
                              href="/give-feedback"
                              className={styles.giveFeedbackLink}
                            >
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
                                <Eye className={styles.lockIcon} />
                              )}
                              <span className={styles.blinkText}>לחצו כאן לצפיה בפידבק</span>
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
