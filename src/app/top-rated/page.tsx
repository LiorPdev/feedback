import { getTopRatedSongs } from "@/app/actions/songs";
import styles from "./top-rated.module.css";
import BackButton from "@/components/BackButton";
import ArtistSocials from "@/components/ArtistSocials";
import Image from "next/image";
import Link from "next/link";
import ShareSongButton from "@/components/ShareSongButton";
import TopRatedPlayer from "./TopRatedPlayer";
import TopRatedFooter from "./TopRatedFooter";
// import SocialIcon from "@/components/SocialIcon";

export const dynamic = "force-dynamic";

export default async function TopRatedPage() {
  const result = await getTopRatedSongs();

  if (!result.success || !result.songs) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{result.error || "שגיאה בטעינת הנתונים"}</div>
      </div>
    );
  }

  const songs = result.songs;

  return (
    <div className={styles.container}>
      <div className={styles.blob} />

      <main className={styles.main}>
        <div className={styles.header}>
          <BackButton href="/" title="חזרה לדף הבית" />
          <h1 className={styles.title}>10 השירים המובילים</h1>
          {/* 
          <a
            href="https://open.spotify.com/playlist/0qYgjCnqOmG1WyJ3nZf841?si=86614b338dab4324"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.spotifyLink}
            title="פלייליסט בספוטיפיי"
          >
            <SocialIcon platform="spotify" size={24} />
          </a> 
          */}
        </div>

        <div className={styles.listCard}>
          {songs.length === 0 ? (
            <div className={styles.empty}>עדיין אין מספיק דירוגים להצגת רשימת הטובים ביותר.</div>
          ) : (
            <div className={styles.songsList}>
              {songs.map((song, index) => (
                <div key={song.id} className={styles.songRow}>

                  {/* rank */}
                  <div className={styles.rank}>#{index + 1}</div>

                  {/* player */}
                  <TopRatedPlayer url={song.url} songId={song.id} />

                  {/* title */}
                  <h2 className={styles.songTitle}>{song.title}</h2>

                  <div className={styles.actionsSection}>
                    {/* social links */}
                    <ArtistSocials socialLinks={song.socialLinks} />
                    {/* give feedback */}
                    <Link
                      href={`/give-feedback?song=${song.slug}&from=top-rated`}
                      className={styles.giveFeedbackBtn}
                      title="תנו פידבק לשיר"
                    >
                      <Image
                        src="/Logo.png"
                        alt="פידבק ספייס"
                        width={20}
                        height={20}
                        className={styles.miniLogo}
                      />
                    </Link>
                    {/* share */}
                    <ShareSongButton slug={song.slug} />
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
