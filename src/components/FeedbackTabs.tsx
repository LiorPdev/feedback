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
import { Heart, Meh } from "lucide-react";
import { setFeedbackReaction } from "@/app/actions/feedback";
import Tooltip from "@/components/Tooltip";
import { getRatingText } from "@/lib/utils";

interface FeedbackItem {
  id: string;
  playedSeconds: number | null;
  createdAt: string;
  authorGenre: string | null;
  isUnlocked: boolean;
  overall: number | null;
  comment: string | null;
  authorRaterScore?: number;
  isLiked?: number;
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
  currentTokens: number;
  isOwner?: boolean;
  initialTab?: string;
}
function formatSeconds(seconds: number | null | undefined) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} שנ'`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function FeedbackTabs({
  feedbacks,
  listenEvents,
  currentTokens,
  isOwner = false,
  initialTab = "feedbacks",
}: FeedbackTabsProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isPending, startTransition] = useTransition();
  const [errorIds, setErrorIds] = useState<Record<string, string>>({});
  const [optimisticUnlocked, setOptimisticUnlocked] = useState<Set<string>>(new Set());
  const [optimisticReactions, setOptimisticReactions] = useState<Record<string, number>>({});
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
  const handleSetReaction = async (feedbackId: string, newReaction: -1 | 0 | 1) => {
    if (isPending) return;

    // Optimistically update
    setOptimisticReactions(prev => ({ ...prev, [feedbackId]: newReaction }));

    if (newReaction === 1) {
      setShowLikeTooltip(feedbackId);
      setTimeout(() => setShowLikeTooltip(null), 3000);
    } else if (showLikeTooltip === feedbackId) {
      setShowLikeTooltip(null);
    }

    startTransition(async () => {
      try {
        const result = await setFeedbackReaction(feedbackId, newReaction);
        if (result.success) {
          // Trigger navbar update
          window.dispatchEvent(new CustomEvent("tokens-updated"));
        } else {
          // Revert optimistic update
          setOptimisticReactions(prev => {
            const next = { ...prev };
            delete next[feedbackId];
            return next;
          });
        }
      } catch {
        // Revert optimistic update
        setOptimisticReactions(prev => {
          const next = { ...prev };
          delete next[feedbackId];
          return next;
        });
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
                      <div className={styles.fbHeader}>
                        <div className={styles.headerMetrics}>
                          {isOwner && isActuallyUnlocked && (fb.overall || 0) > 0 && (
                            <span className={styles.overallRate}>
                              התרשמות כללית: {getRatingText(fb.overall!)}
                            </span>
                          )}
                          {(() => {
                            const formatted = formatSeconds(fb.playedSeconds);
                            return formatted ? (
                              <span className={styles.metaText}>
                                זמן האזנה: {formatted}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <span className={styles.metaText}>
                          {new Date(fb.createdAt).toLocaleDateString("he-IL")}
                        </span>
                      </div>

                      <div className={styles.fbAuthorInfo}>
                        {genres.length > 0 && (
                          <div className={styles.metaText} style={{ marginBottom: "1rem" }}>
                            סגנון המדרג:{" "}
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

                      <p className={styles.fbComment}>
                        {fb.comment?.split(/(\*\*.*?\*\*)/g).map((part, i) => (
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={i}>{part.slice(2, -2)}</strong>
                            : part
                        ))}
                      </p>

                      {isOwner && isActuallyUnlocked && (fb.authorId) && (
                        <div className={styles.fbFooter}>
                          <div /> {/* Spacer to maintain flex layout */}
                          <div className={styles.likeBtnContainer}>
                            <motion.button
                              className={`${styles.likeBtn} ${(optimisticReactions[fb.id] !== undefined ? optimisticReactions[fb.id] === 1 : fb.isLiked === 1) ? styles.liked : ""
                                }`}
                              onClick={() => {
                                const currentReaction = optimisticReactions[fb.id] !== undefined ? optimisticReactions[fb.id] : (fb.isLiked || 0);
                                handleSetReaction(fb.id, currentReaction === 1 ? 0 : 1);
                              }}
                              disabled={isPending}
                              title={(optimisticReactions[fb.id] !== undefined ? optimisticReactions[fb.id] === 1 : fb.isLiked === 1) ? "ביטול" : "סמנו אהבתי רק אם הפידבק קידם אתכם או עזר לכם בפועל"}
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 2 }}
                              transition={{ type: "spring", stiffness: 200, damping: 10 }}
                            >
                              <Heart size={18} fill={(optimisticReactions[fb.id] !== undefined ? optimisticReactions[fb.id] === 1 : fb.isLiked === 1) ? "currentColor" : "none"} />
                            </motion.button>
                            <motion.button
                              className={styles.likeBtn}
                              style={{
                                marginRight: '8px',
                                color: (optimisticReactions[fb.id] !== undefined ? optimisticReactions[fb.id] === -1 : fb.isLiked === -1) ? "#ef4444" : "var(--text-muted)"
                              }}
                              onClick={() => {
                                const currentReaction = optimisticReactions[fb.id] !== undefined ? optimisticReactions[fb.id] : (fb.isLiked || 0);
                                handleSetReaction(fb.id, currentReaction === -1 ? 0 : -1);
                              }}
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 2 }}
                              title="הפידבק לא כל כך עזר לי"
                              disabled={isPending}
                            >
                              <Meh size={18} />
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
        />
      )}
    </>
  );
}
