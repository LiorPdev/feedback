"use client";

import React from "react";
import styles from "./UrlPlayer.module.css";

interface UrlPlayerProps {
  url: string;
}

export const getEmbedUrl = (url: string) => {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/
  );
  if (ytMatch) {
    const videoId = ytMatch[1].split(/[&?]/)[0];
    return `https://www.youtube.com/embed/${videoId}`;
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

export default function UrlPlayer({ url }: UrlPlayerProps) {
  const embedUrl = getEmbedUrl(url);

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
        width="100%"
        height={isSoundCloud ? "80" : isSpotify ? "80" : isAppleMusic ? "52" : "152"}
        scrolling="no"
        frameBorder="no"
        allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        src={embedUrl}
        title="Media Player"
        className={styles.iframe}
      ></iframe>
    </div>
  );
}
