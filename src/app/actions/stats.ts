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

        return {
            songStats,
            userStats
        };
    } catch (error) {
        await logAction({ message: "getCommunityStats failed", data: error, source: "stats.ts" });
        throw error;
    }
}
