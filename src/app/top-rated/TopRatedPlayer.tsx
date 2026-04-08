"use client";

import PlayButton from "@/components/PlayButton";
import styles from "./top-rated.module.css";

interface TopRatedPlayerProps {
  url: string;
  songId: string;
}

export default function TopRatedPlayer({ url, songId }: TopRatedPlayerProps) {
  return (
    <div className={styles.playerContainer}>
      <PlayButton
        url={url}
        songId={songId}
        size={36}
        className={styles.playButton}
        playingClassName={styles.isPlaying}
      />
    </div>
  );
}
