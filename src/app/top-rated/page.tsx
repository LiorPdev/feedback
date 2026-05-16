import { syncUser } from "@/lib/user-auth";
import { getTopRatedSongs, getTopListenedSongs } from "@/app/actions/songs";
import styles from "./top-rated.module.css";
import TopRatedClientView from "./TopRatedClientView";
import TopRatedFooter from "./TopRatedFooter";

export const dynamic = "force-dynamic";

export default async function TopRatedPage() {
  const dbUser = await syncUser();
  const currentUserId = dbUser?.id || null;
  const [ratedResult, listenedResult] = await Promise.all([
    getTopRatedSongs(),
    getTopListenedSongs(),
  ]);

  if (!ratedResult.success || !ratedResult.songs) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{ratedResult.error || "שגיאה בטעינת הנתונים"}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.blob} />

      <main className={styles.main}>
        <TopRatedClientView 
          topRatedSongs={ratedResult.songs} 
          topListenedSongs={listenedResult.songs || []} 
          currentUserId={currentUserId} 
        />
        <TopRatedFooter />
      </main>
    </div>
  );
}
