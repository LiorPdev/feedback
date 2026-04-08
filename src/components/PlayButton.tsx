/**
 * Generic reusable Play button that wraps UrlPlayer.
 * Supports YouTube and audio file URLs.
 * Dispatches a global "play-button-play" event so multiple instances
 * on the same page will stop each other automatically.
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
}

export default function PlayButton({ url, songId, size = 32, className, playingClassName }: PlayButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef<UrlPlayerHandle>(null);
  // Stable identity for this instance (used to ignore own events)
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
      playerRef.current?.play();
      setIsPlaying(true);
    }
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
      >
        {!isReady ? (
          <Loader2 size={iconSize} className={styles.spin} />
        ) : isPlaying ? (
          <Pause size={iconSize} fill="currentColor" />
        ) : (
          <Play size={iconSize} fill="currentColor" style={{ marginInlineEnd: "-1px" }} />
        )}
      </button>

      {/* Hidden player — handles actual audio/video playback */}
      <UrlPlayer
        ref={playerRef}
        url={url}
        songId={songId}
        isHidden
        onReady={() => setIsReady(true)}
        onError={() => setIsReady(true)}
        onPlay={() => {
          setIsPlaying(true);
          window.dispatchEvent(
            new CustomEvent(PLAY_EVENT, { detail: { id: instanceId.current } })
          );
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
}
