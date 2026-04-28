"use client";

import { useState } from "react";
import { RefreshCcw, OctagonPause, Loader2 } from "lucide-react";
import { toggleSongStatus } from "@/app/actions/songs";
import styles from "./ToggleSongStatusButton.module.css";
import { motion, AnimatePresence } from "framer-motion";
import PopupMsg from "./PopupMsg";
import { MAX_ACTIVE_SONGS } from "@/lib/constants";

interface ToggleSongStatusButtonProps {
  songId: string;
  isActive: boolean;
  activeSongsCount: number;
}

export default function ToggleSongStatusButton({
  songId,
  isActive: initialIsActive,
  activeSongsCount,
}: ToggleSongStatusButtonProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isLoading, setIsLoading] = useState(false);
  const [showPausedTooltip, setShowPausedTooltip] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If trying to activate and already at the limit, block it
    if (!isActive && activeSongsCount >= MAX_ACTIVE_SONGS) {
      setIsPopupOpen(true);
      return;
    }

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
    <>
      <div className={styles.toggleBtnContainer}>
        <button
          className={`${styles.toggleBtn} ${!isActive ? styles.isInactive : ""}`}
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
      <LimitPopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)} />
    </>
  );
}

function LimitPopup({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <PopupMsg
      isOpen={isOpen}
      onClose={onClose}
      title="רגע, יש לך לא מעט שירים פעילים 👑"
      buttonText="אישור"
      message={
        <div style={{ textAlign: "right", direction: "rtl", lineHeight: "1.6" }}>
          ניתן להריץ עד {MAX_ACTIVE_SONGS} שירים במקביל.<br />
          רוצה להפעיל שיר אחר? פשוט לחצו על <OctagonPause size={18} style={{ display: "inline-block", verticalAlign: "middle", margin: "0 4px", color: "var(--brand-primary)" }} /> כדי להשהות זמנית שיר אחר פעיל, והדרך תתפנה!
        </div>
      }
    />
  );
}
