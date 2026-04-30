'use server'

import { getDb } from '@/lib/db';
import { syncUser } from '@/lib/user-auth';
import { desc, eq, aliasedTable, sql, and, gt } from 'drizzle-orm';
import { users, songs, feedbacks, logs, listenEvents } from '@/lib/schema';
import { ADMIN_EMAIL, WEIGHT_OVERALL, TOP_RATED_DECAY_FACTOR, TOP_RATED_MIN_RATINGS_THRESHOLD, LISTEN_TIME_WEIGHT } from '@/lib/constants';
import { logAction } from './logs';

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
            songSlug: songs.slug
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
        const C_sql = sql<number>`(SELECT avg(f_global.overall * ${WEIGHT_OVERALL}) FROM Feedback f_global WHERE f_global.overall > 0)`;

        // Explicitly define the weighted calculation components
        const weightSql = sql`CAST((COALESCE(${rater.raterScore}, 0) / 5.0) + 1.0 AS REAL)`;
        const ratingExprSql = sql`(CAST(${feedbacks.overall} AS REAL) * ${WEIGHT_OVERALL})`;

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
