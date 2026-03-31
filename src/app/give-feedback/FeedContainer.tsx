"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Play, SquareStop, CheckCircle2, Star, Coins, Loader2 } from "lucide-react";
import FeedbackForm from "@/components/FeedbackForm";
import UrlPlayer, { getEmbedUrl, type UrlPlayerHandle } from "@/components/UrlPlayer";
import DashboardLink from "@/components/DashboardLink";
import BackButton from "@/components/BackButton";
import ArtistSocials from "@/components/ArtistSocials";
import PopupMsg from "@/components/PopupMsg";
import { MIN_LISTEN_TIME, SUCCESS_MESSAGE_DURATION } from "@/lib/constants";
import { logAction } from "@/app/actions/logs";
import { recordListenEvent } from "@/app/actions/songs";
import styles from "./feed.module.css";

interface Song {
  id: string;
  title: string;
  genre: string;
  url: string;
  slug: string;
  user?: {
    name: string | null;
    socialLinks?: string | null;
  };
}

interface Feedback {
  id: string;
  cat2: number;
  cat3: number;
  overall: number;
  comment: string;
  createdAt: string;
}

interface FeedContainerProps {
  initialSongs: Song[];
  initialFeedback?: Feedback | null;
  from?: string;
  initialSongSlug?: string;
  showInsufficientCredits?: boolean;
}

export default function FeedContainer({ initialSongs, initialFeedback, from, initialSongSlug, showInsufficientCredits = false }: FeedContainerProps) {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [showCreditPopup, setShowCreditPopup] = useState(showInsufficientCredits);
  const [songs, setSongs] = useState(initialSongs);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSong = songs[currentIndex];
  const getRequiredTime = useCallback(() => { return MIN_LISTEN_TIME; }, []);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(getRequiredTime());
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRatedCurrent, setHasRatedCurrent] = useState(!!initialFeedback);
  const [userFeedback, setUserFeedback] = useState<Feedback | null>(initialFeedback || null);
  const [currentSongStats, setCurrentSongStats] = useState<{ averageRating: number; totalFeedbacks: number } | null>(
    (currentSong as unknown as { averageRating?: number; totalFeedbacks?: number })?.averageRating !== undefined
      ? {
        averageRating: (currentSong as unknown as { averageRating: number }).averageRating,
        totalFeedbacks: (currentSong as unknown as { totalFeedbacks: number }).totalFeedbacks
      }
      : null
  );
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true); // true until player fires onReady
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAuthDismissed, setIsAuthDismissed] = useState(false);
  const playerRef = useRef<UrlPlayerHandle>(null);
  const currentSongIdRef = useRef<string | null>(currentSong?.id ?? null);
  const currentTimeRef = useRef<number>(0);

  useEffect(() => {
    currentSongIdRef.current = currentSong?.id ?? null;
  }, [currentSong?.id]);

  // Flush on unmount/route change
  useEffect(() => {
    return () => {
      if (currentSongIdRef.current && currentTimeRef.current >= 2) {
        recordListenEvent({
          songId: currentSongIdRef.current,
          playedSeconds: Math.floor(currentTimeRef.current)
        }).catch(() => null);
      }
    };
  }, []);

  // Flushes the listen event for a given song — fire-and-forget
  const flushListenEvent = useCallback(async (songId: string) => {
    if (!songId) return;
    // Prefer the ref as it's updated every 500ms and doesn't rely on the player being mounted
    const secs = Math.floor(currentTimeRef.current);
    recordListenEvent({ songId, playedSeconds: secs }).catch(() => null);
  }, []);

  const embedUrl = currentSong ? getEmbedUrl(currentSong.url) : null;
  const showPlayer = !!embedUrl;

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
        currentTimeRef.current = time;
        if (dur > 0) setDuration(dur);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const closeCreditPopup = () => {
    setShowCreditPopup(false);
    // Cleanup URL to avoid showing popup again on refresh
    const url = new URL(window.location.href);
    url.searchParams.delete('insufficient_credits');
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const onPlayerPlay = useCallback(() => {
    setIsTimerActive(true);
    setIsPlaying(true);
    setIsTransitioning(false);
    setPlayerError(null);
  }, []);

  const onPlayerStop = useCallback(() => {
    setIsTimerActive(false);
    setIsPlaying(false);
  }, []);

  const onPlayerEnded = useCallback(() => {
    if (currentSongIdRef.current) flushListenEvent(currentSongIdRef.current);
    setIsTimerActive(false);
    setIsPlaying(false);
    setSecondsRemaining(0);
  }, [flushListenEvent]);

  const resetSongState = useCallback(() => {
    setSecondsRemaining(getRequiredTime());
    setIsTimerActive(false);
    const currentSongFromList = songs[currentIndex] as unknown as { averageRating?: number; totalFeedbacks?: number };
    setCurrentSongStats(
      currentSongFromList?.averageRating !== undefined
        ? { averageRating: currentSongFromList.averageRating as number, totalFeedbacks: currentSongFromList.totalFeedbacks as number }
        : null
    );
    setPlayerError(null);
    setCurrentTime(0);
    currentTimeRef.current = 0;
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
    setIsPlaying(false);
    setIsTransitioning(false);

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
    // Record listen event before moving to next song
    if (currentSongIdRef.current) flushListenEvent(currentSongIdRef.current);
    resetSongState();
    setHasRatedCurrent(false);
    setJustSubmitted(false);
    setUserFeedback(null);
    setIsPlaying(false);
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % songs.length);
  };

  const handleRemoveCurrent = () => {
    // Record listen event before removing current song
    if (currentSongIdRef.current) flushListenEvent(currentSongIdRef.current);
    setSongs((prevSongs) => {
      const updatedSongs = prevSongs.filter((_, i) => i !== currentIndex);
      if (updatedSongs.length === 0) return [];

      // Update index if needed
      resetSongState();
      setHasRatedCurrent(false);
      setJustSubmitted(false);
      setUserFeedback(null);
      setIsPlaying(false);
      setIsTransitioning(true);
      return updatedSongs;
    });
  };

  const handlePlayOld = () => {
    if (currentSong?.url) {
      window.open(currentSong.url, "_blank");
    }
  };

  const togglePlayback = () => {
    if (!playerRef.current || (!isSignedIn && !isAuthDismissed)) return;
    if (isPlaying) {
      setIsPlaying(false); // Optimistic UI update
      setIsTimerActive(false);
      playerRef.current.pause();
    } else {
      setIsPlaying(true); // Optimistic UI update
      setIsTimerActive(true);
      playerRef.current.play();
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
  const isAudio = !!currentSong.url.match(/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i) || currentSong.url.includes("r2.dev");
  const isBypassTimer = from === "top-rated" && currentSong?.slug === initialSongSlug;
  const isHiddenPlayer = isYouTube || isAudio;
  const isProminentNext = !isPlaying && hasRatedCurrent;

  return (
    <div className={styles.feedWrapper}>
      <div className={styles.songCard}>
        <div className={styles.topHeader}>
          <BackButton href="/" title="חזרה לדף הבית" className={styles.backButton} />
          <div className={styles.headerRow}>
            <h2 className={styles.title}>
              {currentSong.title}
            </h2>
            {currentSong.genre && (
              <span className={styles.genreInline}>
                ({currentSong.genre})
              </span>
            )}
            <div className={styles.headerSocialsContainer}>
              <ArtistSocials socialLinks={currentSong.user?.socialLinks} />
            </div>
          </div>
        </div>

        <div className={styles.playerSection}>
          <motion.div
            key={currentSong.id + "-player"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {showPlayer && (
              <UrlPlayer
                ref={playerRef}
                url={currentSong.url}
                onPlay={onPlayerPlay}
                onPause={onPlayerStop}
                onEnded={onPlayerEnded}
                onReady={() => setIsTransitioning(false)}
                onError={onPlayerError}
                isHidden={isHiddenPlayer}
              />
            )}
          </motion.div>
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
                className={isProminentNext ? styles.btnSkip : (isPlaying ? styles.btnStop : styles.btnPlay)}
                onClick={togglePlayback}
                disabled={((!isSignedIn && !isAuthDismissed) && isLoaded) || isTransitioning}
              >
                {isPlaying ? (
                  <>
                    {isTransitioning ? <Loader2 size={20} className={styles.spinIcon} /> : <SquareStop size={20} fill="currentColor" />}
                    <span>עצור</span>
                  </>
                ) : (
                  <>
                    {isTransitioning ? <Loader2 size={20} className={styles.spinIcon} /> : <Play size={20} fill="currentColor" />}
                    <span>נגן</span>
                  </>
                )}
              </button>
            ) : !embedUrl && (
              <button className={isProminentNext ? styles.btnSkip : styles.btnPlay} onClick={handlePlayOld}>
                <span>להקשיב</span>
              </button>
            )}

            {(isSignedIn || isAuthDismissed) && (songs.length > 1 || hasRatedCurrent) && (
              <button
                className={isProminentNext ? styles.btnPlay : styles.btnSkip}
                onClick={hasRatedCurrent ? handleRemoveCurrent : handleSkip}
              >
                {hasRatedCurrent ? "שיר הבא" : "שיר אחר"}
              </button>
            )}
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
              initialSource={from}
              onAuthDismiss={() => setIsAuthDismissed(true)}
              isAuthDismissed={isAuthDismissed}
              disabledMessage={
                isBypassTimer ? "" : (
                  secondsRemaining >= getRequiredTime()
                    ? `שליחת פידבק (אנונימי)`
                    : `ניתן לשלוח פידבק בעוד ${secondsRemaining} שניות${!isTimerActive ? " (מושהה)" : "..."}`
                )
              }
              onSuccess={(feedback, stats) => {
                if (feedback) {
                  setUserFeedback(feedback as Feedback);
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
                    { label: "הפקה", value: userFeedback.cat2 },
                    { label: "שירה", value: userFeedback.cat3 },
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
      </div>

      <PopupMsg
        isOpen={showCreditPopup}
        onClose={closeCreditPopup}
        title="נגמרו תווי הקרדיט"
        message={
          <div>
            <div>החדשות הטובות: על כל פידבק שתיתנו כאן, תקבלו תווי קרדיט נוספים!</div>
          </div>
        }
        icon={<Coins size={48} />}
        buttonText="הבנתי, בואו ניתן קצת פידבק לאחרים"
      />
    </div>
  );
}


