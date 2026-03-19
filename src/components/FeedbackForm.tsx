"use client";

import { useState } from "react";
import { Star, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addFeedback } from "@/app/actions/songs";
import styles from "./FeedbackForm.module.css";

interface RatingCategory {
  key: "lyrics" | "composition" | "production" | "overall";
  label: string;
}

const categories: RatingCategory[] = [
  { key: "lyrics", label: "מילים" },
  { key: "composition", label: "לחן" },
  { key: "production", label: "עיבוד / הפקה" },
  { key: "overall", label: "ציון כללי" },
];

interface FeedbackFormProps {
  songId: string;
  onSuccess?: () => void;
}

export default function FeedbackForm({ songId, onSuccess }: FeedbackFormProps) {
  const [ratings, setRatings] = useState({
    lyrics: 0,
    composition: 0,
    production: 0,
    overall: 0,
  });
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleRating = (key: keyof typeof ratings, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const isFormValid =
    ratings.lyrics > 0 &&
    ratings.composition > 0 &&
    ratings.production > 0 &&
    ratings.overall > 0 &&
    comment.trim().length >= 30;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const result = await addFeedback({
        songId,
        lyrics: ratings.lyrics,
        composition: ratings.composition,
        production: ratings.production,
        overall: ratings.overall,
        comment,
      });

      if (result.success) {
        setStatus("success");
        onSuccess?.();
      } else {
        setStatus("error");
        setErrorMsg(result.error || "משהו השתבש בשליחת הפידבק.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg("שגיאת תקשורת. אנא נסו שוב.");
    }
  };

  if (status === "success") {
    return (
      <motion.div
        className={styles.successCard}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className={styles.successIcon}>✨</div>
        <h3>תודה על הפידבק שלך!</h3>
        <p>המשוב שלך נשלח בהצלחה ליוצר השיר.</p>
        <button
          className={styles.resetBtn}
          onClick={() => {
            setRatings({ lyrics: 0, composition: 0, production: 0, overall: 0 });
            setComment("");
            setStatus("idle");
          }}
        >
          שליחת פידבק נוסף
        </button>
      </motion.div>
    );
  }

  return (
    <div className={styles.form}>
      <form onSubmit={handleSubmit}>
        <h2 className={styles.heading}>פידבק ודירוג</h2>

        <div className={styles.ratingGrid}>
          {categories.map((cat) => (
            <div key={cat.key} className={styles.ratingGroup}>
              <label className={styles.ratingLabel}>{cat.label}</label>
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
            placeholder="מה דעתך על השיר? מה כדאי לשפר? (מינימום 30 תווים)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />
        </div>

        {status === "error" && (
          <div className={styles.error}>{errorMsg}</div>
        )}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={status === "loading" || !isFormValid}
        >
          {status === "loading" ? (
            <div className={styles.spinner} />
          ) : (
            <>
              <Send size={18} />
              <span>שליחת פידבק</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
