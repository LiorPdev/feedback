"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./feed.module.css";
import FeedbackForm from "@/components/FeedbackForm";
import UrlPlayer, { getEmbedUrl, type UrlPlayerHandle } from "@/components/UrlPlayer";
import DashboardLink from "@/components/DashboardLink";
import { Play, Pause } from "lucide-react";
import { MIN_LISTEN_TIME, SUCCESS_MESSAGE_DURATION } from "@/lib/constants";
import { logAction } from "@/app/actions/logs";

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
  const [secondsRemaining, setSecondsRemaining] = useState(MIN_LISTEN_TIME);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const playerRef = useRef<UrlPlayerHandle>(null);

  const currentSong = songs[currentIndex];
  const embedUrl = currentSong ? getEmbedUrl(currentSong.url) : null;
  const showPlayer = !!embedUrl;

  // Reset state when song changes can also be done via key, but we handle it here
  // or by reset function called by event handlers.
  // We'll keep the effect but move it to a more standard pattern if possible,
  // or just move the resets to the events.

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

  const onPlayerPlay = useCallback(() => {
    setIsTimerActive(true);
    setIsPlaying(true);
    setIsBuffering(false);
  }, []);

  const onPlayerPause = useCallback(() => {
    setIsTimerActive(false);
    setIsPlaying(false);
  }, []);

  const resetSongState = useCallback(() => {
    setSecondsRemaining(MIN_LISTEN_TIME);
    setIsTimerActive(false);
    setIsPlaying(false);
    setIsBuffering(false);
  }, []);

  const onPlayerError = useCallback((error: unknown) => {
    logAction({
      message: "Player Error (FeedContainer)",
      data: {
        error: (error as Error)?.message || String(error),
        url: currentSong?.url,
        timestamp: new Date().toISOString(),
      },
      source: "FeedContainer.tsx:onPlayerError"
    });
    setIsBuffering(false);
    setIsPlaying(false);
  }, [currentSong?.url]);

  const handleSkip = () => {
    if (songs.length <= 1) return;
    try {
      playerRef.current?.pause();
    } catch {
      console.warn("Failed to pause before skip");
    }
    resetSongState();
    setCurrentIndex((prev) => {
       const nextIndex = (prev + 1) % songs.length;
       return nextIndex;
    });
  };

  const handleRemoveCurrent = () => {
    setSongs((prevSongs) => {
      const updatedSongs = prevSongs.filter((_, i) => i !== currentIndex);
      if (updatedSongs.length === 0) return [];

      // Update index if needed
      setCurrentIndex((prevIndex) => (prevIndex >= updatedSongs.length ? 0 : prevIndex));
      resetSongState();
      return updatedSongs;
    });
  };

  const handlePlayOld = () => {
    if (currentSong?.url) {
      window.open(currentSong.url, "_blank");
    }
  };

  const togglePlayback = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pause();
    } else {
      setIsBuffering(true);
      playerRef.current.play();

      // Fallback: clear buffering state after 3 seconds if play doesn't start
      setTimeout(() => {
        setIsBuffering(false);
      }, 3000);
    }
  };

  const getPlayedSeconds = async () => {
    if (playerRef.current) {
      return await playerRef.current.getPlaybackTime();
    }
    return 0;
  };

  if (!currentSong) {
    return (
      <div className={styles.emptyState}>
        <h2 className={styles.emptyTitle}>אין שירים זמינים בפיד כרגע.</h2>
        <DashboardLink href="/" text="חזרה לדף הבית" />
      </div>
    );
  }

  const isYouTube = currentSong.url.includes("youtube.com") || currentSong.url.includes("youtu.be");
  const isSoundCloud = currentSong.url.includes("soundcloud.com");
  const isSpotify = currentSong.url.includes("spotify.com");
  const isAudio = !!currentSong.url.match(/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i) || currentSong.url.includes("r2.dev");
  const isBypassTimer = false;
  const isHiddenPlayer = isYouTube || isSoundCloud || isSpotify || isAudio;

  return (
    <div className={styles.feedWrapper}>
      <div className={styles.songCard}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>
            {currentSong.title}
          </h2>
          {currentSong.genre && (
            <span className={styles.genreInline}>
              • {currentSong.genre}
            </span>
          )}
        </div>

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
                  ref={playerRef}
                  url={currentSong.url}
                  onPlay={onPlayerPlay}
                  onPause={onPlayerPause}
                  onReady={() => setIsBuffering(false)}
                  onError={onPlayerError}
                  isHidden={isHiddenPlayer}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={styles.actions}>
          {isHiddenPlayer ? (
            <button
              className={isPlaying ? styles.btnPause : styles.btnPlay}
              onClick={togglePlayback}
            >
              {isBuffering ? (
                <>
                  <div className={styles.loadingSpinner} />
                  <span>טוען...</span>
                </>
              ) : isPlaying ? (
                <>
                  <Pause size={20} fill="currentColor" />
                  <span>עצור</span>
                </>
              ) : (
                <>
                  <Play size={20} fill="currentColor" />
                  <span>נגן</span>
                </>
              )}
            </button>
          ) : !embedUrl && (
            <button className={styles.btnPlay} onClick={handlePlayOld}>
              <span>להקשיב</span>
            </button>
          )}

          <button className={styles.btnSkip} onClick={handleSkip}>
            דלג
          </button>
        </div>

        <div className={styles.feedbackSection}>
          <FeedbackForm
            songId={currentSong.id}
            key={currentSong.id}
            getPlayedSeconds={getPlayedSeconds}
            isDisabled={!isBypassTimer && secondsRemaining > 0}
            disabledMessage={
              isBypassTimer ? "" : (
                !isTimerActive
                  ? `בבקשה הקשיבו לשיר לפחות ${MIN_LISTEN_TIME} שניות לפני שליחת פידבק`
                  : `ניתן לשלוח פידבק בעוד ${secondsRemaining} שניות...`
              )
            }
            onSuccess={() => {
              setTimeout(() => {
                handleRemoveCurrent();
              }, SUCCESS_MESSAGE_DURATION);
            }}
          />
        </div>
      </div>

      <DashboardLink href="/" text="חזרה לדף הבית" className={styles.dashboardLinkMargin} />
    </div>
  );
}
