"use client";

import { useEffect, useRef } from "react";
import styles from "./UrlPlayer.module.css";

// Declare global types for APIs
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
    SC: any;
  }
}

interface UrlPlayerProps {
  url: string;
  onPlay?: () => void;
  onPause?: () => void;
}

export const getEmbedUrl = (url: string) => {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/
  );
  if (ytMatch) {
    const videoId = ytMatch[1].split(/[&?]/)[0];
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
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

  // Apple Music
  if (url.includes("music.apple.com")) {
    return url.replace("music.apple.com", "embed.music.apple.com");
  }

  return null;
};

export default function UrlPlayer({ url, onPlay, onPause }: UrlPlayerProps) {
  const embedUrl = getEmbedUrl(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!embedUrl || !iframeRef.current) return;

    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
    const isSoundCloud = url.includes("soundcloud.com");

    if (isYouTube) {
      const initYT = () => {
        if (!window.YT || !window.YT.Player) {
          // If YT is loading but not ready, check again shortly
          setTimeout(initYT, 100);
          return;
        }

        try {
          playerRef.current = new window.YT.Player(iframeRef.current, {
            events: {
              onStateChange: (event: any) => {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  onPlay?.();
                } else if (
                  event.data === window.YT.PlayerState.PAUSED ||
                  event.data === window.YT.PlayerState.ENDED
                ) {
                  onPause?.();
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
          widget.bind(window.SC.Widget.Events.PLAY, () => onPlay?.());
          widget.bind(window.SC.Widget.Events.PAUSE, () => onPause?.());
          widget.bind(window.SC.Widget.Events.FINISH, () => onPause?.());
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
    } else {
      onPlay?.();
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
  }, [embedUrl, url, onPlay, onPause]);

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

  const isSoundCloud = url.includes("soundcloud.com");
  const isSpotify = url.includes("spotify.com");
  const isAppleMusic = url.includes("music.apple.com");

  return (
    <div className={styles.playerWrapper}>
      <iframe
        ref={iframeRef}
        width="100%"
        height={isSoundCloud ? "80" : isSpotify ? "80" : isAppleMusic ? "52" : "152"}
        scrolling="no"
        frameBorder="no"
        allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        src={embedUrl}
        title="Media Player"
        id="player-iframe"
        className={styles.iframe}
      ></iframe>
    </div>
  );
}
