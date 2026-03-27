import { getTopRatedSongs } from "@/app/actions/songs";
import styles from "./top-rated.module.css";
import BackButton from "@/components/BackButton";
import ArtistSocials from "@/components/ArtistSocials";
import Image from "next/image";
import Link from "next/link";
import ShareSongButton from "@/components/ShareSongButton";
import TopRatedPlayer from "./TopRatedPlayer";

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
          <BackButton href="/" title="חזרה לדף הבית" className={styles.backButton} />
          <h1 className={styles.title}>5 השירים עם הדירוג הכי גבוה</h1>
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
                  <TopRatedPlayer url={song.url} />

                  {/* title */}
                  <h2 className={styles.songTitle}>{song.title}</h2>

                  {/* share */}

                  {/* share */}
                  <div className={styles.actionsSection}>
                    <Link
                      href={`/give-feedback?song=${song.slug}`}
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
                    <ShareSongButton slug={song.slug} />
                    <ArtistSocials socialLinks={song.socialLinks} />
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        <p className={styles.footerNote}>
          * הדירוג מבוסס על ממוצע כלל הפידבקים שהתקבלו בקהילה
        </p>
      </main>
    </div>
  );
}
