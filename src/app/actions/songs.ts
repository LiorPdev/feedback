'use server'

import { getDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { users, songs, feedbacks } from '@/lib/schema';

export async function createSong(formData: FormData, userId: string) {
    // Extract data from form
    const url = formData.get('url') as string;
    const title = formData.get('title') as string;
    const genre = formData.get('genre') as string;

    // Create random slug
    const slug = nanoid(6);

    const db = await getDb();

    try {
        const clerkUser = await currentUser();
        if (!clerkUser) {
            return { success: false, error: "Unauthorized" };
        }

        const email = clerkUser.emailAddresses[0]?.emailAddress || "";
        const name = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : null;

        const primaryAccount = clerkUser.externalAccounts?.[0];
        const provider = primaryAccount ? primaryAccount.provider : null;
        const providerId = primaryAccount ? primaryAccount.externalId : null;

        // Sync user with Clerk to DB
        const existingUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, clerkUser.id)
        });

        if (existingUser) {
            await db.update(users).set({ email, name, provider, providerId }).where(eq(users.id, clerkUser.id));
        } else {
            await db.insert(users).values({ id: clerkUser.id, email, name, provider, providerId });
        }

        const [newSong] = await db.insert(songs).values({
            userId: clerkUser.id,
            url,
            title,
            genre,
            slug,
        }).returning();

        revalidatePath('/dashboard');
        return { success: true, song: newSong };
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { success: false, error: "הקישור הזה כבר נשלח בעבר" };
        }
        console.error("Failed to create song:", error);
        return { success: false, error: "שגיאה בשליחת השיר, אנא נסו שוב" };
    }
}

export async function addFeedback(data: {
    songId: string;
    lyrics: number;
    composition: number;
    production: number;
    overall: number;
    comment: string;
}) {
    const db = await getDb();
    try {
        const [feedback] = await db.insert(feedbacks).values({
            songId: data.songId,
            lyrics: data.lyrics,
            composition: data.composition,
            production: data.production,
            overall: data.overall,
            comment: data.comment,
        }).returning();

        // Revalidate both views to show the new feedback
        revalidatePath('/give-feedback/[slug]', 'page');
        revalidatePath('/show-feedback/[slug]', 'page');
        return { success: true, feedback };
    } catch (error) {
        console.error("Failed to add feedback:", error);
        return { success: false, error: "שגיאה בשמירת הפידבק, אנא נסו שוב" };
    }
}

export async function deleteSong(songId: string) {
    const clerkUser = await currentUser();
    if (!clerkUser) {
        return { success: false, error: "Unauthorized" };
    }

    const db = await getDb();
    try {
        // Double check ownership
        const song = await db.query.songs.findFirst({
            where: (songs, { eq }) => eq(songs.id, songId),
            columns: { userId: true }
        });

        if (!song || song.userId !== clerkUser.id) {
            return { success: false, error: "לא מורשה" };
        }

        await db.delete(songs).where(eq(songs.id, songId));

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete song:", error);
        return { success: false, error: "שגיאה במחיקת השיר" };
    }
}