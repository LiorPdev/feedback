"use client";

import { useState } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { toggleSongStatus } from "@/app/actions/songs";
import styles from "./ToggleSongStatusButton.module.css";

interface ToggleSongStatusButtonProps {
  songId: string;
  isActive: boolean;
}

export default function ToggleSongStatusButton({ songId, isActive: initialIsActive }: ToggleSongStatusButtonProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    try {
      const newStatus = !isActive;
      const result = await toggleSongStatus(songId, newStatus);
      if (result.success) {
        setIsActive(newStatus);
      } else {
        alert(result.error || "שגיאה בעדכון השיר");
      }
    } catch {
      alert("שגיאה בתקשורת עם השרת");
    } finally {
      setIsLoading(false);
    }
  };

  const title = isActive ? "עצור את קבלת הפידבקים" : "הפעל מחדש את קבלת הפידבקים";

  return (
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
        <Pause size={16} fill="currentColor" />
      ) : (
        <Play size={16} fill="currentColor" />
      )}
    </button>
  );
}
