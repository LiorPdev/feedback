/**
 * ⚠️ WARNING: CRITICAL COMPONENT - EXTREMELY DELICATE ⚠️
 * 
 * This module manages multiple external APIs (YouTube, SoundCloud, Spotify) inside an Iframe.
 * The initialization timing of these APIs is highly sensitive to the React lifecycle (Mount)
 * and DOM availability.
 * 
 * 1. DO NOT SPLIT: Previous attempts to extract Spotify or other player logic into separate 
 *    files (e.g., SpotifyPlayer.tsx) caused playback failures and synchronization issues. 
 *    Keeping everything in one file ensures all APIs are available and synchronization between 
 *    songs works perfectly.
 * 2. LIFECYCLE GUARDS: The use of `isUnmountingRef` and the `guard` function is critical!
 *    They prevent "ghost events" from an exiting song (e.g., during a Skip) from affecting 
 *    the player state of the new song.
 * 3. LINT OVERRIDES: `eslint-disable` comments were added intentionally. Do not change them 
 *    if it requires changing the code flow (e.g., switching from `mounted` to `useSyncExternalStore`), 
 *    as this might break the player loading timing.
 * 
 * DEAR DEVELOPERS (AND AIs): Do not attempt to refactor or "clean up" this code unless you 
 * are prepared to verify that all player types work after at least 10 consecutive skips.
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
    SpotifyIFrameApi: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    onSpotifyIframeApiReady: (IFrameAPI: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

interface UrlPlayerProps {
  url: string;
  onPlay?: () => void;
  onPause?: () => void;
  onReady?: () => void;
  onError?: (error: unknown) => void;
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

  // Spotify
  if (url.includes("spotify.com")) {
    const spotifyMatch = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
    if (spotifyMatch) {
      const type = spotifyMatch[1];
      const id = spotifyMatch[2];
      return `https://open.spotify.com/embed/${type}/${id}?utm_source=oembed`;
    }
  }

  // Audio files
  if (url.match(/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i) || url.includes("r2.dev")) {
    return url;
  }

  return null;
};

export const getSpotifyUri = (url: string) => {
  const match = url.match(/spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (match) {
    return `spotify:${match[1]}:${match[2]}`;
  }
  return null;
};

export interface UrlPlayerHandle {
  getPlaybackTime: () => Promise<number>;
  play: () => void;
  pause: () => void;
}

const UrlPlayer = forwardRef<UrlPlayerHandle, UrlPlayerProps>(({ url, onPlay, onPause, onReady, onError, isHidden = false }, ref) => {
  const isUnmountingRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [origin, setOrigin] = useState("");
  const isPausedRef = useRef(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setOrigin(window.location.origin);
  }, []);

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isSpotify = url.includes("spotify.com");
  const isAudio = url.match(/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i) || url.includes("r2.dev");

  const embedUrl = getEmbedUrl(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const spotifyPositionRef = useRef(0);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    spotifyPositionRef.current = 0;
  }, [url]);

  useEffect(() => {
    onPlayRef.current = onPlay;
    onPauseRef.current = onPause;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onPlay, onPause, onReady, onError]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const guard = (fn: ((...args: any[]) => void) | undefined) => (...args: any[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!isUnmountingRef.current && fn) (fn as any)(...args);
  };

  useImperativeHandle(ref, () => ({
    getPlaybackTime: async () => {
      if (isYouTube && playerRef.current) {
        // YouTube API is sync
        if (typeof playerRef.current.getCurrentTime === 'function') {
          return Math.floor(playerRef.current.getCurrentTime());
        }
      } else if (isSpotify) {
        return Math.floor(spotifyPositionRef.current / 1000);
      } else if (isAudio && audioRef.current) {
        return Math.floor(audioRef.current.currentTime);
      }
      return 0;
    },
    play: () => {
      try {
        if (isYouTube && playerRef.current?.playVideo) {
          playerRef.current.playVideo();
        } else if (isSpotify) {
          const controller = playerRef.current;
          if (controller?.resume) {
            controller.resume();
          } else if (controller?.togglePlay) {
            controller.togglePlay();
          }
        } else if (isAudio && audioRef.current) {
          audioRef.current.play();
        }
      } catch (e) {
        logAction({ message: "Play error", data: e, source: "UrlPlayer.tsx:play" });
      }
    },
    pause: () => {
      try {
        if (isYouTube && playerRef.current?.pauseVideo) {
          playerRef.current.pauseVideo();
        } else if (isSpotify) {
          const controller = playerRef.current;
          if (controller?.pause) {
            controller.pause();
          } else if (controller?.togglePlay) {
            controller.togglePlay();
          }
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
          playerRef.current = new window.YT.Player(iframeRef.current, {
            playerVars: {
              origin: origin,
            },
            events: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onStateChange: (event: any) => {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  guard(onPlayRef.current)();
                } else if (
                  event.data === window.YT.PlayerState.PAUSED ||
                  event.data === window.YT.PlayerState.ENDED
                ) {
                  guard(onPauseRef.current)();
                }
              },
              onReady: () => guard(onReadyRef.current)(),
            },
          });
        } catch (e) {
          guard(onErrorRef.current)(e);
          logAction({ message: "YouTube Player Init Error", data: e, source: "UrlPlayer.tsx:initYT" });
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
    } else if (isSpotify) {
      const initSpotify = () => {
        if (!window.SpotifyIFrameApi || !iframeRef.current) {
          setTimeout(initSpotify, 100);
          return;
        }

        try {
          const spotifyUri = getSpotifyUri(url);
          window.SpotifyIFrameApi.createController(
            iframeRef.current,
            {
              uri: spotifyUri,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (EmbedController: any) => {
              // Set ref immediately as a backup
              playerRef.current = EmbedController;

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              EmbedController.on("playback_update", (e: any) => {
                const { isPaused, duration, position } = e.data;
                spotifyPositionRef.current = position;
                isPausedRef.current = isPaused;
                
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;
                const isAtCutoff = isMobile && position >= 23000 && position < (duration - 1000);

                if (!isPaused && position > 0 && !isAtCutoff) {
                  guard(onPlayRef.current)();
                } else if (isPaused || position === duration || isAtCutoff) {
                  guard(onPauseRef.current)();
                  if (isAtCutoff && !isPaused) {
                    EmbedController.pause();
                  }
                }
              });
              EmbedController.on("ready", () => guard(onReadyRef.current)());
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              EmbedController.on("error", (e: any) => guard(onErrorRef.current)(e));
            }
          );
        } catch (e) {
          guard(onErrorRef.current)(e);
          logAction({ message: "Spotify Embed Init Error", data: e, source: "UrlPlayer.tsx:initSpotify" });
        }
      };

      if (!window.SpotifyIFrameApi) {
        if (!document.querySelector('script[src*="spotify.com/embed/iframe-api/v1"]')) {
          const tag = document.createElement("script");
          tag.src = "https://open.spotify.com/embed/iframe-api/v1";
          tag.async = true;
          document.head.appendChild(tag);
        }

        const previousSpotifyCallback = window.onSpotifyIframeApiReady;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (previousSpotifyCallback) (previousSpotifyCallback as any)(IFrameAPI);
          window.SpotifyIFrameApi = IFrameAPI;
          initSpotify();
        };
      } else {
        initSpotify();
      }
    } else {
      guard(onPlayRef.current)();
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
  }, [embedUrl, url, mounted, origin, isSpotify, isYouTube]);

  if (!mounted) {
    return (
      <div className={`${styles.playerWrapper} ${isHidden ? styles.hidden : ""}`} style={{ minHeight: isSpotify ? "80px" : "152px" }}>
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
      {isSpotify ? (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <div ref={iframeRef as any} id="spotify-player-container" />
      ) : isAudio ? (
        <audio
          ref={audioRef}
          src={url}
          onPlay={() => guard(onPlayRef.current)()}
          onPause={() => guard(onPauseRef.current)()}
          onEnded={() => guard(onPauseRef.current)()}
          onCanPlay={() => guard(onReadyRef.current)()}
          className={styles.audio}
          controls={!isHidden}
        />
      ) : (
        <iframe
          ref={iframeRef}
          width="100%"
          height={isSpotify ? "80" : "152"}
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
