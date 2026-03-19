"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { createSong, getUserSongCount } from "@/app/actions/songs";
import { useRouter } from "next/navigation";
import styles from "./get-feedback.module.css";

import { GENRES } from "@/lib/constants";

export default function GetFeedback() {
  const [songLink, setSongLink] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSongs, setHasSongs] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songLink || !songTitle || !selectedGenre || !user?.id) return;

    setStatus("loading");
    setErrorMessage("");

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
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>שם השיר</label>
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
              <>שליחה <span className={styles.tokenLabel}>(10 טוקנים)</span></>
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
                {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      {hasSongs && (
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowRight size={18} /> חזרה למרחב האישי
        </Link>
      )}
    </div>
  );
}
