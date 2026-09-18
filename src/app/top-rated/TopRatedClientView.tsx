"use client";

import { TopRatedSong } from "@/app/actions/songs";
import PageHeader from "@/components/PageHeader";
import styles from "./top-rated.module.css";
import ArtistSocials from "@/components/ArtistSocials";
import TopRatedPlayer from "./TopRatedPlayer";
import TopRatedFeedbackButton from "./TopRatedFeedbackButton";

interface TopRatedClientViewProps {
  topRatedSongs: TopRatedSong[];
  currentUserId: string | null;
}

export default function TopRatedClientView({
  topRatedSongs,
  currentUserId,
}: TopRatedClientViewProps) {
  return (
    <>
      <PageHeader 
        title="10 השירים המובילים" 
        showBack 
      />

      <div className={styles.listCard}>
        {topRatedSongs.length === 0 ? (
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
        )}
      </div>
    </>
  );
}
