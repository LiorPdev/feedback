import { getDb } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Music, Coins, ExternalLink, Plus, Clock, Trash2 } from "lucide-react";
import DeleteSongButton from "@/components/DeleteSongButton";
import styles from "./dashboard.module.css";


export default async function DashboardPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    redirect("/");
  }

  let user;
  try {
    const db = await getDb();
    user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, clerkUser.id),
      with: {
        songs: {
          orderBy: (songs, { desc }) => [desc(songs.createdAt)],
        },
      },
    });
  } catch (err: any) {
    return (
      <div style={{ padding: '2rem', color: 'red', direction: 'ltr' }}>
        <h2>Database Error Detected</h2>
        <pre>{err.stack || err.message || String(err)}</pre>
      </div>
    );
  }

  if (!user) {
    // Falls back to creating the user if they don't exist yet in our DB 
    // (though they should have been created during /get-feedback)
    redirect("/get-feedback");
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.welcome}>
          <h1>שלום{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          <p>ברוכים הבאים למרחב הפידבקים האישי</p>
        </div>

        <div className={styles.tokenCard}>
          <div className={styles.tokenIcon}>
            <Coins size={24} />
          </div>
          <div className={styles.tokenInfo}>
            <span className={styles.tokenLabel}>טוקנים זמינים</span>
            <span className={styles.tokenValue}>{user.tokens}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.sectionHeader}>
          <h2>השירים ששלחתי לקבלת פידבק</h2>
          <Link href="/get-feedback" className={styles.submitNewBtn}>
            <Plus size={18} /> שליחת שיר חדש
          </Link>
        </div>

        {user.songs.length === 0 ? (
          <div className={styles.emptyState}>
            <Music size={48} className={styles.emptyIcon} />
            <p>לא נשלחו עדיין שירים לקבלת פידבק מהקהילה</p>
            <Link href="/get-feedback" className={styles.emptyBtn}>
              שלחו את השיר הראשון שלכם
            </Link>
          </div>
        ) : (
          <div className={styles.songGrid}>
            {user.songs.map((song: any) => (
              <div key={song.id} className={styles.songCard}>
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
                    <ExternalLink size={16} /> לצפייה בדירוג
                  </Link>
                  <DeleteSongButton songId={song.id} songTitle={song.title} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
