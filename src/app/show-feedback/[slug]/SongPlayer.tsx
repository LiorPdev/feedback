"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import UrlPlayer, { UrlPlayerHandle, getEmbedUrl } from "@/components/UrlPlayer";
import styles from "./show-feedback.module.css";

interface SongPlayerProps {
  url: string;
}

export default function SongPlayer({ url }: SongPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef<UrlPlayerHandle>(null);

  // Snappy fallback: Only run when the URL is first loaded or changed.
  // We do NOT depend on isReady to prevent restart loops.
  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted) {
        setIsReady(true);
      }
    }, 2500);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [url]);

  const togglePlay = () => {
    // Non-blocking: internal player handles play logic even if ready signal is late
    if (isPlaying) {
      playerRef.current?.pause();
      setIsPlaying(false);
    } else {
      playerRef.current?.play();
      setIsPlaying(true);
    }
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div className={styles.playerContainer}>
      {embedUrl && (
        <button 
          className={`${styles.playButton} ${isPlaying ? styles.isPlaying : ""}`} 
          onClick={togglePlay}
          title={isPlaying ? "הפסקה" : "השמעה"}
        >
          {!isReady ? (
            <div className={styles.loadingSpinnerBasic}>
              <Loader2 size={24} className={styles.spinningIcon} />
            </div>
          ) : isPlaying ? (
            <Pause size={24} fill="currentColor" />
          ) : (
            <Play size={24} fill="currentColor" style={{ marginLeft: '2px' }} />
          )}
        </button>
      )}

      {/* 
        Standard hidden player: Matches GiveFeedback logic perfectly. 
        isHidden={true} is the proven way to hide without breaking the API.
      */}
      <UrlPlayer 
        ref={playerRef}
        url={url}
        onReady={() => setIsReady(true)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsReady(true)}
        isHidden={true}
      />
    </div>
  );
}
