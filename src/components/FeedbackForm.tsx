"use client";

import { useState, useEffect } from "react";
import { Star, Music, LogIn, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, SignInButton } from "@clerk/nextjs";
import { addFeedback } from "@/app/actions/songs";
import { REWARD_LYRICS, REWARD_COMPOSITION, REWARD_PRODUCTION, REWARD_OVERALL, REWARD_COMMENT, MIN_COMMENT_LENGTH, SUCCESS_MESSAGE_DURATION } from "@/lib/constants";
import styles from "./FeedbackForm.module.css";

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

  const handleRating = (key: keyof typeof ratings, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
    if (status === "error") setStatus("idle");
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
      handleRating(key, rating);
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
      setStatus("error");
      setErrorMsg("שגיאת תקשורת. אנא נסו שוב.");
    }
  };

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
                onTouchStart={(e) => handleTouch(e, cat.key)}
                onTouchMove={(e) => handleTouch(e, cat.key)}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`${styles.starBtn} ${ratings[cat.key] >= star ? styles.starFilled : ""}`}
                    onClick={() => handleRating(cat.key, star)}
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
          <textarea
            className={styles.textarea}
            placeholder={`נסו להסביר מדוע אתם נותנים את הדירוג הזה (מינימום ${MIN_COMMENT_LENGTH} תווים)`}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (status === "error") setStatus("idle");
            }}
          />
          <div className={styles.commentFooterRow}>
            <div className={styles.commentFooter}>
              קבלו {REWARD_LYRICS} <Music size={12} /> קרדיט עבור כל דירוג ו-{REWARD_COMMENT} <Music size={12} /> קרדיט עבור טקסט הסבר
            </div>
            <div className={`${styles.charCounter} ${comment.length === 0 ? "" : (comment.length < MIN_COMMENT_LENGTH ? styles.charCounterLow : styles.charCounterValid)}`}>
              ({comment.length}/{MIN_COMMENT_LENGTH})
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
    </div>
  );
}
