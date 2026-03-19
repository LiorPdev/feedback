import { getDb } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Music, Coins, ExternalLink, Plus, Clock, Trash2 } from "lucide-react";
import DeleteSongButton from "@/components/DeleteSongButton";
import styles from "./dashboard.module.css";

export const runtime = "edge";

export default async function DashboardPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    redirect("/");
  }

  const db = getDb(process);
  const user = await db.user.findUnique({
    where: { id: clerkUser.id },
    include: {
      songs: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    // Falls back to creating the user if they don't exist yet in our DB 
    // (though they should have been created during /get-feedback)
    redirect("/get-feedback");
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.welcome}>
          <h1>שלום, {user.name?.split(" ")[0] || "אורח"}</h1>
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
          <h2>השירים שלי</h2>
          <Link href="/get-feedback" className={styles.submitNewBtn}>
            <Plus size={18} /> שליחת שיר חדש
          </Link>
        </div>

        {user.songs.length === 0 ? (
          <div className={styles.emptyState}>
            <Music size={48} className={styles.emptyIcon} />
            <p>עדיין לא שלחת שירים לפידבק</p>
            <Link href="/get-feedback" className={styles.emptyBtn}>
              שלח את השיר הראשון שלך
            </Link>
          </div>
        ) : (
          <div className={styles.songGrid}>
            {user.songs.map((song) => (
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
