'use server'

import { getDb } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { desc, eq, aliasedTable, sql } from 'drizzle-orm';
import { users, songs, feedbacks, logs } from '@/lib/schema';
import { ADMIN_EMAIL } from '@/lib/constants';

async function isAdmin() {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    return email === ADMIN_EMAIL;
}

export async function getAdminSongsReport() {
    if (!await isAdmin()) return { success: false, error: "Unauthorized" };

    const db = await getDb();
    try {
        const result = await db.select({
            id: songs.id,
            createdAt: songs.createdAt,
            title: songs.title,
            creatorName: users.name,
            creatorEmail: users.email
        })
        .from(songs)
        .leftJoin(users, eq(songs.userId, users.id))
        .orderBy(desc(songs.createdAt));

        return { success: true, data: result };
    } catch (error) {
        console.error("getAdminSongsReport error:", error);
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
        console.error("getAdminFeedbacksReport error:", error);
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
        console.error("getAdminUsersReport error:", error);
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
        console.error("getAdminLogsReport error:", error);
        return { success: false, error: "Failed to fetch logs report" };
    }
}
