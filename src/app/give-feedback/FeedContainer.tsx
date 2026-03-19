"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home } from "lucide-react";
import Link from "next/link";
import styles from "./feed.module.css";
import FeedbackForm from "@/components/FeedbackForm";

interface Song {
  id: string;
  title: string;
  genre: string;
  url: string;
  slug: string;
  user?: {
    name: string | null;
  };
}

interface FeedContainerProps {
  initialSongs: Song[];
}

export default function FeedContainer({ initialSongs }: FeedContainerProps) {
  const [songs, setSongs] = useState(initialSongs);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentSong = songs[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % songs.length);
  };

  const handlePlay = () => {
    if (currentSong?.url) {
      window.open(currentSong.url, "_blank");
    }
  };

  if (!currentSong) {
    return (
      <div className={styles.emptyState}>
        <h2 className={styles.emptyTitle}>אין שירים זמינים בפיד כרגע.</h2>
        <Link href="/dashboard" className={styles.btnPlay} style={{ maxWidth: '200px', marginTop: '1rem' }}>
          חזרה למרחב האישי
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.feedWrapper}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSong.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={styles.songCard}
        >
          <div className={styles.headerRow}>
            <h1 className={styles.title}>
              {currentSong.title}
            </h1>
          </div>

          <div className={styles.actions}>
            <button className={styles.btnPlay} onClick={handlePlay}>
              <span>להקשיב</span>
            </button>
            <button className={styles.btnSkip} onClick={handleNext}>
              <span>דלג</span>
            </button>
          </div>

          <div className={styles.feedbackSection}>
            <FeedbackForm
              songId={currentSong.id}
              onSuccess={() => {
                // We'll wait a bit before moving to the next song to show the success state
                setTimeout(() => {
                  handleNext();
                }, 2000);
              }}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      <Link href="/dashboard" className={styles.homeLink}>
        <Home size={18} />
        <span>חזרה למרחב האישי</span>
      </Link>
    </div>
  );
}
