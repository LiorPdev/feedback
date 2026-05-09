'use server'

import { getDb } from '@/lib/db';
import { syncUser } from '@/lib/user-auth';
import { desc, eq, aliasedTable, sql, and, gt } from 'drizzle-orm';
import { users, songs, feedbacks, logs, listenEvents } from '@/lib/schema';
import { ADMIN_EMAIL, TOP_RATED_DECAY_FACTOR, TOP_RATED_MIN_RATINGS_THRESHOLD, LISTEN_TIME_WEIGHT } from '@/lib/constants';
import { logAction } from './logs';
import { summarizeFeedbacks } from '@/lib/ai-service';

async function getAdminUser() {
    const user = await syncUser();
    if (user?.email === ADMIN_EMAIL) return user;
    return null;
}

export async function getAdminSongsReport() {
    const admin = await getAdminUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    const db = await getDb();
    try {
        const feedbackStatsSubquery = db.select({
            songId: feedbacks.songId,
            lastFeedbackAt: sql<string>`MAX(${feedbacks.createdAt})`.as('lastFeedbackAt'),
            feedbackCount: sql<number>`COUNT(${feedbacks.id})`.as('feedbackCount'),
        })
            .from(feedbacks)
            .groupBy(feedbacks.songId)
            .as('feedbackStats');

        const result = await db.select({
            id: songs.id,
            createdAt: songs.createdAt,
            title: songs.title,
            slug: songs.slug,
            url: songs.url,
            creatorName: users.name,
            creatorEmail: users.email,
            creatorTokens: users.tokens,
            priority: songs.priority,
            promotedUntil: songs.promotedUntil,
            lastFeedbackAt: feedbackStatsSubquery.lastFeedbackAt,
            feedbackCount: sql<number>`COALESCE(${feedbackStatsSubquery.feedbackCount}, 0)`.as('feedbackCount')
        })
            .from(songs)
            .leftJoin(users, eq(songs.userId, users.id))
            .leftJoin(feedbackStatsSubquery, eq(songs.id, feedbackStatsSubquery.songId))
            .orderBy(desc(songs.createdAt));

        return { success: true, data: result };
    } catch (error) {
        const err = error as Error;
        await logAction({
            message: "Failed to fetch songs report",
            data: { error: err.message, stack: err.stack },
            source: "actions/admin.ts:getAdminSongsReport",
            userId: admin.id
        });
        return { success: false, error: "Failed to fetch songs report" };
    }
}

export async function getAdminFeedbacksReport() {
    const admin = await getAdminUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    const db = await getDb();
    const songCreator = aliasedTable(users, 'songCreator');
    const rater = aliasedTable(users, 'rater');

    try {
        const result = await db.select({
            id: feedbacks.id,
            createdAt: feedbacks.createdAt,
            songTitle: songs.title,
            songCreatorName: songCreator.name,
            songCreatorEmail: songCreator.email,
            authorName: rater.name,
            authorEmail: rater.email,
            overall: feedbacks.overall,
            comment: feedbacks.comment,
            isLiked: feedbacks.isLiked,
            songSlug: songs.slug,
            songUrl: songs.url
        })
            .from(feedbacks)
            .leftJoin(songs, eq(feedbacks.songId, songs.id))
            .leftJoin(songCreator, eq(songs.userId, songCreator.id))
            .leftJoin(rater, eq(feedbacks.authorId, rater.id))
            .orderBy(desc(feedbacks.createdAt));

        return { success: true, data: result };
    } catch (error) {
        const err = error as Error;
        await logAction({
            message: "Failed to fetch feedbacks report",
            data: { error: err.message, stack: err.stack },
            source: "actions/admin.ts:getAdminFeedbacksReport",
            userId: admin.id
        });
        return { success: false, error: "Failed to fetch feedbacks report" };
    }
}

export async function getAdminUsersReport() {
    const admin = await getAdminUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    const db = await getDb();
    try {
        // Subquery for last feedback GIVEN
        const givenSubquery = db.select({
            authorId: feedbacks.authorId,
            lastGiven: sql<string>`MAX(${feedbacks.createdAt})`.as('lastGiven'),
        })
            .from(feedbacks)
            .groupBy(feedbacks.authorId)
            .as('givenFeedbacks');

        // Subquery for last feedback RECEIVED
        const receivedSubquery = db.select({
            songUserId: songs.userId,
            lastReceived: sql<string>`MAX(${feedbacks.createdAt})`.as('lastReceived'),
        })
            .from(feedbacks)
            .innerJoin(songs, eq(feedbacks.songId, songs.id))
            .groupBy(songs.userId)
            .as('receivedFeedbacks');

        const result = await db.select({
            id: users.id,
            createdAt: users.createdAt,
            email: users.email,
            name: users.name,
            tokens: users.tokens,
            raterScore: users.raterScore,
            lastFeedbackGiven: givenSubquery.lastGiven,
            lastFeedbackReceived: receivedSubquery.lastReceived,
            lastVisit: users.updatedAt
        })
            .from(users)
            .leftJoin(givenSubquery, eq(givenSubquery.authorId, users.id))
            .leftJoin(receivedSubquery, eq(receivedSubquery.songUserId, users.id))
            .orderBy(desc(users.createdAt));

        return { success: true, data: result };
    } catch (error) {
        const err = error as Error;
        await logAction({
            message: "Failed to fetch users report",
            data: { error: err.message, stack: err.stack },
            source: "actions/admin.ts:getAdminUsersReport",
            userId: admin.id
        });
        return { success: false, error: "Failed to fetch users report" };
    }
}

export async function getAdminLogsReport() {
    const admin = await getAdminUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    const db = await getDb();
    try {
        const result = await db.select({
            id: logs.id,
            createdAt: logs.createdAt,
            message: logs.message,
            data: logs.data,
            source: logs.source,
            userName: users.name,
            userEmail: users.email
        })
            .from(logs)
            .leftJoin(users, eq(logs.userId, users.id))
            .orderBy(desc(logs.createdAt));

        return { success: true, data: result };
    } catch (error) {
        const err = error as Error;
        await logAction({
            message: "Failed to fetch logs report",
            data: { error: err.message, stack: err.stack },
            source: "actions/admin.ts:getAdminLogsReport",
            userId: admin.id
        });
        return { success: false, error: "Failed to fetch logs report" };
    }
}

export async function deleteAdminFeedback(id: string) {
    const admin = await getAdminUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    const db = await getDb();
    try {
        await db.delete(feedbacks).where(eq(feedbacks.id, id));
        return { success: true };
    } catch (error) {
        const err = error as Error;
        await logAction({
            message: "Failed to delete feedback",
            data: { error: err.message, stack: err.stack, feedbackId: id },
            source: "actions/admin.ts:deleteAdminFeedback",
            userId: admin.id
        });
        return { success: false, error: "Failed to delete feedback" };
    }
}

export async function deleteAdminSong(id: string) {
    const admin = await getAdminUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    const db = await getDb();
    try {
        // Cascading deletes are handled by SQLite because of the schema definitions
        await db.delete(songs).where(eq(songs.id, id));
        return { success: true };
    } catch (error) {
        const err = error as Error;
        await logAction({
            message: "Failed to delete song",
            data: { error: err.message, stack: err.stack, songId: id },
            source: "actions/admin.ts:deleteAdminSong",
            userId: admin.id
        });
        return { success: false, error: "Failed to delete song" };
    }
}
export async function getAdminTopRatedReport() {
    const admin = await getAdminUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    const db = await getDb();
    const rater = aliasedTable(users, 'rater');

    try {
        const C_sql = sql<number>`(SELECT avg(f_global.overall) FROM Feedback f_global WHERE f_global.overall > 0)`;

        // Explicitly define the weighted calculation components
        const weightSql = sql`CAST((COALESCE(${rater.raterScore}, 0) / 5.0) + 1.0 AS REAL)`;
        const ratingExprSql = sql`CAST(${feedbacks.overall} AS REAL)`;

        const weightedSum = sql`SUM(${weightSql} * ${ratingExprSql})`;
        const weightedCount = sql`SUM(${weightSql})`;
        const rawAvg = sql`AVG(${ratingExprSql})`;
        const numRatings = sql`COUNT(${feedbacks.id})`;

        // Listen stats subquery
        const listenStats = db.select({
            songId: listenEvents.songId,
            avgPlayedSeconds: sql<number>`AVG(${listenEvents.playedSeconds})`.as('avgPlayedSeconds')
        })
        .from(listenEvents)
        .groupBy(listenEvents.songId)
        .as('listenStats');

        const bayesianAvg = sql`(((${weightedSum}) + (${TOP_RATED_MIN_RATINGS_THRESHOLD} * ${C_sql})) / ((${weightedCount}) + ${TOP_RATED_MIN_RATINGS_THRESHOLD}))`;
        const listenBonus = sql`(COALESCE(${listenStats.avgPlayedSeconds}, 0) / 60.0 * ${LISTEN_TIME_WEIGHT})`;
        const decay = sql`CASE WHEN ${songs.topRatedLastNotified} IS NULL THEN 0 ELSE (julianday('now') - julianday(${songs.topRatedLastNotified})) * ${TOP_RATED_DECAY_FACTOR} END`;
        const finalScore = sql`(${bayesianAvg}) + (${listenBonus}) - (${decay})`;

        const result = await db.select({
            id: songs.id,
            title: songs.title,
            numRatings: numRatings,
            rawAvg: rawAvg,
            weightedV: weightedCount,
            weightedSum: weightedSum,
            bayesianAvg: bayesianAvg,
            listenBonus: listenBonus,
            avgListenSeconds: sql`COALESCE(${listenStats.avgPlayedSeconds}, 0)`,
            decay: decay,
            finalScore: finalScore,
            slug: songs.slug
        })
            .from(songs)
            .innerJoin(feedbacks, and(eq(songs.id, feedbacks.songId), gt(feedbacks.overall, 0)))
            .leftJoin(rater, eq(feedbacks.authorId, rater.id))
            .leftJoin(listenStats, eq(songs.id, listenStats.songId))
            .where(eq(songs.isActive, true))
            .groupBy(songs.id)
            .orderBy(desc(finalScore));

        return { success: true, data: result };
    } catch (error) {
        const err = error as Error;
        await logAction({
            message: "Failed to fetch top rated report",
            data: { error: err.message, stack: err.stack },
            source: "actions/admin.ts:getAdminTopRatedReport",
            userId: admin.id
        });
        return { success: false, error: "Failed to fetch top rated report" };
    }
}

export async function getAdminWakeUpReport() {
    const admin = await getAdminUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    const db = await getDb();
    try {
        // 1. Get users who have at least one song
        // 2. AND have no locked feedbacks (isUnlocked = false)
        // 3. AND sort by last visit (updatedAt)

        // Subquery to count locked feedbacks per user
        const lockedFeedbacksSubquery = db.select({
            userId: songs.userId,
            lockedCount: sql<number>`COUNT(${feedbacks.id})`.as('lockedCount'),
        })
            .from(feedbacks)
            .innerJoin(songs, eq(feedbacks.songId, songs.id))
            .where(eq(feedbacks.isUnlocked, false))
            .groupBy(songs.userId)
            .as('lockedFeedbacks');

        // Subquery to get song feedback counts
        const songFeedbackCounts = db.select({
            songId: feedbacks.songId,
            count: sql<number>`COUNT(${feedbacks.id})`.as('feedbackCount'),
        })
            .from(feedbacks)
            .groupBy(feedbacks.songId)
            .as('songFeedbackCounts');

        // Main query to get users and their candidate song
        // We want users who HAVE songs.
        const result = await db.select({
            id: users.id,
            userId: users.id,
            userName: users.name,
            userEmail: users.email,
            userTokens: users.tokens,
            lastVisit: users.updatedAt,
            songId: songs.id,
            songTitle: songs.title,
            songSlug: songs.slug,
            feedbackCount: sql<number>`COALESCE(${songFeedbackCounts.count}, 0)`.as('feedbackCount'),
            lockedCount: lockedFeedbacksSubquery.lockedCount,
        })
            .from(users)
            .innerJoin(songs, eq(users.id, songs.userId))
            .leftJoin(songFeedbackCounts, eq(songs.id, songFeedbackCounts.songId))
            .leftJoin(lockedFeedbacksSubquery, eq(users.id, lockedFeedbacksSubquery.userId))
            .where(eq(songs.isActive, true))
            .orderBy(users.updatedAt);

        console.log(`Debug Wake Up: Found ${result.length} user/song pairs. Filtering for no locked feedbacks...`);
        result.forEach(r => console.log(`User: ${r.userEmail}, Locked: ${r.lockedCount}`));

        const filteredResult = result.filter(r => r.lockedCount === null || r.lockedCount === 0);
        console.log(`After filter: ${filteredResult.length} pairs remaining`);

        type WakeUpRow = (typeof result)[number];
        const userMap = new Map<string, WakeUpRow>();
        for (const row of filteredResult) {
            const existing = userMap.get(row.userId);
            if (!existing || row.feedbackCount < existing.feedbackCount) {
                userMap.set(row.userId, row);
            }
        }

        const finalData = Array.from(userMap.values());

        // Now for each chosen song, we might want to fetch the actual feedbacks to show in the UI
        // But let's do that on demand or just fetch all feedbacks for these songs now if the data is not too large.
        // Actually, fetching all feedbacks for all candidate songs might be too much.
        // I'll add a separate action to fetch feedbacks for a specific song.

        return { success: true, data: finalData };
    } catch (error) {
        const err = error as Error;
        await logAction({
            message: "Failed to fetch wake up report",
            data: { error: err.message, stack: err.stack },
            source: "actions/admin.ts:getAdminWakeUpReport",
            userId: admin.id
        });
        return { success: false, error: "Failed to fetch wake up report" };
    }
}

export async function getSongFeedbacks(songId: string) {
    const admin = await getAdminUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    const db = await getDb();
    try {
        const result = await db.select({
            id: feedbacks.id,
            createdAt: feedbacks.createdAt,
            overall: feedbacks.overall,
            comment: feedbacks.comment,
            authorName: users.name,
            authorEmail: users.email,
        })
            .from(feedbacks)
            .leftJoin(users, eq(feedbacks.authorId, users.id))
            .where(eq(feedbacks.songId, songId))
            .orderBy(desc(feedbacks.createdAt));

        return { success: true, data: result };
    } catch {
        return { success: false, error: "Failed to fetch feedbacks" };
    }
}

export async function generateAIFeedback(songId: string) {
    const admin = await getAdminUser();
    if (!admin) return { success: false, error: "Unauthorized" };

    const db = await getDb();
    try {
        const songFeedbacks = await db.select({
            comment: feedbacks.comment,
            overall: feedbacks.overall,
        })
            .from(feedbacks)
            .where(eq(feedbacks.songId, songId));

        if (songFeedbacks.length === 0) {
            return { success: true, data: "אין עדיין פידבקים לשיר זה." };
        }

        const summary = await summarizeFeedbacks(songFeedbacks);
        return { success: true, data: summary };
    } catch {
        return { success: false, error: "Failed to generate AI feedback" };
    }
}
