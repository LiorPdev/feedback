"use client";

import { useState, useEffect } from "react";
import { Share2, Check } from "lucide-react";
import styles from "./ShareSongButton.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { useShare } from "@/hooks/useShare";

interface ShareSongButtonProps {
  slug: string;
  isNew?: boolean;
  variant?: "standard" | "large";
  disabled?: boolean;
  tooltipAlign?: "center" | "left" | "right";
}

export default function ShareSongButton({ slug, isNew, variant = "standard", disabled, tooltipAlign = "center" }: ShareSongButtonProps) {
  const [showAutoTooltip, setShowAutoTooltip] = useState(false);
  const { share, copied } = useShare();

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setShowAutoTooltip(true), 500);
      const hideTimer = setTimeout(() => setShowAutoTooltip(false), 10500);
      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, [isNew]);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://feedback.activitywiz.com';
    const url = `${origin}/give-feedback/${slug}`;
    const shareText = `היי, האם תוכלו להקשיב לשיר ולרשום לי פידבק בקישור המצורף? 🎸`;

    share({
      title: 'פידבק ספייס',
      text: shareText,
      url
    });
  };

  return (
    <div className={styles.shareBtnContainer}>
      <button
        className={`${styles.shareBtn} ${variant === "large" ? styles.large : ""}`}
        onClick={handleCopy}
        title={disabled ? "" : "שיתוף קישור לקבלת פידבק"}
        type="button"
        disabled={disabled}
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className={styles.iconBox}
            >
              <Check size={variant === "large" ? 20 : 18} />
            </motion.div>
          ) : (
            <motion.div
              key="share"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className={styles.iconBox}
            >
              <Share2 size={variant === "large" ? 20 : 18} />
            </motion.div>
          )}
        </AnimatePresence>

        {variant === "large" && (
          <span className={styles.btnText}>
            <span className={styles.fullText}>שיתוף עם חברים לקבלת פידבק נוסף</span>
            <span className={styles.shortText}>שיתוף עם חברים</span>
          </span>
        )}

        <AnimatePresence>
          {(copied || showAutoTooltip) && (
            <motion.div
              className={`${styles.tooltip} ${styles[tooltipAlign]}`}
              initial={{ opacity: 0, y: 5, x: tooltipAlign === "center" ? "-50%" : "0" }}
              animate={{ opacity: 1, y: 0, x: tooltipAlign === "center" ? "-50%" : "0" }}
              exit={{ opacity: 0, y: 5, x: tooltipAlign === "center" ? "-50%" : "0" }}
            >
              {copied
                ? "הועתק! שילחו לחברים את הקישור ובקשו מהם לפרגן לכם פידבק על השיר"
                : "השיר התווסף! שילחו לחברים את הקישור ובקשו מהם לפרגן לכם פידבק על השיר"
              }
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
