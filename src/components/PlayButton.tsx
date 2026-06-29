/**
 * Generic reusable Play button that wraps UrlPlayer.
 * Supports YouTube and audio file URLs.
 * Dispatches a global "play-button-play" event so multiple instances
 * on the same page will stop each other automatically.
 *
 * MOBILE NOTE: iOS Safari (and Chrome on iOS) only allow audio/video.play()
 * within a synchronous user-gesture call stack. React setState → re-render →
 * DOM mount is always async, so we CANNOT lazy-mount UrlPlayer on the first click
 * and then call play() — the gesture context is gone by then.
 *
 * Solution: always pre-render UrlPlayer (same pattern as SongPlayer in show-feedback).
 * - Audio: preload="none" so zero bytes are fetched before the user taps.
 * - YouTube: the iframe loads eagerly, but YouTube's own autoplay policy already
 *   requires user interaction, so this is acceptable.
 */
"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import UrlPlayer, { UrlPlayerHandle } from "@/components/UrlPlayer";
import styles from "./PlayButton.module.css";

const PLAY_EVENT = "play-button-play";

interface PlayButtonProps {
  url: string;
  songId?: string;
  /** Diameter of the button in px. Default: 32 */
  size?: number;
  /** Extra class applied to the button element */
  className?: string;
  /** Extra class applied to the button when playing */
  playingClassName?: string;
  playSource?: string;
}

export default function PlayButton({ url, songId, size = 32, className, playingClassName, playSource }: PlayButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef<UrlPlayerHandle>(null);
  const instanceId = useRef(`${url}-${songId ?? ""}`);

  // Allow other PlayButton instances to stop this one
  useEffect(() => {
    const handleOther = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id !== instanceId.current) {
        playerRef.current?.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener(PLAY_EVENT, handleOther);
    return () => window.removeEventListener(PLAY_EVENT, handleOther);
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      playerRef.current?.pause();
      setIsPlaying(false);
    } else {
      window.dispatchEvent(
        new CustomEvent(PLAY_EVENT, { detail: { id: instanceId.current } })
      );
      // playerRef.current is always populated (UrlPlayer is always pre-rendered),
      // so this play() call is synchronous within the user-gesture call stack — 
      // required for iOS Safari to allow audio playback.
      playerRef.current?.play();
      setIsPlaying(true);
    }
  };

  const handleReady = () => {
    setIsReady(true);
  };

  const iconSize = Math.round(size * 0.45);

  return (
    <div className={styles.wrapper}>
      <button
        className={`${styles.btn} ${isPlaying ? styles.playing : ""} ${className ?? ""} ${isPlaying && playingClassName ? playingClassName : ""}`}
        style={{ width: size, height: size }}
        onClick={togglePlay}
        title={isPlaying ? "עצור" : "נגן"}
        aria-label={isPlaying ? "עצור" : "נגן"}
        type="button"
      >
        {isPlaying && !isReady ? (
          <Loader2 size={iconSize} className={styles.spin} />
        ) : isPlaying ? (
          <Pause size={iconSize} fill="currentColor" />
        ) : (
          <Play size={iconSize} fill="currentColor" style={{ marginLeft: "1px" }} />
        )}
      </button>

      {/* Always pre-rendered so playerRef.current is populated before any click.
          This mirrors SongPlayer (show-feedback) which is proven to work on mobile.
          Audio: preload="none" prevents network requests until play() is called.
          YouTube: iframe loads eagerly but that's unavoidable for mobile gesture support. */}
      <UrlPlayer
        ref={playerRef}
        url={url}
        songId={songId}
        isHidden
        onReady={handleReady}
        onError={() => setIsReady(true)}
        onPlay={() => {
          setIsPlaying(true);
          window.dispatchEvent(
            new CustomEvent(PLAY_EVENT, { detail: { id: instanceId.current } })
          );
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        playSource={playSource}
      />
    </div>
  );
}
