"use client";

import React from "react";
import Link from "next/link";
import DeleteSongButton from "@/components/DeleteSongButton";
import EditSongButton from "@/components/EditSongButton";
import ShareSongButton from "@/components/ShareSongButton";
import ToggleSongStatusButton from "@/components/ToggleSongStatusButton";
import styles from "./SongCard.module.css";

interface SongCardProps {
  song: {
    id: string;
    userId: string;
    url: string;
    title: string;
    genre: string;
    slug: string;
    createdAt: string | number | Date;
    updatedAt: string | number | Date;
    feedbacks?: unknown[];
    isActive: boolean;
  };
  isNew?: boolean;
}

export default function SongCard({ song, isNew: propIsNew }: SongCardProps) {
  return (
    <div className={`${styles.songCard} ${!song.isActive ? styles.paused : ""}`}>
      <div className={styles.songHeader}>
        <h3 className={styles.songTitle}>{song.title}</h3>
        <span className={styles.songDate}>
          {new Date(song.createdAt).toLocaleDateString("he-IL")}
        </span>
      </div>

      <div className={styles.songBody}>
        <div className={styles.songActions}>
          <Link href={`/show-feedback/${song.slug}`} className={styles.viewLink}>
            פידבקים ({song.feedbacks?.length || 0})
          </Link>
          <div className={styles.adminActions}>
            <ShareSongButton slug={song.slug} isNew={propIsNew} disabled={!song.isActive} />
            <EditSongButton song={song} />
            <ToggleSongStatusButton songId={song.id} isActive={song.isActive} />
            <DeleteSongButton songId={song.id} songTitle={song.title} />
          </div>
        </div>
      </div>
    </div>
  );
}
