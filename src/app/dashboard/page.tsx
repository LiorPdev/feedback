import { sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logAction } from "@/app/actions/logs";
import { TOP_RATED_MIN_RATINGS_THRESHOLD } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { feedbacks } from "@/lib/schema";
import DashboardClient from "./DashboardClient";
import { getMyGivenFeedbacks } from "@/app/actions/feedback";
import type { GivenFeedbackItem } from "@/app/actions/feedback";
import RaterScoreInfo from "@/components/RaterScoreInfo";
import { syncUser } from "@/lib/user-auth";
export const dynamic = "force-dynamic";
import PageHeader from "@/components/PageHeader";
import styles from "./dashboard.module.css";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ new?: string; backHome?: string }>
}) {
  const dbUser = await syncUser();
  if (!dbUser) {
    redirect("/");
  }

  const { new: newSlug, backHome } = await searchParams;
  const isBackHome = backHome === "true";

  let user;
  const db = await getDb();
  try {
    user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, dbUser.id),
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
        userId: dbUser.id
      },
      source: "dashboard/page.tsx"
    });

    return (
      <div className={styles.container}>
        <div className={styles.dbError}>
          <h2>אופס, משהו השתבש</h2>
          <p>נתקלנו בבעיה בטעינת הנתונים שלך. השגיאה דווחה ואנו נטפל בה מייד.</p>
          <Link href="/" className={styles.emptyBtn}>חזרה לדף הבית</Link>
        </div>
      </div>
    );
  }

  const givenFeedbacks: GivenFeedbackItem[] = await getMyGivenFeedbacks();

  if (!user || (user.songs.length === 0 && givenFeedbacks.length === 0)) {
    redirect("/get-feedback?backHome=true");
  }

  // Calculate global average rating (C) for Bayesian True Rating
  const globalStats = await db.select({
    avgRating: sql<number>`avg(${feedbacks.overall})`
  }).from(feedbacks);
  const globalAverage = globalStats[0]?.avgRating || 0;

  return (
    <div className={styles.container}>
      <div className={styles.headerWrapper}>
        <div className={styles.headerRow}>
          <PageHeader
            title={<><span className={styles.welcomeText}>שלום </span>{user.name ? user.name.split(" ")[0] : ""}</>}
            subtitle={
              <RaterScoreInfo
                score={user.raterScore}
                label="דירוג אישי"
                className={styles.raterScoreDashboard}
              />
            }
            showBack
            backUrl={isBackHome ? "/" : undefined}
            hideDivider
          />
          <Link
            href={`/get-feedback?new=true${isBackHome ? "&backHome=true" : ""}`}
            className={styles.headerActionBtn}
          >
            הוספת שיר
          </Link>
        </div>
      </div>

      <div className={styles.content}>
        <DashboardClient
          songs={user?.songs ?? []}
          newSlug={newSlug}
          globalAverage={globalAverage}
          minThreshold={TOP_RATED_MIN_RATINGS_THRESHOLD}
          givenFeedbacks={givenFeedbacks}
        />
      </div>
    </div>
  );
}
