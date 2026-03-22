"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import Link from "next/link";
import DeleteSongButton from "@/components/DeleteSongButton";
import EditSongButton from "@/components/EditSongButton";
import ShareSongButton from "@/components/ShareSongButton";
import styles from "@/app/dashboard/dashboard.module.css";

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
  };
  isNew?: boolean;
}

export default function SongCard({ song, isNew: propIsNew }: SongCardProps) {
  const [isHighlighted, setIsHighlighted] = useState(propIsNew || false);

  useEffect(() => {
    if (propIsNew) {
      const timer = setTimeout(() => {
        setIsHighlighted(false);
        // Clear the new slug from URL without refresh
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [propIsNew]);

  return (
    <div className={`${styles.songCard} ${isHighlighted ? styles.newSongHighlight : ""}`}>
      <div className={styles.songMain}>
        <div className={styles.songHeader}>
          <h3 className={styles.songTitle}>{song.title}</h3>
          <div className={styles.songStatus}>
            <span className={styles.genreTag}>{song.genre}</span>
          </div>
        </div>
        <div className={styles.songDate}>
          {new Date(song.createdAt).toLocaleDateString("he-IL")}
        </div>
      </div>

      <div className={styles.songActions}>
        <Link href={`/show-feedback/${song.slug}`} className={styles.viewLink}>
          <Eye size={16} /> לצפייה בפידבק ({song.feedbacks?.length || 0})
        </Link>
        <div className={styles.adminActions}>
          <ShareSongButton slug={song.slug} isNew={propIsNew} />
          <EditSongButton song={song} />
          <DeleteSongButton songId={song.id} songTitle={song.title} />
        </div>
      </div>
    </div>
  );
}
