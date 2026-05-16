"use client";

import { useState } from "react";
import { TopRatedSong, TopListenedSong } from "@/app/actions/songs";
import PageHeader from "@/components/PageHeader";
import styles from "./top-rated.module.css";
import ArtistSocials from "@/components/ArtistSocials";
import TopRatedPlayer from "./TopRatedPlayer";
import TopRatedFeedbackButton from "./TopRatedFeedbackButton";
import { Trophy, Clock } from "lucide-react";

interface TopRatedClientViewProps {
  topRatedSongs: TopRatedSong[];
  topListenedSongs: TopListenedSong[];
  currentUserId: string | null;
}

function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function TopRatedClientView({
  topRatedSongs,
  topListenedSongs,
  currentUserId,
}: TopRatedClientViewProps) {
  const [activeTab, setActiveTab] = useState<'rating' | 'listening'>('rating');

  return (
    <>
      <PageHeader 
        title="10 השירים המובילים" 
        showBack 
        afterTitle={
          <div className={styles.tabsContainer}>
            <button 
              onClick={() => setActiveTab('rating')}
              className={`${styles.tabBtn} ${activeTab === 'rating' ? styles.active : ''}`}
              type="button"
            >
              <Trophy size={16} />
              <span>לפי דירוג</span>
            </button>
            <button 
              onClick={() => setActiveTab('listening')}
              className={`${styles.tabBtn} ${activeTab === 'listening' ? styles.active : ''}`}
              type="button"
            >
              <Clock size={16} />
              <span>לפי זמן האזנה</span>
            </button>
          </div>
        }
      />

      <div className={styles.listCard}>
        {activeTab === 'rating' ? (
          topRatedSongs.length === 0 ? (
            <div className={styles.empty}>אין מספיק דירוגים להצגת הרשימה.</div>
          ) : (
            <div className={styles.songsList}>
              {topRatedSongs.map((song, index) => (
                <div key={song.id} className={styles.songRow}>
                  <div className={styles.rank}>#{index + 1}</div>
                  <TopRatedPlayer 
                    url={song.url} 
                    songId={song.userId === currentUserId ? undefined : song.id} 
                  />
                  <h2 className={styles.songTitle}>{song.title}</h2>
                  <div className={styles.actionsSection}>
                    <ArtistSocials socialLinks={song.socialLinks} />
                    <TopRatedFeedbackButton
                      songSlug={song.slug}
                      songUserId={song.userId}
                      currentUserId={currentUserId}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          topListenedSongs.length === 0 ? (
            <div className={styles.empty}>אין מספיק נתוני האזנה להצגת הרשימה.</div>
          ) : (
            <div className={styles.songsList}>
              {topListenedSongs.map((song, index) => (
                <div key={song.id} className={styles.songRowListened}>
                  <div className={styles.rank}>#{index + 1}</div>
                  <TopRatedPlayer 
                    url={song.url} 
                    songId={song.userId === currentUserId ? undefined : song.id} 
                  />
                  <h2 className={styles.songTitle}>{song.title}</h2>
                  <div className={styles.listenTimeCol} title="זמן האזנה ממוצע">
                    {formatDuration(song.averageListenSeconds)}
                  </div>
                  <div className={styles.actionsSection}>
                    <ArtistSocials socialLinks={song.socialLinks} />
                    <TopRatedFeedbackButton
                      songSlug={song.slug}
                      songUserId={song.userId}
                      currentUserId={currentUserId}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </>
  );
}
