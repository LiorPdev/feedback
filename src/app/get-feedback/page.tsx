"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import styles from "./get-feedback.module.css";

const genres = [
  "רוק", "פופ", "היפ-הופ", "אלקטרוני", "פולק", "בלוז", "ג'אז", "מזרחית", "רגאיי", "אחר"
];

export default function GetFeedback() {
  const [songLink, setSongLink] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songLink || !selectedGenre) return;

    setStatus("loading");

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setStatus("success");

    // Reset toast after 3 seconds
    setTimeout(() => {
      setStatus("idle");
    }, 3000);
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
          <h1>קבלת פידבק</h1>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>לינק לשיר</label>
            <input
              type="url"
              className={styles.input}
              placeholder="הדבק לינק מיוטיוב, סאונדקלאוד או ספוטיפיי"
              value={songLink}
              onChange={(e) => setSongLink(e.target.value)}
              required
            />
          </div>

          <div className={`${styles.formGroup} ${styles.genreGroup}`}>
            <label className={styles.label}>ז'אנר</label>
            <div className={styles.genreGrid}>
              {genres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  className={`${styles.genrePill} ${selectedGenre === genre ? styles.genrePillSelected : ""}`}
                  onClick={() => setSelectedGenre(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={status === "loading" || !songLink || !selectedGenre}
          >
            {status === "loading" ? (
              <div className={styles.loadingSpinner} />
            ) : (
              "שליחה לקבלת פידבק"
            )}
          </button>
        </form>
      </motion.div>

      <Link href="/" className={styles.backLink}>
        <motion.div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ArrowRight size={18} /> חזרה לדף הבית
        </motion.div>
      </Link>

      <AnimatePresence>
        {status === "success" && (
          <motion.div
            className={styles.toast}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
          >
            <CheckCircle2 size={20} color="#40C0D0" />
            <span>השיר נשלח בהצלחה!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
