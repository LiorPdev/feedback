"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Star, LogIn, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, SignInButton } from "@clerk/nextjs";
import { addFeedback } from "@/app/actions/songs";
import { REWARD_LYRICS, REWARD_COMMENT, MIN_COMMENT_LENGTH, SUCCESS_MESSAGE_DURATION } from "@/lib/constants";
import styles from "./FeedbackForm.module.css";
import AnimatedTokenCounter from "./AnimatedTokenCounter";

interface FeedbackFormProps {
  songId: string;
  onSuccess?: () => void;
  getPlayedSeconds?: () => Promise<number>;
  isDisabled?: boolean;
  disabledMessage?: string;
}

export default function FeedbackForm({ songId, onSuccess, getPlayedSeconds, isDisabled, disabledMessage }: FeedbackFormProps) {
  const { isLoaded, isSignedIn } = useUser();
  const [ratings, setRatings] = useState({
    lyrics: 0,
    composition: 0,
    production: 0,
    overall: 0,
  });
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [flyers, setFlyers] = useState<{ id: number; x: number; y: number; tx: number; ty: number; value: number }[]>([]);
  const bucketRef = useRef<HTMLDivElement>(null);
  const flyerIdRef = useRef(0);

  const triggerFlyer = useCallback((x: number, y: number, value: number, targetX?: number, targetY?: number) => {
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
      value
    }]);

    // Cleanup after animation finishes (safety timeout)
    setTimeout(() => {
      setFlyers(prev => prev.filter(f => f.id !== id));
    }, 2500);
  }, []);

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
    { key: "lyrics" as const, label: "מילים" },
    { key: "composition" as const, label: "לחן" },
    { key: "production" as const, label: "הפקה" },
    { key: "overall" as const, label: "ציון כללי" },
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
      triggerFlyer(rect.left + rect.width / 2, rect.top + rect.height / 2, REWARD_LYRICS);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasRating = ratings.lyrics > 0 || ratings.composition > 0 || ratings.production > 0 || ratings.overall > 0;
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
        lyrics: ratings.lyrics,
        composition: ratings.composition,
        production: ratings.production,
        overall: ratings.overall,
        comment: commentTrimmed,
        playedSeconds,
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

        setStatus("success");
        // Reset form immediately on success
        setRatings({
          lyrics: 0,
          composition: 0,
          production: 0,
          overall: 0,
        });
        setComment("");
        onSuccess?.();
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
  const filledCategoriesCount = Object.values(ratings).filter(r => r > 0).length;
  const commentLength = comment.trim().length;
  const hasValidComment = commentLength >= MIN_COMMENT_LENGTH;
  const currentCredits = (filledCategoriesCount * REWARD_LYRICS) + (hasValidComment ? REWARD_COMMENT : 0);

  if (!isLoaded) {
    return (
      <div className={styles.form}>
        <div className={styles.spinner} style={{ margin: '2rem auto' }} />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className={styles.form}>
        <div className={styles.authPrompt}>
          <h2 className={styles.heading}>רוצים לתת פידבק?</h2>
          <p className={styles.subHeading} style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#64748B' }}>
            כדי שלא נציג לך שוב ושוב שירים שכבר דירגת, וכדי לשמור על איכות הקהילה, יש להתחבר למערכת. אנחנו מתחייבים שהדירוגים שלך אנונימיים לחלוטין.          </p>
          <SignInButton mode="modal">
            <button className={styles.submitBtn}>
              <LogIn size={18} />
              <span>התחברות</span>
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <AnimatePresence>
        {status === "success" && (
          <div className={styles.successOverlay}>
            <motion.div
              className={styles.successPopup}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            >
              <CheckCircle2 size={20} className={styles.successIcon} />
              <span>תודה על הפידבק שלך!</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit}>
        <div className={styles.ratingGrid}>
          {categories.map((cat) => (
            <div key={cat.key} className={styles.ratingGroup}>
              <label className={styles.ratingLabel}>
                {cat.label}
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
              placeholder={`נסו להסביר מדוע אתם נותנים את הדירוג הזה (מינימום ${MIN_COMMENT_LENGTH} תווים)`}
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
          <div className={styles.commentFooterRow}>
            <div className={styles.commentFooter}>
              <span className={styles.rewardText}>
                קבלו קרדיט עבור דירוג ו-{REWARD_COMMENT} נק&apos; להסבר
              </span>
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
                    <span className={styles.bucketValue} style={{ top: '0px' }}>
                      +<AnimatedTokenCounter value={currentCredits} />
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
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

        {status === "error" && (
          <div className={styles.error} style={{ marginTop: '1rem' }}>{errorMsg}</div>
        )}
      </form>

      {/* Flying Numbers Portal-like overlay */}
      <AnimatePresence>
        {flyers.map((flyer) => (
          <motion.div
            key={flyer.id}
            initial={{ x: flyer.x, y: flyer.y, opacity: 1, scale: 0.5 }}
            animate={{
              x: flyer.tx,
              y: flyer.ty,
              opacity: [0, 1, 1, 0.8],
              scale: [0.5, 1.5, 1],
            }}
            transition={{
              duration: 1.1,
              ease: "circOut",
              x: { duration: 1.1, ease: "linear" },
              y: { duration: 1.1, ease: "circIn" } /* Create an arc effect */
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
