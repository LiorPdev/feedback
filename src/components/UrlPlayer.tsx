/**
 * This module manages YouTube APIs inside an Iframe.
 * 
 * LINT OVERRIDES: `eslint-disable` comments were added intentionally. Do not change them 
 *    if it requires changing the code flow (e.g., switching from `mounted` to `useSyncExternalStore`), 
 *    as this might break the player loading timing.
 * 
 * DEAR DEVELOPERS (AND AIs): Change this code carefully!
 */

"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";
import { logAction } from "@/app/actions/logs";
import styles from "./UrlPlayer.module.css";

// Declare global types for APIs
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}
interface UrlPlayerProps {
  url: string;
  onPlay?: () => void;
  onPause?: () => void;
  onReady?: () => void;
  onError?: (error: unknown) => void;
  onEnded?: () => void;
  isHidden?: boolean;
}

export const getEmbedUrl = (url: string) => {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/
  );
  if (ytMatch) {
    const videoId = ytMatch[1].split(/[&?]/)[0];
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
  }

  // Audio files
  if (url.match(/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i) || url.includes("r2.dev")) {
    return url;
  }

  return null;
};


export interface UrlPlayerHandle {
  getPlaybackTime: () => Promise<number>;
  getDuration: () => Promise<number>;
  play: () => void;
  pause: () => void;
}

const UrlPlayer = forwardRef<UrlPlayerHandle, UrlPlayerProps>(({ url, onPlay, onPause, onReady, onError, onEnded, isHidden = false }, ref) => {
  const isUnmountingRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setOrigin(window.location.origin);
  }, []);

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isAudio = url.match(/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i) || url.includes("r2.dev");

  const embedUrl = getEmbedUrl(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onEndedRef = useRef(onEnded);


  useEffect(() => {
    onPlayRef.current = onPlay;
    onPauseRef.current = onPause;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
    onEndedRef.current = onEnded;
  }, [onPlay, onPause, onReady, onError, onEnded]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const guard = (fn: ((...args: any[]) => void) | undefined) => (...args: any[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!isUnmountingRef.current && fn) (fn as any)(...args);
  };

  useImperativeHandle(ref, () => ({
    getPlaybackTime: async () => {
      if (isYouTube && playerRef.current) {
        if (typeof playerRef.current.getCurrentTime === 'function') {
          return Math.floor(playerRef.current.getCurrentTime());
        }
      } else if (isAudio && audioRef.current) {
        return Math.floor(audioRef.current.currentTime);
      }
      return 0;
    },
    getDuration: async () => {
      if (isYouTube && playerRef.current) {
        if (typeof playerRef.current.getDuration === 'function') {
          return Math.floor(playerRef.current.getDuration());
        }
      } else if (isAudio && audioRef.current) {
        return Math.floor(audioRef.current.duration || 0);
      }
      return 0;
    },
    play: () => {
      try {
        if (isYouTube && playerRef.current?.playVideo) {
          playerRef.current.playVideo();
        } else if (isAudio && audioRef.current) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((e) => {
              logAction({ message: "Audio play promise rejected", data: e?.message || e, source: "UrlPlayer.tsx:play" });
              if (onErrorRef.current) guard(onErrorRef.current)(e);
            });
          }
        }
      } catch (e) {
        logAction({ message: "Play error", data: e, source: "UrlPlayer.tsx:play" });
      }
    },
    pause: () => {
      try {
        if (isYouTube && playerRef.current?.pauseVideo) {
          playerRef.current.pauseVideo();
        } else if (isAudio && audioRef.current) {
          audioRef.current.pause();
        }
      } catch (e) {
        logAction({ message: "Pause error", data: e, source: "UrlPlayer.tsx:pause" });
      }
    }
  }));

  useEffect(() => {
    if (!mounted || !embedUrl || !iframeRef.current) return;

    if (isYouTube) {
      const initYT = () => {
        if (!window.YT || !window.YT.Player) {
          // If YT is loading but not ready, check again shortly
          setTimeout(initYT, 100);
          return;
        }

        try {
          if (!iframeRef.current) {
            logAction({
              message: "YouTube Init: No iframe ref",
              data: { url, origin },
              source: "UrlPlayer.tsx:initYT"
            });
            return;
          }

          playerRef.current = new window.YT.Player(iframeRef.current, {
            playerVars: {
              origin: origin,
            },
            events: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onStateChange: (event: any) => {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  guard(onPlayRef.current)();
                } else if (event.data === window.YT.PlayerState.PAUSED) {
                  guard(onPauseRef.current)();
                } else if (event.data === window.YT.PlayerState.ENDED) {
                  guard(onPauseRef.current)();
                  guard(onEndedRef.current)();
                }
              },
              onReady: () => {
                guard(onReadyRef.current)();
              },
            },
          });
        } catch (e) {
          guard(onErrorRef.current)(e);
          logAction({
            message: "YouTube Player Init Error",
            data: {
              url: url,
              origin: origin,
              iframeExists: !!iframeRef.current,
              error: e instanceof Error ? {
                message: e.message,
                stack: e.stack,
                name: e.name
              } : String(e)
            },
            source: "UrlPlayer.tsx:initYT"
          });
        }
      };

      if (!window.YT) {
        // Load the script if not already present
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag = document.createElement("script");
          tag.src = "https://www.youtube.com/iframe_api";
          const firstScriptTag = document.getElementsByTagName("script")[0];
          firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        // Use the global callback if it's the first time
        const previousCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (previousCallback) previousCallback();
          initYT();
        };
      } else {
        initYT();
      }
    }

    return () => {
      // Cleanup
      isUnmountingRef.current = true;
      const player = playerRef.current;
      if (player) {
        try {
          if (isYouTube && typeof player.destroy === 'function') {
            // Only destroy if the player is still connected to its iframe
            player.destroy();
          }
        } catch (e) {
          // Swallow errors during cleanup but log to DB
          logAction({ message: "Player cleanup error", data: e, source: "UrlPlayer.tsx:cleanup" });
        }
      }
      playerRef.current = null;
    };
  }, [embedUrl, url, mounted, origin, isYouTube]);

  if (!mounted) {
    return (
      <div className={`${styles.playerWrapper} ${isHidden ? styles.hidden : ""}`} style={{ minHeight: "152px" }}>
        <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)" }}>
          טוען נגן...
        </div>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className={styles.fallbackPlayer}>
        <p>לא ניתן להציג נגן עבור הקישור הזה.</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className={styles.fallbackLink}>
          פתח בטאב חדש
        </a>
      </div>
    );
  }


  return (
    <div className={`${styles.playerWrapper} ${isHidden ? styles.hidden : ""}`}>
      {isAudio ? (
        <audio
          ref={audioRef}
          src={url}
          onPlay={() => guard(onPlayRef.current)()}
          onPause={() => guard(onPauseRef.current)()}
          onEnded={() => {
            guard(onPauseRef.current)();
            guard(onEndedRef.current)();
          }}
          onCanPlay={() => {
            guard(onReadyRef.current)();
          }}
          className={styles.audio}
          controls={!isHidden}
        />
      ) : (
        <iframe
          ref={iframeRef}
          width="100%"
          height="152"
          scrolling="no"
          frameBorder="no"
          allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          src={embedUrl || ""}
          title="Media Player"
          id="player-iframe"
          className={styles.iframe}
        ></iframe>
      )}
    </div>
  );
});

UrlPlayer.displayName = "UrlPlayer";

export default UrlPlayer;
