import { getDb } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Music } from "lucide-react";
import SongCard from "@/components/SongCard";
import styles from "./dashboard.module.css";
import { logAction } from "@/app/actions/logs";
import BackButton from "@/components/BackButton";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    redirect("/");
  }

  const { new: newSlug } = await searchParams;

  let user;
  try {
    const db = await getDb();
    user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, clerkUser.id),
      with: {
        songs: {
          orderBy: (songs, { desc }) => [desc(songs.createdAt)],
          with: {
            feedbacks: true,
          },
        },
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    await logAction({
      message: "Dashboard Database Error",
      data: {
        error: error.message,
        stack: error.stack,
        userId: clerkUser.id
      },
      source: "dashboard/page.tsx"
    });

    return (
      <div className={styles.container}>
        <div className={styles.dbError}>
          <h2>אופס, משהו השתבש</h2>
          <p>נתקלנו בבעיה בטעינת הנתונים שלך. השגיאה דווחה למערכת ואנו נטפל בה מייד.</p>
          <Link href="/" className={styles.emptyBtn}>חזרה לדף הבית</Link>
        </div>
      </div>
    );
  }

  if (!user) {
    redirect("/get-feedback");
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.welcomeContainer}>
          <BackButton 
            href="/" 
            title="חזרה לדף הבית" 
            style={{ transform: 'translateY(-3px)' }} 
          />
          <div className={styles.welcome}>
            <h1>שלום{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.sectionHeader}>
          <h2>השירים ששלחתי <span className={styles.hideOnMobile}>לקבל פידבק</span></h2>
          <Link href="/get-feedback" className={styles.submitNewBtn}>
            שליחת שיר נוסף
          </Link>
        </div>

        {user.songs.length === 0 ? (
          <div className={styles.emptyState}>
            <Music size={48} className={styles.emptyIcon} />
            <p>לא נשלח עדיין אף שיר לקבלת פידבק מהקהילה</p>
            <Link href="/get-feedback" className={styles.emptyBtn}>
              שלחו את השיר הראשון שלכם
            </Link>
          </div>
        ) : (
          <div className={styles.songGrid}>
            {user.songs.map((song) => (
              <SongCard key={song.id} song={song} isNew={song.slug === newSlug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
