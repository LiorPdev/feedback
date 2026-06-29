"use server";


import { getDb } from "@/lib/db";
import { songs, users } from "@/lib/schema";
import { sql } from "drizzle-orm";
import { logAction } from "./logs";

const LISTEN_TIME_OFFSET_MINS = 0.5;
const FEEDBACKS_WEEKLY_MULTIPLIER = 1.5;
const TOTAL_FEEDBACKS_MULTIPLIER = 1.5;
const TOTAL_SONGS_MULTIPLIER = 1.1;
const MIN_FEEDBACKS_WEEKLY = 25;

export async function getCommunityStats() {
    try {
        const db = await getDb();

        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        lastWeek.setHours(0, 0, 0, 0);

        // 1-6. Run all queries in parallel
        const [
            rawSongs,
            rawUsers,
            engagementStatsRaw,
            avgListenTimeRaw,
            feedbacksWeeklyRaw,
            totalSongsResult,
            totalUsersResult,
            totalFeedbacksRaw
        ] = await Promise.all([
            db.select({ genre: songs.genre }).from(songs).all(),
            db.select({ genre: users.userGenre }).from(users).where(sql`${users.userGenre} IS NOT NULL`).all(),
            db.all(sql`
                SELECT 
                  CASE 
                    WHEN feedback_count >= 11 THEN 'מעל 10'
                    WHEN feedback_count >= 7 THEN '7-10'
                    WHEN feedback_count >= 4 THEN '4-6'
                    WHEN feedback_count >= 1 THEN '1-3 פידבקים'
                    ELSE '0'
                  END as genre,
                  COUNT(*) as count
                FROM (
                  SELECT s.id, COUNT(f.id) as feedback_count
                  FROM Song s
                  LEFT JOIN Feedback f ON s.id = f.songId
                  GROUP BY s.id
                )
                GROUP BY genre
                ORDER BY MIN(feedback_count) DESC
            `),
            db.all(sql`SELECT AVG(playedSeconds) / 60.0 as avgMinutes FROM Feedback`),
            db.all(sql`SELECT COUNT(*) as count FROM Feedback WHERE createdAt >= ${lastWeek.toISOString()}`),
            db.select({ count: sql`count(*)` }).from(songs).all(),
            db.select({ count: sql`count(*)` }).from(users).all(),
            db.all(sql`SELECT COUNT(*) as count FROM Feedback`)
        ]);

        const engagementStats = engagementStatsRaw as { genre: string; count: number }[];
        const avgListenTimeResult = avgListenTimeRaw as { avgMinutes: number | null }[];
        const feedbacksWeeklyResult = feedbacksWeeklyRaw as { count: number }[];
        const totalFeedbacksResult = totalFeedbacksRaw as { count: number }[];

        // Process song genres
        const songCounts = new Map<string, number>();
        rawSongs.forEach(row => {
            if (!row.genre) return;
            const parts = row.genre.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
            parts.forEach(p => {
                songCounts.set(p, (songCounts.get(p) || 0) + 1);
            });
        });

        // Process user genres
        const userCounts = new Map<string, number>();
        rawUsers.forEach(row => {
            if (!row.genre) return;
            const parts = row.genre.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
            parts.forEach(p => {
                userCounts.set(p, (userCounts.get(p) || 0) + 1);
            });
        });

        const formatStats = (countsMap: Map<string, number>) => {
            return Array.from(countsMap.entries())
                .map(([genre, count]) => ({ genre, count }))
                .sort((a, b) => b.count - a.count);
        };

        const songStats = formatStats(songCounts);
        const userStats = formatStats(userCounts);

        const averageListenTime = (avgListenTimeResult[0]?.avgMinutes || 0) + LISTEN_TIME_OFFSET_MINS;
        const rawFeedbacksWeekly = Math.round((feedbacksWeeklyResult[0]?.count || 0) * FEEDBACKS_WEEKLY_MULTIPLIER);
        const feedbacksWeekly = Math.max(MIN_FEEDBACKS_WEEKLY, rawFeedbacksWeekly);

        const totalSongs = (totalSongsResult[0] as { count: number | bigint })?.count ?? 0;
        const totalUsers = (totalUsersResult[0] as { count: number | bigint })?.count ?? 0;

        return {
            songStats,
            userStats,
            engagementStats,
            averageListenTime,
            feedbacksWeekly,
            totalSongs: Math.round(Number(totalSongs) * TOTAL_SONGS_MULTIPLIER),
            totalUsers: Number(totalUsers),
            totalFeedbacks: Math.round((totalFeedbacksResult[0]?.count || 0) * TOTAL_FEEDBACKS_MULTIPLIER)
        };
    } catch (error) {
        await logAction({ message: "getCommunityStats failed", data: error, source: "stats.ts" });
        throw error;
    }
}
