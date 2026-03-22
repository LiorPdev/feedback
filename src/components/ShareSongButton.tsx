"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import styles from "./ShareSongButton.module.css";
import { motion, AnimatePresence } from "framer-motion";

interface ShareSongButtonProps {
  slug: string;
}

export default function ShareSongButton({ slug }: ShareSongButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://feedback.activitywiz.com';
    const url = `${origin}/give-feedback/${slug}`;
    const shareText = `היי, אשמח לפידבק שלכם על השיר שלי 🎸:\n${url}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 4000);
  };

  return (
    <div className={styles.shareBtnContainer}>
      <button
        className={styles.shareBtn}
        onClick={handleCopy}
        title="שיתוף קישור לקבלת פידבק"
        type="button"
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
            >
              <Check size={18} />
            </motion.div>
          ) : (
            <motion.div
              key="share"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
            >
              <Share2 size={18} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {copied && (
            <motion.div
              className={styles.tooltip}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
            >
              הועתק! כעת שילחו לחברים ובקשו מהם לתת לכם פידבק אנונימי על השיר
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
