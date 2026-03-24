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
    const isMobile = window.innerWidth < 600 || window.innerHeight < 820;
    const isSpotify = currentSong?.url.includes("spotify.com");
    return (isSpotify && isMobile) ? MIN_LISTEN_TIME_SPOTIFY_MOBILE : MIN_LISTEN_TIME;
  }, [currentSong?.url]);

  const [secondsRemaining, setSecondsRemaining] = useState(getRequiredTime());
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasRatedCurrent, setHasRatedCurrent] = useState(!!initialFeedback);
  const [userFeedback, setUserFeedback] = useState<any>(initialFeedback || null);
  const [currentSongStats, setCurrentSongStats] = useState<{ averageRating: number; totalFeedbacks: number } | null>(
    (currentSong as any)?.averageRating !== undefined
      ? { averageRating: (currentSong as any).averageRating, totalFeedbacks: (currentSong as any).totalFeedbacks }
      : null
  );
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(async () => {
      if (playerRef.current) {
        const [time, dur] = await Promise.all([
          playerRef.current.getPlaybackTime(),
          playerRef.current.getDuration()
        ]);
        setCurrentTime(time);
        if (dur > 0) setDuration(dur);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying]);



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
    setJustSubmitted(false);
    setUserFeedback(null);
    setCurrentSongStats(
      (songs[currentIndex] as any)?.averageRating !== undefined
        ? { averageRating: (songs[currentIndex] as any).averageRating, totalFeedbacks: (songs[currentIndex] as any).totalFeedbacks }
        : null
    );
    setPlayerError(null);
    setCurrentTime(0);
    setDuration(0);
  }, [getRequiredTime, currentIndex, songs]);

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
    } catch (err) {
      logAction({
        message: "Failed to pause before skip",
        data: { error: (err as Error)?.message || String(err) },
        source: "FeedContainer.tsx:handleSkip"
      });
    }
    resetSongState();
    setCurrentIndex((prev) => (prev + 1) % songs.length);
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
  const isProminentNext = !isPlaying && hasRatedCurrent;

  return (
    <div className={styles.feedWrapper}>
      <div className={styles.songCard}>
        <div className={styles.topHeader}>
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

        <div className={styles.controlsWrapper}>
          <div className={styles.actions}>
            {isHiddenPlayer ? (
              <button
                className={isProminentNext ? styles.btnSkip : (isPlaying ? styles.btnPause : styles.btnPlay)}
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
              <button className={isProminentNext ? styles.btnSkip : styles.btnPlay} onClick={handlePlayOld}>
                <span>להקשיב</span>
              </button>
            )}

            <SignedIn>
              {(songs.length > 1 || hasRatedCurrent) && (
                <button
                  className={isProminentNext ? styles.btnPlay : styles.btnSkip}
                  onClick={hasRatedCurrent ? handleRemoveCurrent : handleSkip}
                >
                  {hasRatedCurrent ? "שיר הבא" : "שיר אחר"}
                </button>
              )}
            </SignedIn>
          </div>

          <div className={`${styles.progressContainer} ${duration > 0 ? styles.visible : ""}`}>
            <div
              className={styles.progressBar}
              style={{ width: `${duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0}%` }}
            />
          </div>
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
                    ? `שליחת פידבק (אנונימי)`
                    : `ניתן לשלוח פידבק בעוד ${secondsRemaining} שניות${!isTimerActive ? " (מושהה)" : "..."}`
                )
              }
              onSuccess={(feedback, stats) => {
                if (feedback) {
                  setUserFeedback(feedback);
                  if (stats) setCurrentSongStats(stats);
                  setJustSubmitted(true);
                }

                if (isPlaying) {
                  // Transition immediately while song plays
                  setHasRatedCurrent(true);
                } else {
                  // Wait for the success popup to finish
                  setTimeout(() => {
                    handleRemoveCurrent();
                  }, SUCCESS_MESSAGE_DURATION);
                }
              }}
            />
          )}

          {hasRatedCurrent && userFeedback && (
            <div className={styles.ratedContainer}>
              <div className={styles.ratedHeader}>
                <CheckCircle2 size={18} />
                <span>{justSubmitted ? "תודה! הפידבק שלך נשמר" : "כבר נתת פידבק על השיר 👑"}</span>
              </div>

              {justSubmitted && currentSongStats ? (
                <div className={styles.ratedStatsContainer}>
                  <p className={styles.ratedStatsTitle}>
                    דירוג מאזינים ממוצע: <span className={styles.ratedStatsValue}>{currentSongStats.averageRating.toFixed(1)}</span>
                  </p>
                </div>
              ) : (
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
                        {[1, 2, 3, 4, 5].map((star) => (
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
              )}

              {userFeedback.comment && (
                <div className={styles.ratedComment}>
                  {userFeedback.comment}
                </div>
              )}
            </div>
          )}
        </div>
        <DashboardLink href="/" text="חזרה לדף הבית" className={styles.dashboardLinkMargin} />
      </div>
    </div>
  );
}
