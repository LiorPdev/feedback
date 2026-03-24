'use server'

import { getDb } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';
import { desc, eq, aliasedTable } from 'drizzle-orm';
import { users, songs, feedbacks } from '@/lib/schema';
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
            authorName: rater.name,
            lyrics: feedbacks.lyrics,
            composition: feedbacks.composition,
            production: feedbacks.production,
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
        const result = await db.select({
            id: users.id,
            createdAt: users.createdAt,
            email: users.email,
            name: users.name,
            tokens: users.tokens
        })
        .from(users)
        .orderBy(desc(users.createdAt));

        return { success: true, data: result };
    } catch (error) {
        console.error("getAdminUsersReport error:", error);
        return { success: false, error: "Failed to fetch users report" };
    }
}
