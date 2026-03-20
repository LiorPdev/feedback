"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";
import styles from "./UrlPlayer.module.css";

// Declare global types for APIs
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
    SC: any;
    SpotifyIFrameApi: any;
    onSpotifyIframeApiReady: (IFrameAPI: any) => void;
  }
}

interface UrlPlayerProps {
  url: string;
  onPlay?: () => void;
  onPause?: () => void;
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

  // SoundCloud
  if (url.includes("soundcloud.com")) {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(
      url
    )}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&sharing=false&buying=false`;
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

const UrlPlayer = forwardRef<UrlPlayerHandle, UrlPlayerProps>(({ url, onPlay, onPause, isHidden = false }, ref) => {
  const [mounted, setMounted] = useState(false);
  const [origin, setOrigin] = useState("");
  const isPausedRef = useRef(true);

  useEffect(() => {
    setMounted(true);
    setOrigin(window.location.origin);
  }, []);

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isSoundCloud = url.includes("soundcloud.com");
  const isSpotify = url.includes("spotify.com");

  const embedUrl = getEmbedUrl(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const spotifyPositionRef = useRef(0);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);

  useEffect(() => {
    spotifyPositionRef.current = 0;
  }, [url]);

  useEffect(() => {
    onPlayRef.current = onPlay;
    onPauseRef.current = onPause;
  }, [onPlay, onPause]);

  useImperativeHandle(ref, () => ({
    getPlaybackTime: async () => {
      if (isYouTube && playerRef.current) {
        // YouTube API is sync
        if (typeof playerRef.current.getCurrentTime === 'function') {
          return Math.floor(playerRef.current.getCurrentTime());
        }
      } else if (isSoundCloud && playerRef.current) {
        // SoundCloud API is async
        return new Promise<number>((resolve) => {
          try {
            playerRef.current.getPosition((ms: number) => {
              resolve(Math.floor(ms / 1000));
            });
          } catch (e) {
            resolve(0);
          }
        });
      } else if (isSpotify) {
        return Math.floor(spotifyPositionRef.current / 1000);
      }
      return 0;
    },
    play: () => {
      try {
        if (isYouTube && playerRef.current?.playVideo) {
          playerRef.current.playVideo();
        } else if (isSoundCloud && playerRef.current?.play) {
          playerRef.current.play();
        } else if (isSpotify && playerRef.current?.togglePlay) {
          if (isPausedRef.current) {
            playerRef.current.togglePlay();
          }
        }
      } catch (e) {
        console.warn("Play error:", e);
      }
    },
    pause: () => {
      try {
        if (isYouTube && playerRef.current?.pauseVideo) {
          playerRef.current.pauseVideo();
        } else if (isSoundCloud && playerRef.current?.pause) {
          playerRef.current.pause();
        } else if (isSpotify && playerRef.current?.togglePlay) {
          if (!isPausedRef.current) {
            playerRef.current.togglePlay();
          }
        }
      } catch (e) {
        console.warn("Pause error:", e);
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
              onStateChange: (event: any) => {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  onPlayRef.current?.();
                } else if (
                  event.data === window.YT.PlayerState.PAUSED ||
                  event.data === window.YT.PlayerState.ENDED
                ) {
                  onPauseRef.current?.();
                }
              },
            },
          });
        } catch (e) {
          console.error("YouTube Player Init Error:", e);
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
    } else if (isSoundCloud) {
      const initSC = () => {
        try {
          if (!window.SC || !window.SC.Widget) {
            setTimeout(initSC, 100);
            return;
          }
          const widget = window.SC.Widget(iframeRef.current);
          playerRef.current = widget;
          widget.bind(window.SC.Widget.Events.PLAY, () => onPlayRef.current?.());
          widget.bind(window.SC.Widget.Events.PAUSE, () => onPauseRef.current?.());
          widget.bind(window.SC.Widget.Events.FINISH, () => onPauseRef.current?.());
        } catch (e) {
          console.error("SoundCloud Widget Init Error:", e);
        }
      };

      if (!window.SC) {
        if (!document.querySelector('script[src*="soundcloud.com/player/api.js"]')) {
          const tag = document.createElement("script");
          tag.src = "https://w.soundcloud.com/player/api.js";
          tag.onload = initSC;
          document.head.appendChild(tag);
        } else {
          // Script exists but SC not ready yet
          initSC();
        }
      } else {
        initSC();
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
            (EmbedController: any) => {
              // Set ref immediately as a backup
              playerRef.current = EmbedController;

              EmbedController.on("playback_update", (e: any) => {
                const { isPaused, duration, position } = e.data;
                spotifyPositionRef.current = position;
                isPausedRef.current = isPaused;
                if (!isPaused && position > 0) {
                  onPlayRef.current?.();
                } else if (isPaused || position === duration) {
                  onPauseRef.current?.();
                }
              });
            }
          );
        } catch (e) {
          console.error("Spotify Embed Init Error:", e);
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
        window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
          if (previousSpotifyCallback) (previousSpotifyCallback as any)(IFrameAPI);
          window.SpotifyIFrameApi = IFrameAPI;
          initSpotify();
        };
      } else {
        initSpotify();
      }
    } else {
      onPlayRef.current?.();
    }

    const currentIframe = iframeRef.current;
    return () => {
      // Cleanup
      const player = playerRef.current;
      if (player) {
        try {
          if (isYouTube && typeof player.destroy === 'function') {
            // Only destroy if the player is still connected to its iframe
            player.destroy();
          } else if (isSoundCloud && typeof player.unbind === 'function') {
            player.unbind(window.SC.Widget.Events.PLAY);
            player.unbind(window.SC.Widget.Events.PAUSE);
            player.unbind(window.SC.Widget.Events.FINISH);
          }
        } catch (e) {
          // Swallow errors during cleanup to prevent client-side crashes
          console.warn("Player cleanup error:", e);
        }
      }
      playerRef.current = null;
    };
  }, [embedUrl, url, mounted, origin]);

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
        <div ref={iframeRef as any} id="spotify-player-container" />
      ) : (
        <iframe
          ref={iframeRef}
          width="100%"
          height={isSoundCloud ? "80" : isSpotify ? "80" : "152"}
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

export default UrlPlayer;
