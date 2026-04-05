import { sql } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logAction } from "@/app/actions/logs";
import BackButton from "@/components/BackButton";
import { TOP_RATED_MIN_RATINGS_THRESHOLD } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { feedbacks } from "@/lib/schema";
import DashboardClient from "./DashboardClient";
import styles from "./dashboard.module.css";

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
  const db = await getDb();
  try {
    user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, clerkUser.id),
      with: {
        songs: {
          orderBy: (songs, { desc }) => [desc(songs.createdAt)],
          with: {
            feedbacks: true,
            listenEvents: true,
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

  if (!user || user.songs.length === 0) {
    redirect("/get-feedback");
  }

  // Calculate global average rating (C) for Bayesian True Rating
  const globalStats = await db.select({
    avgRating: sql<number>`avg((${feedbacks.cat2} + ${feedbacks.cat3} + ${feedbacks.overall}) / 3.0)`
  }).from(feedbacks);
  const globalAverage = globalStats[0]?.avgRating || 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.welcomeContainer}>
          <BackButton
            style={{ transform: 'translateY(-3px)' }}
          />
          <div className={styles.welcome}>
            <h1><span className={styles.welcomeText}>שלום </span>{user.name ? user.name.split(" ")[0] : ""}</h1>
          </div>
        </div>
        <Link href="/get-feedback" className={styles.mobileActionBtn}>
          שליחת שיר נוסף
        </Link>
      </div>

      <div className={styles.content}>
        <DashboardClient
          songs={user.songs}
          newSlug={newSlug}
          globalAverage={globalAverage}
          minThreshold={TOP_RATED_MIN_RATINGS_THRESHOLD}
        />
      </div>
    </div>
  );
}
