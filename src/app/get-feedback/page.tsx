"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Copy, X, Check } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { createSong } from "@/app/actions/songs";
import styles from "./get-feedback.module.css";

const genres = [
  "אינדי", "אלקטרוני", "בלוז", "גרוב", "היפ-הופ", "ים תיכוני", "פולק", "פופ", "רוק", "אחר"
];

export default function GetFeedback() {
  const [songLink, setSongLink] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [slug, setSlug] = useState("");
  const [copied, setCopied] = useState(false);
  const { user } = useUser();

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
        setSlug(result.song.slug);
        setStatus("success");
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

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://feedback.activitywiz.com/give-feedback/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <h1>
            שליחת שיר לקבלת פידבק <span className={styles.tokenCount}>(10 טוקנים)</span>
          </h1>
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
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={styles.errorMsg}
                >
                  {errorMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>שם השיר</label>
            <input
              type="text"
              className={styles.input}
              placeholder="לדוגמא: לשרוק בחושך"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              required
            />
          </div>

          <div className={`${styles.formGroup} ${styles.genreGroup}`}>
            <label className={styles.label}>ז'אנר</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                required
              >
                <option value="" disabled>בחר ז'אנר...</option>
                {genres.map((genre) => (
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
              "שליחה"
            )}
          </button>
        </form>
      </motion.div>

      <Link href="/dashboard" className={styles.backLink}>
        <ArrowRight size={18} /> חזרה למרחב האישי
      </Link>

      <AnimatePresence>
        {status === "success" && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, x: "-50%", y: "-40%", scale: 0.9 }}
            animate={{ opacity: 1, x: "-50%", y: "-50%", scale: 1 }}
            exit={{ opacity: 0, x: "-50%", y: "-45%", scale: 0.9 }}
          >
            <button
              onClick={() => setStatus("idle")}
              className={styles.closeToastBtn}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className={styles.toastHeader}>
              <CheckCircle2 size={20} color="#40C0D0" />
              <span>השיר נשלח בהצלחה!</span>
            </div>
            <div className={styles.copyContainer}>
              <span style={{ fontSize: "15px", fontWeight: "600" }}>קישור לדירוג השיר</span>
              <button
                onClick={handleCopy}
                className={styles.copyBtn}
                title="Copy Link"
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                    >
                      <Check size={18} color="#40C0D0" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Copy size={18} color="#40C0D0" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
