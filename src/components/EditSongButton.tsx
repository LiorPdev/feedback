"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Pencil, Loader2 } from "lucide-react";
import { updateSong, getURLMetadata } from "@/app/actions/songs";
import { logAction } from "@/app/actions/logs";
import styles from "./EditSongButton.module.css";
import { motion, AnimatePresence } from "framer-motion";

interface EditSongButtonProps {
  song: {
    id: string;
    title: string;
    url: string;
    genre: string;
  };
}

import { GENRES, MAX_SONG_TITLE_LENGTH } from "@/lib/constants";

export default function EditSongButton({ song }: EditSongButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [title, setTitle] = useState(song.title);
  const [url, setUrl] = useState(song.url);
  const [genre, setGenre] = useState(song.genre);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset local state to original song data when modal opens
  useEffect(() => {
    if (showModal) {
      setTitle(song.title);
      setUrl(song.url);
      setGenre(song.genre);
    }
  }, [showModal, song]);

  useEffect(() => {
    const fetchMetadata = async () => {
      // Only attempt resolution if modal is open and it's a valid URL
      if (!showModal || !url || !url.includes("://") || url.length < 10) return;

      try {
        const result = await getURLMetadata(url) as { 
          success: boolean, 
          title?: string, 
          resolvedUrl?: string 
        };
        if (result.success) {
          // Automatic resolution for SoundCloud
          if (result.resolvedUrl && result.resolvedUrl !== url) {
            setUrl(result.resolvedUrl);
          }
        }
      } catch (error) {
        await logAction({ message: "Metadata fetch error (Edit)", data: error, source: "EditSongButton.tsx:useEffect" });
      }
    };

    const timer = setTimeout(fetchMetadata, 1000);
    return () => clearTimeout(timer);
  }, [url, song.url, showModal]);

  const isUnsupportedLink = url.trim() !== "" && !url.includes("youtube.com") && !url.includes("youtu.be") && !url.includes("r2.dev");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    let finalUrl = url;
    try {
      // Final check: resolve SoundCloud if it's still shortened
      if (finalUrl.includes("on.soundcloud.com")) {
        const resolved = await getURLMetadata(finalUrl) as { success: boolean, resolvedUrl?: string };
        if (resolved.success && resolved.resolvedUrl) {
          finalUrl = resolved.resolvedUrl;
        }
      }

      const result = await updateSong(song.id, { title, url: finalUrl, genre });
      if (result.success) {
        setShowModal(false);
      } else {
        alert(result.error);
      }
    } catch {
      alert("שגיאה בעדכון השיר");
    } finally {
      setIsUpdating(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {showModal && (
        <div
          className={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>עריכת פרטי השיר</h3>

            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.field}>
                <label>שם השיר</label>
                <input
                  type="text"
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value.substring(0, MAX_SONG_TITLE_LENGTH))}
                  required
                  placeholder="לדוגמה: השיר החדש שלי"
                  maxLength={MAX_SONG_TITLE_LENGTH}
                />
              </div>

              <div className={styles.field}>
                <label>קישור לשיר</label>
                <input
                  type="url"
                  className={styles.input}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="קישור ל-YouTube"
                />
                {isUnsupportedLink && (
                  <p className={styles.errorText} style={{ color: 'var(--status-error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    חלק מהנגנים מגבילים האזנה ממקורות חיצוניים. יש לשתף קישורים מיוטיוב בלבד.
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label>סגנון מוזיקלי</label>
                <select
                  className={styles.select}
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  required
                >
                  {GENRES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowModal(false)}
                  disabled={isUpdating}
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={isUpdating || isUnsupportedLink}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 size={18} className={styles.spin} /> שומר...
                    </>
                  ) : (
                    "שמור שינויים"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        className={styles.editBtn}
        onClick={() => setShowModal(true)}
        title="עריכת פרטי השיר"
      >
        <Pencil size={18} />
      </button>

      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}
