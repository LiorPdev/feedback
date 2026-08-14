"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, SquareStop, Coins, Loader2 } from "lucide-react";
import FeedbackForm from "@/components/FeedbackForm";
import UrlPlayer, { getEmbedUrl, type UrlPlayerHandle } from "@/components/UrlPlayer";
import DashboardLink from "@/components/DashboardLink";
import ManualBackButton from "@/components/ManualBackButton";
import ArtistSocials from "@/components/ArtistSocials";
import PopupMsg from "@/components/PopupMsg";
import { MIN_LISTEN_TIME } from "@/lib/constants";
import { logAction } from "@/app/actions/logs";
import Typewriter from "@/components/Typewriter";
import { useUtmMode } from "@/hooks/useUtmMode";
import { isYouTubeUrl, isAudioUrl } from "@/lib/song-validation";
import { openRegistrationGate } from "@/lib/auth-events";
import styles from "./feed.module.css";

function formatTime(timeInSeconds: number) {
  if (!timeInSeconds) return "00:00";
  const m = Math.floor(timeInSeconds / 60);
  const s = Math.floor(timeInSeconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface Song {
  id: string;
  title: string;
  genre: string;
  url: string;
  slug: string;
  fewWords?: string | null;
  artist?: string | null;
  user?: {
    name: string | null;
    socialLinks?: string | null;
  };
}

interface Feedback {
  id: string;
  overall: number;
  comment: string;
  createdAt: string;
}

interface FeedContainerProps {
  initialSongs: Song[];
  initialFeedback?: Feedback | null;
  from?: string;
  showInsufficientCredits?: boolean;
  backHome?: boolean;
  isLoggedIn: boolean;
}

export default function FeedContainer({
  initialSongs,
  initialFeedback,
  from,
  showInsufficientCredits = false,
  backHome = false,
  isLoggedIn
}: FeedContainerProps) {
  const router = useRouter();
  const [showCreditPopup, setShowCreditPopup] = useState(showInsufficientCredits);

  // Storage initialization
  const [songs, setSongs] = useState(() => {
    if (typeof window === "undefined") return initialSongs;
    try {
      const stored = sessionStorage.getItem("ad_rated_songs");
      if (!stored) return initialSongs;
      const ratedIds = JSON.parse(stored) as string[];
      return initialSongs.filter(s => !ratedIds.includes(s.id));
    } catch (e) {
      logAction({
        message: "Failed to load rated songs for filtering",
        source: "FeedContainer",
        data: { error: String(e) }
      });
      return initialSongs;
    }
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [originalFirstSongId] = useState(initialSongs[0]?.id);
  const [isJustRated, setIsJustRated] = useState(false);
  const currentSong = songs[currentIndex];
  const [secondsRemaining, setSecondsRemaining] = useState<number>(MIN_LISTEN_TIME);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);

  const hasRatedCurrent = !isJustRated && (
    currentSong?.id === originalFirstSongId && !!initialFeedback
  );
  const [isTransitioning, setIsTransitioning] = useState(true); // true until player fires onReady
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lastFeedbackId, setLastFeedbackId] = useState<string | null>(null);

  const { isUtmMode: isGuestEligible, isLoaded: isUtmLoaded } = useUtmMode();
  const isCheckingGuest = !isUtmLoaded;

  const playerRef = useRef<UrlPlayerHandle>(null);

  // Handle auth gate via global Navbar registration gate
  const shouldShowAuth = (!isLoggedIn && !isCheckingGuest && !isGuestEligible);

  useEffect(() => {
    if (shouldShowAuth) {
      openRegistrationGate({
        type: "give-feedback",
        redirectUrl: typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined,
        onClose: () => { window.location.href = "/"; }
      });
    }
  }, [shouldShowAuth]);

  const markSongAsRatedInSession = useCallback((songId: string) => {
    try {
      const stored = sessionStorage.getItem("ad_rated_songs");
      const prev = stored ? JSON.parse(stored) : [];
      const next = [...new Set([...prev, songId])];
      sessionStorage.setItem("ad_rated_songs", JSON.stringify(next));
    } catch (e) {
      logAction({
        message: "Failed to save session rated songs",
        source: "FeedContainer",
        data: { error: String(e) }
      });
    }
  }, []);

  const embedUrl = currentSong ? getEmbedUrl(currentSong.url) : null;
  const showPlayer = !!embedUrl;

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
    setIsTimerActive(false);
    setIsPlaying(false);
    setSecondsRemaining(0);
  }, []);

  const resetSongState = useCallback(() => {
    setSecondsRemaining(MIN_LISTEN_TIME);
    setIsTimerActive(false);
    setPlayerError(null);
    setCurrentTime(0);
    setDuration(0);
    setLastFeedbackId(null);
  }, []);

  // Fallback timer: YouTube API can be slow/flaky, ensure we never get stuck in transitioning state
  useEffect(() => {
    if (!isTransitioning) return;
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 2000); // 2 seconds fallback
    return () => clearTimeout(timer);
  }, [isTransitioning]);

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
        if (dur > 0) {
          setDuration(dur);
          if (time >= dur - 0.5) {
            onPlayerEnded();
          }
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, onPlayerEnded]);

  const onPlayerError = useCallback((error: unknown) => {
    setIsPlaying(false);
    setIsTransitioning(false);

    // Provide a human-readable error based on typical browser NotSupported/NotAllowed errors
    const errStr = (error as Error)?.message || String(error);
    if (errStr.includes("NotSupportedError") || errStr.includes("no supported sources")) {
      setPlayerError("לא ניתן לנגן קובץ זה - ייתכן שהפורמט אינו נתמך או שהקובץ פגום.");
    } else {
      setPlayerError("שגיאה בטעינת הנגן. אנא נסו לרענן או לעבור לשיר הבא.");
    }
  }, []);

  const handleSkip = () => {
    if (songs.length <= 1) return;
    resetSongState();
    setIsJustRated(false);
    setIsPlaying(false);
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % songs.length);
  };

  const handleRemoveCurrent = () => {
    setSongs((prevSongs) => {
      const updatedSongs = prevSongs.filter((_, i) => i !== currentIndex);

      setCurrentIndex((prev) => {
        if (prev >= updatedSongs.length) {
          return 0;
        }
        return prev;
      });

      if (updatedSongs.length === 0) return [];

      // Update index if needed
      resetSongState();
      setIsJustRated(false);
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
    if (!playerRef.current || isActionPending) return;

    // If not logged in AND not coming from an ad, block playback
    if (!isLoggedIn && !isGuestEligible) {
      return;
    }

    setIsActionPending(true);
    setTimeout(() => {
      setIsActionPending(false);
    }, 800); // 800ms throttle to prevent spam click state desync

    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play();
      setIsPlaying(true);
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

  const isYouTube = isYouTubeUrl(currentSong.url);
  const isAudio = isAudioUrl(currentSong.url);
  const isHiddenPlayer = isYouTube || isAudio;
  const showSpinner = isYouTube && isTransitioning;
  const isProminentNext = !isPlaying && hasRatedCurrent;
  const showBack = true;
  const backUrl = backHome ? "/" : undefined;

  return (
    <div className={styles.feedWrapper}>
      <div className={styles.songCard}>
        {/* Song Title Section */}
        <div className={styles.topHeader}>
          <div className={`${styles.headerSide} ${styles.headerRight}`}>
            {showBack && (
              <ManualBackButton
                url={backUrl}
                className={styles.backButton}
              />
            )}
          </div>

          <div className={styles.headerCenter}>
            <h2
              className={styles.title}
              title={currentSong.artist || currentSong.user?.name || "אמן לא ידוע"}
            >
              {currentSong.title}
            </h2>
            {currentSong.genre && (
              <span className={styles.genreInline}>({currentSong.genre})</span>
            )}
          </div>

          <div className={`${styles.headerSide} ${styles.headerLeft}`}>
            <div className={styles.inlineSocials}>
              <ArtistSocials socialLinks={currentSong.user?.socialLinks} />
            </div>
          </div>
        </div>

        <Typewriter key={currentSong.id} text={currentSong.fewWords || ""} isPlaying={isPlaying} />

        {/* Player Section */}
        <div className={styles.playerSection}>
          <motion.div
            key="static-player-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {showPlayer && (
              <UrlPlayer
                ref={playerRef}
                url={currentSong.url}
                songId={currentSong.id}
                onPlay={onPlayerPlay}
                onPause={onPlayerStop}
                onEnded={onPlayerEnded}
                onReady={() => setIsTransitioning(false)}
                onError={onPlayerError}
                isHidden={isHiddenPlayer}
                feedbackId={lastFeedbackId}
                playSource="feed"
              />
            )}
          </motion.div>
          {playerError && (
            <div className={styles.errorMsg} style={{ marginTop: '0.5rem', textAlign: 'center' }}>
              {playerError}
            </div>
          )}
        </div>

        {/* Controls Wrapper */}
        <div className={styles.controlsWrapper}>
          <div className={styles.actions}>
            {isHiddenPlayer ? (
              <button
                className={isProminentNext ? styles.btnSkip : (isPlaying ? styles.btnStop : styles.btnPlay)}
                onClick={togglePlayback}
                disabled={(!isLoggedIn && !isGuestEligible) || showSpinner || isActionPending}
              >
                {isPlaying ? (
                  <>
                    {showSpinner ? <Loader2 size={20} className={styles.spinIcon} /> : <SquareStop size={20} fill="currentColor" />}
                    <span>עצור</span>
                  </>
                ) : (
                  <>
                    {showSpinner ? <Loader2 size={20} className={styles.spinIcon} /> : <Play size={20} fill="currentColor" />}
                    <span>נגן</span>
                  </>
                )}
              </button>
            ) : !embedUrl && (
              <button className={isProminentNext ? styles.btnSkip : styles.btnPlay} onClick={handlePlayOld}>
                <span>להקשיב</span>
              </button>
            )}

            {(isLoggedIn || isGuestEligible) && (songs.length > 1 || hasRatedCurrent) && (
              <button
                className={isProminentNext ? styles.btnPlay : styles.btnSkip}
                onClick={hasRatedCurrent ? handleRemoveCurrent : handleSkip}
              >
                {hasRatedCurrent ? "שיר הבא" : "שיר אחר"}
              </button>
            )}
          </div>

          <div className={`${styles.progressRow} ${duration > 0 ? styles.visible : ""}`}>
            <span className={styles.timeLabel}>{formatTime(currentTime)}</span>
            <div className={styles.progressContainer}>
              <div
                className={styles.progressBar}
                style={{ width: `${duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0}%` }}
              />
            </div>
            <span className={styles.timeLabel}>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Feedback card */}
        <div className={styles.feedbackSection}>
          {!hasRatedCurrent && (
            <FeedbackForm
              songId={currentSong.id}
              songSlug={currentSong.slug}
              key={currentSong.id}
              getPlayedSeconds={getPlayedSeconds}
              isPlaying={isPlaying}
              isDisabled={secondsRemaining > 0}
              initialSource={from}
              onSuccess={(fb?: { id?: string }) => {
                setIsJustRated(true);
                if (fb?.id) {
                  setLastFeedbackId(fb.id);
                }
              }}
              onPopupClose={() => {
                setIsJustRated(false);
                if (!isLoggedIn) {
                  markSongAsRatedInSession(currentSong.id);
                }
                handleRemoveCurrent();
              }}
              disabledMessage={
                secondsRemaining >= MIN_LISTEN_TIME
                  ? (isLoggedIn || isGuestEligible ? `שליחת פידבק` : `שליחת פידבק (אנונימי)`)
                  : `ניתן לשלוח פידבק בעוד ${secondsRemaining} שניות${!isTimerActive ? " (מושהה)" : "..."}`
              }
            />
          )}

          {hasRatedCurrent && initialFeedback && (
            <div className={styles.ratedContainer}>
              <div className={styles.ratedHeader}>
                <span>כבר נתת פידבק על השיר 👑</span>
              </div>

              <div className={styles.ratedGrid}>
                <div className={styles.ratedItem}>
                  <span className={styles.ratedSliderValue}>{initialFeedback.overall}/10</span>
                </div>
              </div>

              {initialFeedback.comment && (
                <div className={styles.ratedComment}>
                  {initialFeedback.comment}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* This popup is shown when the user attempts to submit a new song but has insufficient credits. */}
      <PopupMsg
        isOpen={showCreditPopup}
        onClose={closeCreditPopup}
        icon={<Coins size={48} />}
        title="נגמרו תווי הקרדיט"
        message={
          <div>החדשות הטובות: על כל פידבק שתיתנו, תקבלו תווי קרדיט נוספים.</div>
        }
        buttonText="הבנתי, בואו ניתן קצת פידבק לאחרים"
      />

    </div>
  );
}


