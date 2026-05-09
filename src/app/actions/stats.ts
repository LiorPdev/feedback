"use server";


import { getDb } from "@/lib/db";
import { songs, users } from "@/lib/schema";
import { sql } from "drizzle-orm";
import { logAction } from "./logs";

export async function getCommunityStats() {
    try {
        const db = await getDb();

        // 1. Song genre distribution
        const rawSongs = await db.select({ genre: songs.genre }).from(songs).all();
        const songCounts = new Map<string, number>();

        rawSongs.forEach(row => {
            if (!row.genre) return;
            // Split by comma or semicolon and trim each part
            const parts = row.genre.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
            parts.forEach(p => {
                songCounts.set(p, (songCounts.get(p) || 0) + 1);
            });
        });

        // 2. User genre distribution
        const rawUsers = await db
            .select({ genre: users.userGenre })
            .from(users)
            .where(sql`${users.userGenre} IS NOT NULL`)
            .all();

        const userCounts = new Map<string, number>();
        rawUsers.forEach(row => {
            if (!row.genre) return;
            const parts = row.genre.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
            parts.forEach(p => {
                userCounts.set(p, (userCounts.get(p) || 0) + 1);
            });
        });

        const formatStats = (countsMap: Map<string, number>) => {
            const result = Array.from(countsMap.entries())
                .map(([genre, count]) => ({ genre, count }))
                .sort((a, b) => b.count - a.count);
            return result;
        };

        const songStats = formatStats(songCounts);
        const userStats = formatStats(userCounts);

        // 3. Feedback engagement distribution
        const engagementStats = (await db.all(sql`
            SELECT 
              CASE 
                WHEN feedback_count >= 11 THEN 'מעל 10'
                WHEN feedback_count >= 6 THEN '6-10'
                WHEN feedback_count >= 1 THEN '1-5'
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
        `)) as { genre: string; count: number }[];

        // 4. Average listen time from Feedbacks
        const avgListenTimeResult = (await db.all(sql`
            SELECT AVG(playedSeconds) / 60.0 as avgMinutes FROM Feedback
        `)) as { avgMinutes: number }[];
        
        const averageListenTime = avgListenTimeResult[0]?.avgMinutes || 0;

        return {
            songStats,
            userStats,
            engagementStats,
            averageListenTime
        };
    } catch (error) {
        await logAction({ message: "getCommunityStats failed", data: error, source: "stats.ts" });
        throw error;
    }
}
