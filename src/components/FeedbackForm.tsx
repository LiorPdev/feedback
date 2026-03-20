"use client";

import { useState } from "react";
import { Star, Music, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useUser, SignInButton } from "@clerk/nextjs";
import { addFeedback } from "@/app/actions/songs";
import { REWARD_LYRICS, REWARD_COMPOSITION, REWARD_PRODUCTION, REWARD_OVERALL, REWARD_COMMENT, MIN_COMMENT_LENGTH } from "@/lib/constants";
import styles from "./FeedbackForm.module.css";

interface FeedbackFormProps {
  songId: string;
  onSuccess?: () => void;
  onSkip?: () => void;
  isDisabled?: boolean;
  disabledMessage?: string;
}

export default function FeedbackForm({ songId, onSuccess, onSkip, isDisabled, disabledMessage }: FeedbackFormProps) {
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

  const categories = [
    { key: "lyrics" as const, label: "מילים" },
    { key: "composition" as const, label: "לחן" },
    { key: "production" as const, label: "עיבוד / הפקה" },
    { key: "overall" as const, label: "ציון כללי" },
  ];

  const handleRating = (key: keyof typeof ratings, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
    if (status === "error") setStatus("idle");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasRating = ratings.lyrics > 0 || ratings.composition > 0 || ratings.production > 0 || ratings.overall > 0;
    const commentTrimmed = comment.trim();
    const hasComment = commentTrimmed.length > 0;

    // Validation logic
    if (!hasRating && !hasComment) {
      setStatus("error");
      setErrorMsg("אנא דרגו לפחות קטגוריה אחת או כתבו תגובה כדי לשלוח פידבק.");
      return;
    }

    if (hasComment && commentTrimmed.length < MIN_COMMENT_LENGTH) {
      setStatus("error");
      setErrorMsg(`התגובה קצרה מדי. אם בחרתם לכתוב תגובה, היא חייבת להכיל לפחות ${MIN_COMMENT_LENGTH} תווים.`);
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const result = await addFeedback({
        songId,
        lyrics: ratings.lyrics,
        composition: ratings.composition,
        production: ratings.production,
        overall: ratings.overall,
        comment: commentTrimmed,
      });

      if (result.success) {
        setStatus("success");
        onSuccess?.();
        // Dispatch custom event to notify Navbar or other components
        window.dispatchEvent(new CustomEvent("tokens-updated"));
      } else {
        setStatus("error");
        setErrorMsg(result.error || "משהו השתבש בשליחת הפידבק.");
      }
    } catch (err) {
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

  if (status === "success") {
    return (
      <motion.div
        className={styles.successCard}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h3>תודה על הפידבק שלך!</h3>
      </motion.div>
    );
  }

  return (
    <div className={styles.form}>
      <form onSubmit={handleSubmit}>
        <div className={styles.formHeader}>
          {onSkip && (
            <button type="button" className={styles.skipBtn} onClick={onSkip}>
              דלג
            </button>
          )}
          <h2 className={styles.heading}>פידבק ודירוג</h2>
        </div>

        <div className={styles.ratingGrid}>
          {categories.map((cat) => (
            <div key={cat.key} className={styles.ratingGroup}>
              <label className={styles.ratingLabel}>
                {cat.label}
                <span className={styles.pointLabel}>
                  ({cat.key === "lyrics" ? REWARD_LYRICS :
                    cat.key === "composition" ? REWARD_COMPOSITION :
                      cat.key === "production" ? REWARD_PRODUCTION :
                        REWARD_OVERALL}+)
                </span>
              </label>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`${styles.starBtn} ${ratings[cat.key] >= star ? styles.starFilled : ""}`}
                    onClick={() => handleRating(cat.key, star)}
                  >
                    <Star
                      size={20}
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
            placeholder={`נסו להסביר למה אתם נותנים את הדירוג הזה (מינימום ${MIN_COMMENT_LENGTH} תווים)`}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (status === "error") setStatus("idle");
            }}
          />
          <div className={styles.commentFooterRow}>
            <div className={styles.commentFooter}>({REWARD_COMMENT}+) קרדיט <Music size={12} style={{ display: 'inline', verticalAlign: 'middle', marginBottom: '2px' }} /></div>
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
