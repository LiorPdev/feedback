"use client";

import { useState, useEffect } from "react";
import { Share2, Check } from "lucide-react";
import styles from "./ShareSongButton.module.css";
import { motion, AnimatePresence } from "framer-motion";

interface ShareSongButtonProps {
  slug: string;
  isNew?: boolean;
  variant?: "standard" | "large";
  disabled?: boolean;
}

export default function ShareSongButton({ slug, isNew, variant = "standard", disabled }: ShareSongButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showAutoTooltip, setShowAutoTooltip] = useState(false);

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
    const shareText = `היי, האם תוכלו להקשיב ולשלוח לי פידבק על השיר? 🎸:\n${url}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
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
              className={styles.tooltip}
              initial={{ opacity: 0, y: 5, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 5, x: "-50%" }}
            >
              {copied
                ? "הועתק! שילחו לחברים ובקשו מהם לתת לכם פידבק על השיר"
                : "השיר התווסף! שילחו לחברים ובקשו מהם לתת לכם פידבק על השיר"
              }
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
