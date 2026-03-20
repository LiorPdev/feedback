"use client";

import { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { createSong, getUserSongCount, getURLMetadata } from "@/app/actions/songs";
import { useRouter } from "next/navigation";
import styles from "./get-feedback.module.css";
import DashboardLink from "@/components/DashboardLink";
import { GENRES, SONG_SUBMISSION_COST } from "@/lib/constants";

export default function GetFeedback() {
  const [songLink, setSongLink] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showTokenLink, setShowTokenLink] = useState(false);
  const [hasSongs, setHasSongs] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    async function checkSongs() {
      if (user?.id) {
        const result = await getUserSongCount(user.id);
        if (result.success && result.count > 0) {
          setHasSongs(true);
        }
      }
    }
    checkSongs();
  }, [user?.id]);

  useEffect(() => {
    const fetchMetadata = async () => {
      // Basic URL validation
      if (!songLink || !songLink.includes("://") || songLink.length < 10) return;

      // Only auto-fill if the title is currently empty
      if (songTitle) return;

      setIsFetchingMetadata(true);
      try {
        const result = await getURLMetadata(songLink);
        if (result.success && result.title) {
          setSongTitle(result.title);
        }
      } catch (error) {
        console.error("Metadata fetch error:", error);
      } finally {
        setIsFetchingMetadata(false);
      }
    };

    const timer = setTimeout(fetchMetadata, 1000);
    return () => clearTimeout(timer);
  }, [songLink, songTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songLink || !songTitle || !selectedGenre || !user?.id) return;

    setStatus("loading");
    setErrorMessage("");
    setShowTokenLink(false);

    const formData = new FormData();
    formData.append("url", songLink);
    formData.append("title", songTitle);
    formData.append("genre", selectedGenre);

    try {
      const result = await createSong(formData, user.id);
      if (result.success && result.song) {
        // Immediate redirect with the new slug for highlighting
        router.push(`/dashboard?new=${result.song.slug}`);
      } else {
        setErrorMessage(result.error || "שגיאה בביצוע הפעולה");
        if ((result as any).type === 'insufficient_tokens') {
          setShowTokenLink(true);
        }
        setStatus("idle");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("חלה שגיאה לא צפויה");
      setStatus("idle");
    }
  };

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.header}>
          <h1>שליחת שיר לקבלת פידבק</h1>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>קישור לשיר</label>
            <input
              type="url"
              className={styles.input}
              placeholder="הדביקו קישור מיוטיוב, ספוטיפי, סאונדקלאוד או אחר"
              value={songLink}
              onChange={(e) => setSongLink(e.target.value)}
              required
            />
            <AnimatePresence>
              {songLink.includes("music.apple.com") && (
                <motion.p 
                  className={styles.hint}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  שימו לב: משתמשים ללא מנוי Apple Music לא יוכלו להאזין לשיר.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              שם השיר
              {isFetchingMetadata && (
                <span className={styles.fetchingIndicator}> (מחפש כותרת...)</span>
              )}
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="לדוגמא: איך שיר נולד"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              required
            />
          </div>

          <div className={`${styles.formGroup} ${styles.genreGroup}`}>
            <label className={styles.label}>סגנון</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                required
              >
                <option value="" disabled>בחרו סגנון...</option>
                {GENRES.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={status === "loading" || !songLink || !songTitle || !selectedGenre || !user}
          >
            {status === "loading" ? (
              <div className={styles.loadingSpinner} />
            ) : (
              <>שליחה <span className={styles.tokenLabel}>({SONG_SUBMISSION_COST} <Music size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> קרדיט)</span></>
            )}
          </button>

          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={styles.errorMsg}
                style={{ marginTop: '1rem', textAlign: 'center' }}
              >
                {errorMessage.split('[MUSIC_ICON]').map((part, i, arr) => (
                  <Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && <Music size={14} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 4px' }} />}
                  </Fragment>
                ))}
                {showTokenLink && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <Link href="/give-feedback" style={{ color: 'var(--brand-primary)', fontWeight: 700, textDecoration: 'underline' }}>
                      לחצו כאן למעבר למתן פידבק וצבירת קרדיט
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      {hasSongs && (
        <DashboardLink />
      )}
    </div>
  );
}
