"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Star, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { addFeedback } from "@/app/actions/songs";
import { REWARD_PRODUCTION, REWARD_VOCALS, REWARD_OVERALL, REWARD_COMMENT, MIN_COMMENT_LENGTH, SUCCESS_MESSAGE_DURATION } from "@/lib/constants";
import styles from "./FeedbackForm.module.css";
import AnimatedTokenCounter from "./AnimatedTokenCounter";
import AuthOverlay from "./AuthOverlay";

interface FeedbackFormProps {
  songId: string;
  onSuccess?: (feedback: unknown, stats?: { averageRating: number; totalFeedbacks: number }) => void;
  getPlayedSeconds?: () => Promise<number>;
  isPlaying?: boolean;
  isDisabled?: boolean;
  disabledMessage?: string;
  initialSource?: string;
  onAuthDismiss?: () => void;
  isAuthDismissed?: boolean;
}

export default function FeedbackForm({
  songId,
  onSuccess,
  getPlayedSeconds,
  isPlaying,
  isDisabled,
  disabledMessage,
  initialSource,
  onAuthDismiss,
  isAuthDismissed = false
}: FeedbackFormProps) {
  const { isLoaded, isSignedIn } = useUser();
  const [ratings, setRatings] = useState({
    cat2: 0,
    cat3: 0,
    overall: 0,
  });
  const [comment, setComment] = useState(initialSource === "top-rated" ? "שמעתי את השיר באיזור השירים המדורגים" : "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [flyers, setFlyers] = useState<{ id: number; x: number; y: number; tx: number; ty: number; value: number; ox?: number; oy?: number }[]>([]);
  const bucketRef = useRef<HTMLDivElement>(null);
  const flyerIdRef = useRef(0);

  const triggerFlyer = useCallback((x: number, y: number, value: number, targetX?: number, targetY?: number, initialOffsetX = 0, initialOffsetY = 0) => {
    let finalX = targetX;
    let finalY = targetY;

    if (finalX === undefined || finalY === undefined) {
      if (!bucketRef.current) return;
      const bucketRect = bucketRef.current.getBoundingClientRect();
      finalX = bucketRect.left + bucketRect.width / 2;
      finalY = bucketRect.top + bucketRect.height / 2;
    }

    const id = ++flyerIdRef.current;

    // Add jitter to start and end positions so multiple flyers are visible
    const jitter = () => (Math.random() - 0.5) * 10;

    setFlyers(prev => [...prev, {
      id,
      x: x + jitter(),
      y: y + jitter(),
      tx: finalX + jitter(),
      ty: finalY + jitter(),
      ox: initialOffsetX,
      oy: initialOffsetY,
      value
    }]);

    // Cleanup after animation finishes (safety timeout)
    setTimeout(() => {
      setFlyers(prev => prev.filter(f => f.id !== id));
    }, 2000);
  }, []);

  const [listenCredits, setListenCredits] = useState(0);
  const playRewardGivenRef = useRef(false);
  const playTimeSecondsRef = useRef(0);

  useEffect(() => {
    if (isPlaying && !playRewardGivenRef.current) {
      playRewardGivenRef.current = true;
      setTimeout(() => setListenCredits(prev => prev + 1), 0);

      if (bucketRef.current) {
        const bucketRect = bucketRef.current.getBoundingClientRect();
        triggerFlyer(bucketRect.left + bucketRect.width / 2, bucketRect.top - 80, 1, bucketRect.left + bucketRect.width / 2, bucketRect.top + bucketRect.height / 2, -40, 50);
      }
    }

    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        playTimeSecondsRef.current += 1;

        if (playTimeSecondsRef.current >= 5) {
          playTimeSecondsRef.current = 0; // Reset for the next 5s block
          setListenCredits(prev => prev + 1);

          if (bucketRef.current) {
            const bucketRect = bucketRef.current.getBoundingClientRect();
            triggerFlyer(bucketRect.left + bucketRect.width / 2, bucketRect.top - 80, 1, bucketRect.left + bucketRect.width / 2, bucketRect.top + bucketRect.height / 2, -40, 50);
          }
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, triggerFlyer]);

  // Form resets automatically when song changes because key={songId} is used in parent

  // Handle success auto-hide
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        setStatus("idle");
      }, SUCCESS_MESSAGE_DURATION);
      return () => clearTimeout(timer);
    }
  }, [status]);


  const categories = [
    { key: "cat2" as const, name: "הפקה", reward: REWARD_PRODUCTION },
    { key: "cat3" as const, name: "שירה", reward: REWARD_VOCALS },
    { key: "overall" as const, name: "ציון כללי", reward: REWARD_OVERALL },
  ];

  const handleRating = (key: keyof typeof ratings, value: number, e?: React.MouseEvent | React.TouchEvent) => {
    // Determine if we're gaining a new point for this category (from 0 to >0)
    const isGaining = ratings[key] === 0 && value > 0;
    const isSettingToZero = ratings[key] === value;

    setRatings((prev) => ({
      ...prev,
      [key]: isSettingToZero ? 0 : value
    }));


    if (status === "error") setStatus("idle");

    if (isGaining && e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const reward = categories.find(c => c.key === key)?.reward || REWARD_PRODUCTION;
      triggerFlyer(rect.left + rect.width / 2, rect.top + rect.height / 2, reward);
    }
  };

  const handleTouch = (e: React.TouchEvent, key: keyof typeof ratings) => {
    const touch = e.touches[0];
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    // In RTL, the first star (1) is on the right. 
    // We calculate the distance from the RIGHT edge of the container.
    const distanceFromRight = rect.right - touch.clientX;
    const percentage = distanceFromRight / rect.width;
    let rating = Math.ceil(percentage * 5);

    // Clamp rating between 1 and 5
    rating = Math.max(1, Math.min(5, rating));

    // Only update if it's a new value to avoid unnecessary re-renders
    if (ratings[key] !== rating) {
      handleRating(key, rating, e);
    }
  };

  const [songStats, setSongStats] = useState<{ averageRating: number; totalFeedbacks: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasRating = ratings.cat2 > 0 || ratings.cat3 > 0 || ratings.overall > 0;
    const commentTrimmed = comment.trim();
    const hasComment = commentTrimmed.length > 0;

    // Validation logic
    if (!hasRating && !hasComment) {
      setStatus("error");
      setErrorMsg("אנא דרגו לפחות קטגוריה אחת ו/או כתבו תגובה כדי לשלוח פידבק.");
      return;
    }

    if (hasComment && commentTrimmed.length < MIN_COMMENT_LENGTH) {
      setStatus("error");
      setErrorMsg(`התגובה קצרה מדי. אם בחרתם לכתוב תגובה, היא חייבת להכיל לפחות ${MIN_COMMENT_LENGTH} תווים.`);
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    let playedSeconds = 0;
    if (getPlayedSeconds) {
      playedSeconds = await getPlayedSeconds();
    }

    try {
      const result = await addFeedback({
        songId,
        cat2: ratings.cat2,
        cat3: ratings.cat3,
        overall: ratings.overall,
        comment: commentTrimmed,
        playedSeconds,
        listenCredits,
      });

      if (result.success) {
        // --- ADDED BUCKET -> NAVBAR ANIMATION --- //
        const navTokenElement = document.querySelector('[class*="tokenDisplay"]');
        if (navTokenElement && bucketRef.current && currentCredits > 0) {
          const navRect = navTokenElement.getBoundingClientRect();
          const bucketRect = bucketRef.current.getBoundingClientRect();

          triggerFlyer(
            bucketRect.left + bucketRect.width / 2,
            bucketRect.top + bucketRect.height / 2,
            currentCredits,
            navRect.left + navRect.width / 2,
            navRect.top + navRect.height / 2
          );
        }

        if (result.averageRating !== undefined) {
          setSongStats({
            averageRating: result.averageRating,
            totalFeedbacks: result.totalFeedbacks || 0
          });
        }

        if (!isPlaying) {
          setStatus("success");
          setTimeout(() => {
            setStatus("idle");
            setSongStats(null);
          }, SUCCESS_MESSAGE_DURATION);
        } else {
          setStatus("idle");
        }
        // Reset form immediately on success
        setRatings({
          cat2: 0,
          cat3: 0,
          overall: 0,
        });
        setComment("");
        onSuccess?.(result.feedback, {
          averageRating: result.averageRating as number,
          totalFeedbacks: result.totalFeedbacks as number
        });
        // Dispatch custom event to notify Navbar or other components
        window.dispatchEvent(new CustomEvent("tokens-updated"));
      } else {
        setStatus("error");
        setErrorMsg(result.error || "משהו השתבש בשליחת הפידבק.");
      }
    } catch {
    }
  };

  // Calculate live earned credits
  const earnedFromCategories = categories.reduce((sum, cat) => sum + (ratings[cat.key] > 0 ? cat.reward : 0), 0);
  const commentLength = comment.trim().length;
  const hasValidComment = commentLength >= MIN_COMMENT_LENGTH;
  const currentCredits = earnedFromCategories + (hasValidComment ? REWARD_COMMENT : 0) + listenCredits;

  if (!isLoaded) {
    return (
      <div className={styles.form}>
        <div className={styles.spinnerContainer}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      {/* Container for the form that gets blurred when unauthenticated */}
      <div className={(!isSignedIn && !isAuthDismissed) ? styles.blurred : ""}>
        <AnimatePresence>
          {status === "success" && (
            <div className={styles.successOverlay} onClick={() => setStatus("idle")}>
              <motion.div
                className={styles.successPopup}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className={styles.closeBtn}
                  onClick={() => setStatus("idle")}
                  aria-label="סגור"
                >
                  <X size={20} />
                </button>
                <div className={`${styles.successHeader} ${songStats ? styles.successHeaderWithStats : ""}`}>
                  <span className={styles.successTitle}>תודה על הפידבק!</span>
                </div>

                {songStats && (
                  <div className={styles.successStats}>
                    <p className={styles.successScoreLabel}>
                      דירוג מאזינים ממוצע: <span className={styles.successScoreValue}>{songStats.averageRating.toFixed(1)}</span>
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {status === "error" && (
            <div className={styles.errorOverlay} onClick={() => setStatus("idle")}>
              <motion.div
                className={styles.errorPopup}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className={styles.closeBtn}
                  onClick={() => setStatus("idle")}
                  aria-label="סגור"
                >
                  <X size={20} />
                </button>
                <div className={styles.errorHeader}>
                  <AlertCircle size={24} className={styles.errorIcon} />
                  <span className={styles.errorTitle}>שימו לב</span>
                </div>
                <div className={styles.errorContent}>{errorMsg}</div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit}>
          <div className={styles.ratingGrid}>
            {categories.map((cat) => (
              <div key={cat.key} className={styles.ratingGroup}>
                <label className={styles.ratingLabel}>
                  {cat.name}
                </label>
                <div
                  className={styles.stars}
                  onTouchMove={(e) => handleTouch(e, cat.key)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`${styles.starBtn} ${ratings[cat.key] >= star ? styles.starFilled : ""}`}
                      onClick={(e) => handleRating(cat.key, star, e)}
                    >
                      <Star
                        size={18 + (star - 1) * 1.5}
                        fill={ratings[cat.key] >= star ? "currentColor" : "none"}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.commentGroup}>
            <div className={styles.textareaWrapper}>
              <textarea
                className={styles.textarea}
                placeholder={`נסו להוסיף כמה מילים על מה שאהבתם או מה אפשר לשפר.`}
                value={comment}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const wasValid = comment.trim().length >= MIN_COMMENT_LENGTH;
                  const isValid = newValue.trim().length >= MIN_COMMENT_LENGTH;

                  if (!wasValid && isValid) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    triggerFlyer(rect.left + rect.width / 2, rect.top + rect.height / 2, REWARD_COMMENT);
                  }

                  setComment(newValue);
                  if (status === "error") setStatus("idle");
                }}
              />
              <div className={`${styles.charCounter} ${comment.length === 0 ? "" : (comment.length < MIN_COMMENT_LENGTH ? styles.charCounterLow : styles.charCounterValid)}`}>
                ({comment.length}/{MIN_COMMENT_LENGTH})
              </div>
            </div>
          </div>

          <div className={styles.submitWrapper}>
            <div className={styles.bucketWrapper}>
              <div ref={bucketRef} style={{ display: 'inline-flex', position: 'relative' }}>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={currentCredits}
                    initial={{ scale: 0.5, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.5, opacity: 0, y: -10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={styles.bucketContainer}
                  >
                    <svg
                      width="44"
                      height="44"
                      viewBox="0 0 44 44"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={styles.bucketSvg}
                    >
                      {/* Token Depth/Edge */}
                      <circle cx="22" cy="24" r="18" fill="currentColor" fillOpacity="0.05" />

                      {/* Token Face */}
                      <circle
                        cx="22"
                        cy="20"
                        r="18"
                        fill="white"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeOpacity="0.2"
                      />
                    </svg>
                    <span className={styles.bucketValue}>
                      +<AnimatedTokenCounter value={currentCredits} />
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={status === "loading" || isDisabled}
            >
              {status === "loading" ? (
                <div className={styles.spinner} />
              ) : (
                <span>{isDisabled ? disabledMessage : "שליחת פידבק (אנונימי)"}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Overlay for unauthenticated users */}
      {!isSignedIn && !isAuthDismissed && (
        <AuthOverlay
          isModal={true}
          message={
            <>
              <strong>הפידבק שלך חשוב</strong>{"\n\n"}
              כדי שלא נציג לך שוב ושוב שירים שכבר דירגת וכדי לשמור על איכות הקהילה, בואו נתחבר.{"\n\n"}
              הדירוגים שלך אנונימיים לחלוטין.
            </>
          }
          onDismiss={onAuthDismiss}
          dismissLabel="לא עכשיו, תודה"
        />
      )}

      {/* Flying Numbers Portal-like overlay */}
      <AnimatePresence>
        {flyers.map((flyer) => (
          <motion.div
            key={flyer.id}
            initial={{
              x: flyer.x + (flyer.ox || 0),
              y: flyer.y + (flyer.oy || 0),
              opacity: 0,
              scale: 0.5
            }}
            animate={{
              x: flyer.tx,
              y: flyer.ty,
              opacity: [0, 1, 1, 0.8],
              scale: [0.5, 1.5, 1],
            }}
            transition={{
              duration: 1.0,
              ease: "circOut",
              x: { duration: 1.0, ease: "linear" },
              y: { duration: 1.0, ease: "circIn" } /* Create an arc effect */
            }}
            onAnimationComplete={() => {
              // Immediately remove flyer when animation completes to avoid DOM buildup
              setFlyers(prev => prev.filter(f => f.id !== flyer.id));
            }}
            className={styles.flyer}
          >
            +{flyer.value}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
