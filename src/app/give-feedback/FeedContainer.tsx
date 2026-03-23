"use client";
import { SignedIn } from "@clerk/nextjs";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./feed.module.css";
import FeedbackForm from "@/components/FeedbackForm";
import UrlPlayer, { getEmbedUrl, type UrlPlayerHandle } from "@/components/UrlPlayer";
import DashboardLink from "@/components/DashboardLink";
import { Play, Pause, ArrowRight, CheckCircle2, Star } from "lucide-react";
import Link from "next/link";
import { MIN_LISTEN_TIME, MIN_LISTEN_TIME_SPOTIFY_MOBILE, SUCCESS_MESSAGE_DURATION } from "@/lib/constants";
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

interface Feedback {
  id: string;
  lyrics: number;
  composition: number;
  production: number;
  overall: number;
  comment: string;
  createdAt: string;
}

interface FeedContainerProps {
  initialSongs: Song[];
  initialFeedback?: Feedback | null;
}

export default function FeedContainer({ initialSongs, initialFeedback }: FeedContainerProps) {
  const [songs, setSongs] = useState(initialSongs);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSong = songs[currentIndex];

  const getRequiredTime = useCallback(() => {
    if (typeof window === 'undefined') return MIN_LISTEN_TIME;
    const isMobile = window.innerWidth < 600;
    const isSpotify = currentSong?.url.includes("spotify.com");
    return (isSpotify && isMobile) ? MIN_LISTEN_TIME_SPOTIFY_MOBILE : MIN_LISTEN_TIME;
  }, [currentSong?.url]);

  const [secondsRemaining, setSecondsRemaining] = useState(getRequiredTime());
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasRatedCurrent, setHasRatedCurrent] = useState(!!initialFeedback);
  const [userFeedback, setUserFeedback] = useState<Feedback | null>(initialFeedback || null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const playerRef = useRef<UrlPlayerHandle>(null);

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
    setPlayerError(null);
  }, []);

  const onPlayerPause = useCallback(() => {
    setIsTimerActive(false);
    setIsPlaying(false);
  }, []);

  const onPlayerEnded = useCallback(() => {
    setIsTimerActive(false);
    setIsPlaying(false);
    setSecondsRemaining(0);
  }, []);

  const resetSongState = useCallback(() => {
    setSecondsRemaining(getRequiredTime());
    setIsTimerActive(false);
    setIsPlaying(false);
    setIsBuffering(false);
    setHasRatedCurrent(false);
    setPlayerError(null);
  }, [getRequiredTime]);

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
    
    // Provide a human-readable error based on typical browser NotSupported/NotAllowed errors
    const errStr = (error as Error)?.message || String(error);
    if (errStr.includes("NotSupportedError") || errStr.includes("no supported sources")) {
      setPlayerError("לא ניתן לנגן קובץ זה - ייתכן שהפורמט אינו נתמך או שהקובץ פגום.");
    } else {
      setPlayerError("שגיאה בטעינת הנגן. אנא נסו לרענן או לעבור לשיר הבא.");
    }
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
      if (songs.length <= 1) return prev;
      let nextIndex = prev;
      // Pick a random index that isn't the current one
      while (nextIndex === prev) {
        nextIndex = Math.floor(Math.random() * songs.length);
      }
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
  const isSpotify = currentSong.url.includes("spotify.com");
  const isAudio = !!currentSong.url.match(/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i) || currentSong.url.includes("r2.dev");
  const isBypassTimer = false;
  const isHiddenPlayer = isYouTube || isSpotify || isAudio;

  return (
    <div className={styles.feedWrapper}>
      <div className={styles.songCard}>
        <Link href="/" className={styles.backButton} title="חזרה לדף הבית">
          <ArrowRight size={20} />
        </Link>
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
                  onEnded={onPlayerEnded}
                  onReady={() => setIsBuffering(false)}
                  onError={onPlayerError}
                  isHidden={isHiddenPlayer}
                />
              )}
            </motion.div>
          </AnimatePresence>
          {playerError && (
            <div className={styles.errorMsg} style={{ marginTop: '0.5rem', textAlign: 'center' }}>
              {playerError}
            </div>
          )}
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

          <SignedIn>
            {(songs.length > 1 || hasRatedCurrent) && (
              <button
                className={styles.btnSkip}
                onClick={hasRatedCurrent ? handleRemoveCurrent : handleSkip}
              >
                {hasRatedCurrent ? "שיר הבא" : "דלג"}
              </button>
            )}
          </SignedIn>
        </div>

        <div className={styles.feedbackSection}>
          {!hasRatedCurrent && (
            <FeedbackForm
              songId={currentSong.id}
              key={currentSong.id}
              getPlayedSeconds={getPlayedSeconds}
              isPlaying={isPlaying}
              isDisabled={!isBypassTimer && secondsRemaining > 0}
              disabledMessage={
                isBypassTimer ? "" : (
                  secondsRemaining >= getRequiredTime()
                    ? `תנו סיכוי לשיר לפחות ${getRequiredTime()} שניות לפני שליחת פידבק (אנונימי)`
                    : `ניתן לשלוח פידבק בעוד ${secondsRemaining} שניות${!isTimerActive ? " (מושהה)" : "..."}`
                )
              }
              onSuccess={(feedback) => {
                if (feedback) setUserFeedback(feedback);
                setTimeout(() => {
                  if (isPlaying) {
                    setHasRatedCurrent(true);
                  } else {
                    handleRemoveCurrent();
                  }
                }, SUCCESS_MESSAGE_DURATION);
              }}
            />
          )}

          {hasRatedCurrent && userFeedback && (
            <div className={styles.ratedContainer}>
              <div className={styles.ratedHeader}>
                <CheckCircle2 size={18} />
                <span>כבר נתת פידבק על השיר 👑</span>
              </div>

              <div className={styles.ratedGrid}>
                {[
                  { label: "מילים", value: userFeedback.lyrics },
                  { label: "לחן", value: userFeedback.composition },
                  { label: "ביצוע", value: userFeedback.production },
                  { label: "כללי", value: userFeedback.overall },
                ].map((item, idx) => (
                  <div key={idx} className={styles.ratedItem}>
                    <span className={styles.ratedLabel}>{item.label}</span>
                    <div className={styles.ratedStars}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={14}
                          fill={item.value >= star ? "currentColor" : "none"}
                          strokeWidth={2}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {userFeedback.comment && (
                <div className={styles.ratedComment}>
                  {userFeedback.comment}
                </div>
              )}

              <div className={styles.successMessageInline} style={{ marginTop: '1.5rem' }}>
                <p>הפידבק נשמר במערכת. ניתן להמשיך להאזין או לעבור לשיר הבא.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <DashboardLink href="/" text="חזרה לדף הבית" className={styles.dashboardLinkMargin} />
    </div>
  );
}
