"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./feed.module.css";
import FeedbackForm from "@/components/FeedbackForm";
import UrlPlayer, { getEmbedUrl } from "@/components/UrlPlayer";
import DashboardLink from "@/components/DashboardLink";

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
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(false);

  useEffect(() => {
    // Reset timer and state when song changes
    setSecondsRemaining(30);
    setIsTimerActive(false);
  }, [currentIndex, songs]);

  useEffect(() => {
    if (!isTimerActive) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerActive]);

  const onPlayerPlay = useCallback(() => setIsTimerActive(true), []);
  const onPlayerPause = useCallback(() => setIsTimerActive(false), []);

  const currentSong = songs[currentIndex];
  // If the URL is supported, show the player immediately.
  const [showPlayer, setShowPlayer] = useState(!!getEmbedUrl(currentSong?.url || ""));

  const handleSkip = () => {
    if (songs.length <= 1) return;
    const nextIndex = (currentIndex + 1) % songs.length;
    setCurrentIndex(nextIndex);
    setShowPlayer(!!getEmbedUrl(songs[nextIndex]?.url || ""));
  };

  const handleRemoveCurrent = () => {
    const updatedSongs = songs.filter((_, i) => i !== currentIndex);
    setSongs(updatedSongs);

    if (updatedSongs.length > 0) {
      // If we remove an item, we stay at the same index (which is now the next item)
      // unless we removed the last item, then we go to 0.
      const nextIndex = currentIndex >= updatedSongs.length ? 0 : currentIndex;
      setCurrentIndex(nextIndex);
      setShowPlayer(!!getEmbedUrl(updatedSongs[nextIndex]?.url || ""));
    }
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
        <DashboardLink href="/" text="חזרה לדף הבית" />
      </div>
    );
  }

  const isSpotify = currentSong.url.includes("spotify.com");
  const isAppleMusic = currentSong.url.includes("music.apple.com");
  const isBypassTimer = isSpotify || isAppleMusic;

  return (
    <div className={styles.feedWrapper}>
      <div className={styles.songCard}>
        <div className={styles.playerSection}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSong.id + "-player"}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {showPlayer && (
                <UrlPlayer
                  url={currentSong.url}
                  onPlay={onPlayerPlay}
                  onPause={onPlayerPause}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={styles.actions}>
          {!getEmbedUrl(currentSong.url) && (
            <button className={styles.btnPlay} onClick={handlePlay}>
              <span>להקשיב</span>
            </button>
          )}
        </div>

        <div className={styles.feedbackSection}>
          <FeedbackForm
            songId={currentSong.id}
            onSkip={handleSkip}
            isDisabled={!isBypassTimer && secondsRemaining > 0}
            disabledMessage={
              isBypassTimer ? "" : (
              !isTimerActive
                ? "יש להקשיב לשיר לפחות 30 שניות לפני שליחת פידבק"
                : `ניתן לשלוח דירוג בעוד ${secondsRemaining} שניות...`
              )
            }
            onSuccess={() => {
              setTimeout(() => {
                handleRemoveCurrent();
              }, 3000);
            }}
          />
        </div>
      </div>

      <DashboardLink href="/" text="חזרה לדף הבית" />
    </div>
  );
}
