'use server'

import { getDb } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { desc, eq, aliasedTable, sql, and, gt } from 'drizzle-orm';
import { users, songs, feedbacks, logs } from '@/lib/schema';
import { ADMIN_EMAIL, WEIGHT_PRODUCTION, WEIGHT_SINGING, WEIGHT_OVERALL, TOP_RATED_DECAY_FACTOR } from '@/lib/constants';
import { logAction } from './logs';

async function isAdmin() {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    return email === ADMIN_EMAIL;
}

export async function getAdminSongsReport() {
    if (!await isAdmin()) return { success: false, error: "Unauthorized" };

    const db = await getDb();
    try {
        const lastFeedbackSubquery = db.select({
            songId: feedbacks.songId,
            lastFeedbackAt: sql<string>`MAX(${feedbacks.createdAt})`.as('lastFeedbackAt'),
        })
        .from(feedbacks)
        .groupBy(feedbacks.songId)
        .as('lastFeedback');

        const result = await db.select({
            id: songs.id,
            createdAt: songs.createdAt,
            title: songs.title,
            creatorName: users.name,
            creatorEmail: users.email,
            lastFeedbackAt: lastFeedbackSubquery.lastFeedbackAt
        })
        .from(songs)
        .leftJoin(users, eq(songs.userId, users.id))
        .leftJoin(lastFeedbackSubquery, eq(songs.id, lastFeedbackSubquery.songId))
        .orderBy(desc(songs.createdAt));

        return { success: true, data: result };
    } catch (error) {
        const err = error as Error;
        await logAction({
            message: "Failed to fetch songs report",
            data: { error: err.message, stack: err.stack },
            source: "actions/admin.ts:getAdminSongsReport",
        });
        return { success: false, error: "Failed to fetch songs report" };
    }
}

export async function getAdminFeedbacksReport() {
    if (!await isAdmin()) return { success: false, error: "Unauthorized" };

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
            cat2: feedbacks.cat2,
            cat3: feedbacks.cat3,
            overall: feedbacks.overall,
            comment: feedbacks.comment
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
        });
        return { success: false, error: "Failed to fetch feedbacks report" };
    }
}

export async function getAdminUsersReport() {
    if (!await isAdmin()) return { success: false, error: "Unauthorized" };

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
        .orderBy(desc(users.updatedAt));

        return { success: true, data: result };
    } catch (error) {
        const err = error as Error;
        await logAction({
            message: "Failed to fetch users report",
            data: { error: err.message, stack: err.stack },
            source: "actions/admin.ts:getAdminUsersReport",
        });
        return { success: false, error: "Failed to fetch users report" };
    }
}

export async function getAdminLogsReport() {
    if (!await isAdmin()) return { success: false, error: "Unauthorized" };

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
        });
        return { success: false, error: "Failed to fetch logs report" };
    }
}

export async function deleteAdminFeedback(id: string) {
    if (!await isAdmin()) return { success: false, error: "Unauthorized" };

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
        });
        return { success: false, error: "Failed to delete feedback" };
    }
}

export async function deleteAdminSong(id: string) {
    if (!await isAdmin()) return { success: false, error: "Unauthorized" };

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
        });
        return { success: false, error: "Failed to delete song" };
    }
}
export async function getAdminTopRatedReport() {
    if (!await isAdmin()) return { success: false, error: "Unauthorized" };

    const db = await getDb();
    const rater = aliasedTable(users, 'rater');
    
    try {
        const C_sql = sql<number>`(SELECT avg(f_global.cat2 * ${WEIGHT_PRODUCTION} + f_global.cat3 * ${WEIGHT_SINGING} + f_global.overall * ${WEIGHT_OVERALL}) FROM Feedback f_global WHERE f_global.overall > 0)`;
        
        // Explicitly define the weighted calculation components
        const weightSql = sql`CAST(COALESCE(${rater.raterScore}, 0) + 1.0 AS REAL)`;
        const ratingExprSql = sql`(CAST(${feedbacks.cat2} AS REAL) * 0.3 + CAST(${feedbacks.cat3} AS REAL) * 0.3 + CAST(${feedbacks.overall} AS REAL) * 0.4)`;

        const weightedSum = sql`SUM(${weightSql} * ${ratingExprSql})`;
        const weightedCount = sql`SUM(${weightSql})`;
        const rawAvg = sql`AVG(${ratingExprSql})`;
        const numRatings = sql`COUNT(${feedbacks.id})`;

        const bayesianAvg = sql`(((${weightedSum}) + (3.0 * ${C_sql})) / ((${weightedCount}) + 3.0))`;
        const decay = sql`CASE WHEN ${songs.topRatedLastNotified} IS NULL THEN 0 ELSE (julianday('now') - julianday(${songs.topRatedLastNotified})) * ${TOP_RATED_DECAY_FACTOR} END`;
        const finalScore = sql`(${bayesianAvg}) - (${decay})`;

        const result = await db.select({
            id: songs.id,
            title: songs.title,
            numRatings: numRatings,
            rawAvg: rawAvg,
            weightedV: weightedCount,
            weightedSum: weightedSum,
            bayesianAvg: bayesianAvg,
            decay: decay,
            finalScore: finalScore
        })
        .from(songs)
        .innerJoin(feedbacks, and(eq(songs.id, feedbacks.songId), gt(feedbacks.overall, 0)))
        .leftJoin(rater, eq(feedbacks.authorId, rater.id))
        .where(eq(songs.isActive, true))
        .groupBy(songs.id)
        .orderBy(desc(finalScore))
        .limit(20);

        return { success: true, data: result };
    } catch (error) {
        const err = error as Error;
        await logAction({
            message: "Failed to fetch top rated report",
            data: { error: err.message, stack: err.stack },
            source: "actions/admin.ts:getAdminTopRatedReport",
        });
        return { success: false, error: "Failed to fetch top rated report" };
    }
}
