import { syncUser } from "@/lib/user-auth";
import { getTopRatedSongs, TopRatedSong } from "@/app/actions/songs";
import PageHeader from "@/components/PageHeader";
import styles from "./top-rated.module.css";
import ArtistSocials from "@/components/ArtistSocials";
import ShareSongButton from "@/components/ShareSongButton";
import TopRatedPlayer from "./TopRatedPlayer";
import TopRatedFooter from "./TopRatedFooter";
import TopRatedFeedbackButton from "./TopRatedFeedbackButton";

export const dynamic = "force-dynamic";

export default async function TopRatedPage() {
  const dbUser = await syncUser();
  const currentUserId = dbUser?.id || null;
  const result = await getTopRatedSongs();

  if (!result.success || !result.songs) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{result.error || "שגיאה בטעינת הנתונים"}</div>
      </div>
    );
  }

  const songs: TopRatedSong[] = result.songs;

  return (
    <div className={styles.container}>
      <div className={styles.blob} />

      <main className={styles.main}>
        <PageHeader title="10 השירים המובילים" showBack />

        <div className={styles.listCard}>
          {songs.length === 0 ? (
            <div className={styles.empty}>אין מספיק דירוגים להצגת הרשימה.</div>
          ) : (
            <div className={styles.songsList}>
              {songs.map((song, index) => (
                <div key={song.id} className={styles.songRow}>

                  {/* rank */}
                  <div className={styles.rank}>#{index + 1}</div>

                  {/* player */}
                  <TopRatedPlayer 
                    url={song.url} 
                    songId={song.userId === currentUserId ? undefined : song.id} 
                  />

                  {/* title */}
                  <h2 className={styles.songTitle}>{song.title}</h2>

                  <div className={styles.actionsSection}>
                    {/* social links */}
                    <ArtistSocials socialLinks={song.socialLinks} />
                    {/* give feedback */}
                    <TopRatedFeedbackButton
                      songSlug={song.slug}
                      songUserId={song.userId}
                      currentUserId={currentUserId}
                    />
                    {/* share */}
                    <ShareSongButton slug={song.slug} tooltipAlign="left" />
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        <TopRatedFooter />
      </main>
    </div>
  );
}
