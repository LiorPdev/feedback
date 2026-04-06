"use client";

import { useState, useTransition, useRef } from "react";
import ListenTimeTab from "@/components/ListenTimeTab";
import InfoTooltip from "@/components/InfoTooltip";
import { Eye, Loader2, HelpCircle } from "lucide-react";
import { unlockFeedback } from "@/app/actions/feedback";
import { UNLOCK_FEEDBACK_COST } from "@/lib/constants";
import Link from "next/link";
import styles from "@/app/show-feedback/[slug]/show-feedback.module.css";

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
  const label = <strong className={styles.fbLabel}>זמן השמעה:</strong>;
  if (m === 0) return <>{label} {s} שנ&apos;</>;
  return <>{label} {m}:{s.toString().padStart(2, "0")}</>;
}

function RaterScoreInfo({ score }: { score: number | null | undefined }) {
  const [showInfo, setShowInfo] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Format score: show "אין דירוג" if 0 or undefined, otherwise show X.X/5
  const displayScore = (score && score > 0) ? score.toFixed(1) : "אין דירוג";

  return (
    <span className={styles.fbRaterScore}>
      <strong className={styles.fbLabel}>איכות המדרג:</strong> {displayScore}
      <button
        ref={triggerRef}
        className={styles.infoTriggerIcon}
        onClick={() => setShowInfo(!showInfo)}
        title="איך זה מחושב?"
      >
        <HelpCircle size={14} />
      </button>

      <InfoTooltip
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        triggerRef={triggerRef}
        title="איך זה מחושב?"
        align="right"
        arrowPosition="center"
        width={200}
        content={
          <div className={styles.tooltipContent}>
            <ul className={styles.formulaLegend}>
              <li><strong>40%</strong> - מתן הסבר לצד דירוג</li>
              <li><strong>30%</strong> - רמת הפירוט בטקסט</li>
              <li><strong>20%</strong> - קרבה לדירוג הכללי</li>
              <li><strong>10%</strong> - ותק וכמות הדירוגים</li>
            </ul>
            <p>הציון המקסימלי הוא 5</p>
          </div>
        }
      />
    </span>
  );
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
                            <strong className={styles.fbLabel}>סגנון מאזין:</strong>{" "}
                            <span className={styles.genreList}>
                              {genres.join(", ")}
                            </span>
                          </div>
                        )}
                        <RaterScoreInfo score={fb.authorRaterScore} />
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
