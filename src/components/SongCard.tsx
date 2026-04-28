"use client";

import Link from "next/link";
import DeleteSong from "@/components/DeleteSong";
import EditSong from "@/components/EditSong";
import ShareSongButton from "@/components/ShareSongButton";
import ToggleSongStatusButton from "@/components/ToggleSongStatusButton";
import PromoteSong from "@/components/PromoteSong";
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
    feedbacks?: { isUnlocked: boolean }[];
    isActive: boolean;
    fewWords?: string | null;
    priority: number;
    promotedUntil?: string | null;
  };
  isNew?: boolean;
  activeSongsCount: number;
}

export default function SongCard({ song, activeSongsCount }: SongCardProps) {
  const unreadCount = song.feedbacks?.filter((fb) => !fb.isUnlocked).length || 0;

  return (
    <div className={`${styles.songCard} ${!song.isActive ? styles.paused : ""}`}>
      <div className={styles.songHeader}>
        <Link href={`/show-feedback/${song.slug}`} className={styles.songTitleLink}>
          <h3 className={styles.songTitle}>{song.title}</h3>
        </Link>
        <span className={styles.songDate}>
          {new Date(song.createdAt).toLocaleDateString("he-IL")}
        </span>
      </div>

      <div className={styles.songBody}>
        <div className={styles.songActions}>
          <Link href={`/show-feedback/${song.slug}`} className={styles.viewLink}>
            פידבק <span className={unreadCount > 0 ? styles.unreadCount : ""}>({song.feedbacks?.length || 0})</span>
          </Link>
          <div className={styles.adminActions}>
            <ShareSongButton slug={song.slug} disabled={!song.isActive} />
            <PromoteSong song={song} disabled={!song.isActive} />
            <EditSong song={song} />
            <ToggleSongStatusButton songId={song.id} isActive={song.isActive} activeSongsCount={activeSongsCount} />
            <DeleteSong songId={song.id} songTitle={song.title} />
          </div>
        </div>
      </div>
    </div>
  );
}
