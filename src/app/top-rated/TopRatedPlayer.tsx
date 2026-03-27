"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import UrlPlayer, { UrlPlayerHandle } from "@/components/UrlPlayer";
import styles from "./top-rated.module.css";

interface TopRatedPlayerProps {
  url: string;
}

export default function TopRatedPlayer({ url }: TopRatedPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef<UrlPlayerHandle>(null);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted) {
        setIsReady(true);
      }
    }, 800);

    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [url]);

  const togglePlay = () => {
    if (isPlaying) {
      playerRef.current?.pause();
      setIsPlaying(false);
    } else {
      playerRef.current?.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className={styles.playerContainer}>
      <button 
        className={`${styles.playButton} ${isPlaying ? styles.isPlaying : ""}`} 
        onClick={togglePlay}
        title={isPlaying ? "הפסקה" : "השמעה"}
      >
        {!isReady ? (
          <Loader2 size={18} className={styles.spinningIcon} />
        ) : isPlaying ? (
          <Pause size={18} fill="currentColor" />
        ) : (
          <Play size={18} fill="currentColor" style={{ marginLeft: '1px' }} />
        )}
      </button>

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
