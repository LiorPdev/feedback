"use client";

import { Share2, Check } from "lucide-react";
import styles from "./ShareSongButton.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { useShare } from "@/hooks/useShare";
import Tooltip from "@/components/Tooltip";

interface ShareSongButtonProps {
  slug: string;
  isNew?: boolean;
  variant?: "standard" | "large";
  disabled?: boolean;
  tooltipAlign?: "center" | "left" | "right";
}

export default function ShareSongButton({ slug, variant = "standard", disabled, tooltipAlign = "center" }: ShareSongButtonProps) {
  const { share, copied } = useShare();

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
              <Check size={variant === "large" ? 20 : 16} />
            </motion.div>
          ) : (
            <motion.div
              key="share"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className={styles.iconBox}
            >
              <Share2 size={variant === "large" ? 20 : 16} />
            </motion.div>
          )}
        </AnimatePresence>

        {variant === "large" && (
          <span className={styles.btnText}>
            <span className={styles.fullText}>שיתוף עם חברים לקבלת פידבק נוסף</span>
            <span className={styles.shortText}>שיתוף עם חברים</span>
          </span>
        )}

        <Tooltip
          show={copied}
          align={tooltipAlign}
          message="הועתק! שילחו לחברים את הקישור כדי שיתנו לכם פידבק על השיר"
        />
      </button>
    </div>
  );
}
