"use client";

import { useState } from "react";
import { RefreshCcw, OctagonPause, Loader2 } from "lucide-react";
import { toggleSongStatus } from "@/app/actions/songs";
import styles from "./ToggleSongStatusButton.module.css";
import { motion, AnimatePresence } from "framer-motion";

interface ToggleSongStatusButtonProps {
  songId: string;
  isActive: boolean;
}

export default function ToggleSongStatusButton({ songId, isActive: initialIsActive }: ToggleSongStatusButtonProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isLoading, setIsLoading] = useState(false);
  const [showPausedTooltip, setShowPausedTooltip] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    try {
      const newStatus = !isActive;
      const result = await toggleSongStatus(songId, newStatus);
      if (result.success) {
        setIsActive(newStatus);
        if (!newStatus) {
          setShowPausedTooltip(true);
          setTimeout(() => setShowPausedTooltip(false), 5000);
        }
      } else {
        alert(result.error || "שגיאה בעדכון השיר");
      }
    } catch {
      alert("שגיאה בתקשורת עם השרת");
    } finally {
      setIsLoading(false);
    }
  };

  const title = isActive ? "השהה את קבלת הפידבקים" : "הפעל מחדש את קבלת הפידבקים";

  return (
    <div className={styles.toggleBtnContainer}>
      <button
        className={styles.toggleBtn}
        onClick={handleToggle}
        disabled={isLoading}
        title={title}
        type="button"
      >
        {isLoading ? (
          <Loader2 size={16} className={styles.spin} />
        ) : isActive ? (
          <OctagonPause size={16} />
        ) : (
          <RefreshCcw size={16} />
        )}
      </button>

      <AnimatePresence>
        {showPausedTooltip && (
          <motion.div
            className={styles.tooltip}
            initial={{ opacity: 0, y: 5, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 5, x: "-50%" }}
          >
            השיר הוסר זמנית מאזור הפידבקים
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
