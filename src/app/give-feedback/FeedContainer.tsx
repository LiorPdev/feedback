"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./feed.module.css";
import FeedbackForm from "@/components/FeedbackForm";
import UrlPlayer, { getEmbedUrl, type UrlPlayerHandle } from "@/components/UrlPlayer";
import DashboardLink from "@/components/DashboardLink";
import { Play, Pause } from "lucide-react";
import { MIN_LISTEN_TIME, SUCCESS_MESSAGE_DURATION } from "@/lib/constants";

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
  const [hasPlayedCurrent, setHasPlayedCurrent] = useState(false);
  const playerRef = useRef<UrlPlayerHandle>(null);

  const currentSong = songs[currentIndex];
  const embedUrl = currentSong ? getEmbedUrl(currentSong.url) : null;
  const showPlayer = !!embedUrl;

  useEffect(() => {
    // Reset timer and state when song changes
    setSecondsRemaining(MIN_LISTEN_TIME);
    setIsTimerActive(false);
    setIsPlaying(false);
    setIsBuffering(false);
    setHasPlayedCurrent(false);
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

  const onPlayerPlay = useCallback(() => {
    setIsTimerActive(true);
    setIsPlaying(true);
  }, []);

  const onPlayerPause = useCallback(() => {
    setIsTimerActive(false);
    setIsPlaying(false);
  }, []);

  const handleSkip = () => {
    if (songs.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % songs.length);
  };

  const handleRemoveCurrent = () => {
    setSongs((prevSongs) => {
      const updatedSongs = prevSongs.filter((_, i) => i !== currentIndex);
      if (updatedSongs.length === 0) return [];

      // Update index if needed
      setCurrentIndex((prevIndex) => (prevIndex >= updatedSongs.length ? 0 : prevIndex));
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
    if (isBuffering) return; // Prevent multiple clicks during buffering

    if (isPlaying) {
      playerRef.current.pause();
    } else {
      // If it's the first time playing this song, show preloader
      if (!hasPlayedCurrent) {
        setIsBuffering(true);
        playerRef.current.play();
        setTimeout(() => {
          setIsBuffering(false);
          setHasPlayedCurrent(true);
        }, 2000);
      } else {
        playerRef.current.play();
      }
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
              disabled={isBuffering}
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
            onSkip={handleSkip}
            getPlayedSeconds={getPlayedSeconds}
            isDisabled={!isBypassTimer && secondsRemaining > 0}
            disabledMessage={
              isBypassTimer ? "" : (
                !isTimerActive
                  ? `בבקשה הקשיבו לשיר לפחות ${MIN_LISTEN_TIME} שניות לפני שליחת פידבק`
                  : `ניתן לשלוח דירוג בעוד ${secondsRemaining} שניות...`
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
