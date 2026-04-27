"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Pencil } from "lucide-react";
import { updateSong, getURLMetadata } from "@/app/actions/songs";
import { logAction } from "@/app/actions/logs";
import { isYouTubeUrl, isShortsUrl, isPlaylistUrl, isR2Url, SONG_VALIDATION_MESSAGES } from "@/lib/song-validation";
import styles from "./EditSong.module.css";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./ui/Button";
import PageHeader from "./PageHeader";

interface EditSongProps {
  song: {
    id: string;
    title: string;
    url: string;
    genre: string;
    fewWords?: string | null;
  };
}

import { GENRES, MAX_SONG_NAME_LENGTH } from "@/lib/constants";

export default function EditSong({ song }: EditSongProps) {
  const [showModal, setShowModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [title, setTitle] = useState(song.title);
  const [url, setUrl] = useState(song.url);
  const [genre, setGenre] = useState(song.genre);
  const [fewWords, setFewWords] = useState(song.fewWords || "");

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
      setFewWords(song.fewWords || "");
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
        await logAction({ message: "Metadata fetch error (Edit)", data: error, source: "EditSong.tsx:useEffect" });
      }
    };

    const timer = setTimeout(fetchMetadata, 1000);
    return () => clearTimeout(timer);
  }, [url, song.url, showModal]);

  const isUnsupportedLink = url.trim() !== "" && !isYouTubeUrl(url) && !isR2Url(url);
  const isShorts = isShortsUrl(url);
  const isPlaylist = isPlaylistUrl(url);
  const isInvalid = isUnsupportedLink || isShorts || isPlaylist;

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

      const result = await updateSong(song.id, { title, url: finalUrl, genre, fewWords });
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
        <div className={styles.overlay}>
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <PageHeader
              title="עריכה"
              showClose={true}
              onClose={() => setShowModal(false)}
              showBack={false}
              align="center"
            />

            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.field}>
                <label>קישור לשיר</label>
                <input
                  type="url"
                  className={styles.input}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity("אנא הדביקו קישור ליוטיוב")}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                  required
                  placeholder="e.g. https://www.youtube.com/watch?v=wABCDEFaa8"
                />
                {isUnsupportedLink && (
                  <p className={styles.errorText}>
                    {SONG_VALIDATION_MESSAGES.ONLY_YOUTUBE}
                  </p>
                )}
                {isShorts && (
                  <p className={styles.errorText}>
                    {SONG_VALIDATION_MESSAGES.NO_SHORTS}
                  </p>
                )}
                {isPlaylist && (
                  <p className={styles.errorText}>
                    {SONG_VALIDATION_MESSAGES.NO_PLAYLIST}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label>שם השיר</label>
                <input
                  type="text"
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value.substring(0, MAX_SONG_NAME_LENGTH))}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity("אנא הזינו את שם השיר")}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                  required
                  placeholder="לדוגמה: השיר החדש שלי"
                  maxLength={MAX_SONG_NAME_LENGTH}
                />
              </div>

              <div className={styles.field}>
                <label>סגנון מוזיקלי</label>
                <select
                  className={styles.select}
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  onInvalid={(e) => (e.target as HTMLSelectElement).setCustomValidity("אנא בחרו סגנון מהרשימה")}
                  onInput={(e) => (e.target as HTMLSelectElement).setCustomValidity("")}
                  required
                >
                  {GENRES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>כמה מילים על השיר (אופציונלי)</label>
                <textarea
                  className={styles.textarea}
                  placeholder="למשל: אשמח להתייחסות לסאונד של השירה, או האם הפזמון מספיק קליט.."
                  value={fewWords}
                  onChange={(e) => setFewWords(e.target.value.substring(0, 70))}
                  rows={2}
                  maxLength={70}
                />
              </div>

              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setShowModal(false)}
                  disabled={isUpdating}
                  fullWidth
                >
                  ביטול
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isUpdating}
                  disabled={isInvalid}
                  fullWidth
                >
                  אישור
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="md"
        onClick={() => setShowModal(true)}
        title="עריכת פרטי השיר"
        style={{ padding: '8px', minWidth: 'auto' }}
      >
        <Pencil size={16} />
      </Button>

      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}
