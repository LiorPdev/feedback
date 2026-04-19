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

import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from "react";
import { logAction } from "@/app/actions/logs";
import { recordListenEvent } from "@/app/actions/songs";
import { isYouTubeUrl, isAudioUrl, getYouTubeVideoId } from "@/lib/song-validation";
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
  songId?: string;
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
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
  }

  // Audio files
  if (isAudioUrl(url)) {
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

const UrlPlayer = forwardRef<UrlPlayerHandle, UrlPlayerProps>(({ url, songId, onPlay, onPause, onReady, onError, onEnded, isHidden = false }, ref) => {
  const isUnmountingRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setMounted(true);
    setOrigin(window.location.origin);
  }, []);

  const isYouTube = isYouTubeUrl(url);
  const isAudio = isAudioUrl(url);

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
  const songIdRef = useRef(songId);

  // Tracking refs
  const startTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const ytPendingPlayRef = useRef<boolean>(false);

  const latestUrlRef = useRef(url);
  useEffect(() => {
    latestUrlRef.current = url;
  }, [url]);

  // Track the initial iframe src so we never trigger a DOM-level reload of the iframe
  const [ytIframeSrc, setYtIframeSrc] = useState<string | null>(isYouTube ? embedUrl : null);
  useEffect(() => {
    if (isYouTube && !ytIframeSrc) {
      setYtIframeSrc(embedUrl);
    }
  }, [isYouTube, embedUrl, ytIframeSrc]);

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

  const flushListenEvent = useCallback(async () => {
    if (!songIdRef.current || !isPlayingRef.current) return;

    const endTime = currentTimeRef.current;
    const delta = Math.floor(endTime - startTimeRef.current);

    if (delta >= 5) { // 5000ms
      const id = songIdRef.current;
      recordListenEvent({ songId: id, playedSeconds: delta }).catch(() => null);
    }

    // Reset tracking for next session
    startTimeRef.current = endTime;
  }, []);

  const handlePlayStart = useCallback(async () => {
    if (isPlayingRef.current) return;

    // Get current playback time to set as start point
    let time = 0;
    if (isYouTube && playerRef.current?.getCurrentTime) {
      // Provide fallback of 0 if throwing
      try { time = playerRef.current.getCurrentTime(); } catch { time = 0; }
    } else if (isAudio && audioRef.current) {
      time = audioRef.current.currentTime;
    }

    startTimeRef.current = time;
    currentTimeRef.current = time;
    isPlayingRef.current = true;
  }, [isYouTube, isAudio]);

  const handlePlayStop = useCallback(() => {
    if (!isPlayingRef.current) return;
    flushListenEvent();
    isPlayingRef.current = false;
  }, [flushListenEvent]);

  // Handle URL/Song changes dynamically to prevent tracking overlap
  useEffect(() => {
    if (songIdRef.current && songIdRef.current !== songId) {
      // Song is switching on the fly. Flush old tracking before assignment.
      handlePlayStop();
    }
    songIdRef.current = songId;
  }, [songId, handlePlayStop]);

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
        if (isYouTube) {
          if (playerRef.current?.playVideo) {
            // YT.Player is ready — play immediately
            playerRef.current.playVideo();
          } else {
            // YT.Player not initialised yet (API still loading).
            ytPendingPlayRef.current = true;
          }
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

  // Management of tracking interval
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isPlayingRef.current) return;

      let time = 0;
      if (isYouTube && playerRef.current?.getCurrentTime) {
        time = playerRef.current.getCurrentTime();
      } else if (isAudio && audioRef.current) {
        time = audioRef.current.currentTime;
      }
      currentTimeRef.current = time;
    }, 500);

    return () => clearInterval(interval);
  }, [isYouTube, isAudio]);

  // NEW EFFECT: Handle URL changes via loadVideoById to prevent losing mobile autoplay context
  useEffect(() => {
    if (isYouTube && mounted && playerRef.current && typeof playerRef.current.loadVideoById === "function") {
      const vidId = getYouTubeVideoId(url);
      if (vidId) {
        try {
          playerRef.current.loadVideoById(vidId);
          playerRef.current.playVideo();
        } catch { /* ignore errors */ }
      }
    }
  }, [url, isYouTube, mounted]);

  useEffect(() => {
    if (!mounted || !embedUrl) return;

    isUnmountingRef.current = false;

    if (isAudio && audioRef.current) {
      // Audio tags are immediately ready to receive play() commands
      guard(onReadyRef.current)();
    }

    if (isYouTube && iframeRef.current) {
      const initYT = () => {
        if (isUnmountingRef.current) return;

        if (!window.YT || !window.YT.Player) {
          // If YT is loading but not ready, check again shortly
          setTimeout(initYT, 100);
          return;
        }

        try {
          if (!iframeRef.current) {
            // Only log if we are NOT unmounting
            if (!isUnmountingRef.current) {
              logAction({
                message: "YouTube Init: No iframe ref",
                data: { url, origin },
                source: "UrlPlayer.tsx:initYT"
              });
            }
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
                  handlePlayStart();
                  guard(onPlayRef.current)();
                } else if (event.data === window.YT.PlayerState.PAUSED) {
                  handlePlayStop();
                  guard(onPauseRef.current)();
                } else if (event.data === window.YT.PlayerState.ENDED) {
                  handlePlayStop();
                  guard(onPauseRef.current)();
                  guard(onEndedRef.current)();
                }
              },
              onReady: () => {
                guard(onReadyRef.current)();
                
                // If URL was switched while the SDK was initializing, load the new one now
                const currentVidId = getYouTubeVideoId(latestUrlRef.current);
                const initialVidId = getYouTubeVideoId(ytIframeSrc || "");
                if (currentVidId && initialVidId && currentVidId !== initialVidId) {
                  try { playerRef.current?.loadVideoById(currentVidId); } catch { /* ignore */ }
                }

                // If play() was called before the YT player was ready, execute it now
                if (ytPendingPlayRef.current) {
                  ytPendingPlayRef.current = false;
                  try { playerRef.current?.playVideo(); } catch { /* ignore */ }
                }
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
          if (!isUnmountingRef.current) initYT();
        };
      } else {
        initYT();
      }
    }

    return () => {
      // Cleanup
      isUnmountingRef.current = true;
      handlePlayStop(); // Record final session before unmount
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, origin, isYouTube, isAudio, handlePlayStart, handlePlayStop]);

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
    if (isHidden) return null;
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
          preload="none"
          onPlay={() => {
            handlePlayStart();
            guard(onPlayRef.current)();
          }}
          onPause={() => {
            handlePlayStop();
            guard(onPauseRef.current)();
          }}
          onEnded={() => {
            handlePlayStop();
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
          src={ytIframeSrc || ""}
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
