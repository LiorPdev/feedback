'use server'

import { getDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { currentUser, auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { users, songs, feedbacks } from '@/lib/schema';
import { SONG_SUBMISSION_COST, INITIAL_TOKENS, REWARD_LYRICS, REWARD_COMPOSITION, REWARD_PRODUCTION, REWARD_OVERALL, REWARD_COMMENT, MIN_COMMENT_LENGTH } from '@/lib/constants';
import { sendFeedbackNotification } from '@/lib/mail';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "@/lib/r2";
import { logToDb } from "@/lib/logger";

export async function getPresignedUploadUrl(fileName: string, contentType: string) {
    const fileKey = `${nanoid()}-${fileName}`;
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
        ContentType: contentType,
    });

    const url = await getSignedUrl(r2, command, { expiresIn: 3600 });
    return { url, fileKey };
}

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
            await logToDb({ message: "createSong: No clerk user found", source: "songs.ts:createSong" });
            return { success: false, error: "חובה להתחבר כדי לשלוח שיר" };
        }

        const email = clerkUser.emailAddresses[0]?.emailAddress || "";
        const name = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : null;

        const primaryAccount = clerkUser.externalAccounts?.[0];
        const provider = primaryAccount ? primaryAccount.provider : null;
        const providerId = primaryAccount ? primaryAccount.externalId : null;

        // Sync user with Clerk to DB
        let dbUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, clerkUser.id)
        });

        if (dbUser) {
            await db.update(users).set({ email, name, provider, providerId }).where(eq(users.id, clerkUser.id));
        } else {
            const [newUser] = await db.insert(users).values({ id: clerkUser.id, email, name, provider, providerId }).returning();
            dbUser = newUser;
        }

        // Check tokens
        if (!dbUser || dbUser.tokens < SONG_SUBMISSION_COST) {
            return {
                success: false,
                error: `אין לך מספיק קרדיט לשליחת השיר. עלות שליחה היא ${SONG_SUBMISSION_COST} [MUSIC_ICON]. ניתן לקבל קרדיט על ידי מתן פידבק לשירים אחרים!`,
                type: 'insufficient_tokens'
            };
        }

        const [newSong] = await db.insert(songs).values({
            userId: clerkUser.id,
            url,
            title,
            genre,
            slug,
        }).returning();

        // Deduct tokens
        await db.update(users)
            .set({ tokens: dbUser.tokens - SONG_SUBMISSION_COST })
            .where(eq(users.id, clerkUser.id));

        revalidatePath('/dashboard');
        return { success: true, song: newSong };
    } catch (error: any) {
        await logToDb({ message: "Failed to create song details", data: error, source: "songs.ts:createSong" });

        // Handle common SQLite errors
        const errorStr = String(error);
        if (errorStr.includes('UNIQUE constraint failed: Song.url') || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return { success: false, error: "השיר הזה כבר נשלח בעבר על ידי מישהו אחר" };
        }

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
    playedSeconds?: number;
}) {
    const clerkUser = await currentUser();
    if (!clerkUser) {
        return { success: false, error: "חובה להתחבר כדי לתת פידבק" };
    }

    const db = await getDb();
    try {
        // Sync/get user to grant credits
        let dbUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, clerkUser.id)
        });

        if (!dbUser) {
            // If user exists in Clerk but not DB, create them
            const email = clerkUser.emailAddresses[0]?.emailAddress || "";
            const name = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : null;
            const primaryAccount = clerkUser.externalAccounts?.[0];
            const provider = primaryAccount ? primaryAccount.provider : null;
            const providerId = primaryAccount ? primaryAccount.externalId : null;

            const [newUser] = await db.insert(users).values({
                id: clerkUser.id,
                email,
                name,
                provider,
                providerId,
                tokens: INITIAL_TOKENS
            }).returning();
            dbUser = newUser;
        }

        const [feedback] = await db.insert(feedbacks).values({
            songId: data.songId,
            authorId: clerkUser.id,
            lyrics: data.lyrics,
            composition: data.composition,
            production: data.production,
            overall: data.overall,
            comment: data.comment,
            playedSeconds: data.playedSeconds,
        }).returning();

        // Calculate rewards
        let reward = 0;
        if (data.lyrics > 0) reward += REWARD_LYRICS;
        if (data.composition > 0) reward += REWARD_COMPOSITION;
        if (data.production > 0) reward += REWARD_PRODUCTION;
        if (data.overall > 0) reward += REWARD_OVERALL;
        if (data.comment.trim().length >= MIN_COMMENT_LENGTH) reward += REWARD_COMMENT;

        // Grant credits
        await db.update(users)
            .set({ tokens: (dbUser.tokens || 0) + reward })
            .where(eq(users.id, clerkUser.id));

        // Revalidate both views to show the new feedback and updated tokens in dashboard
        revalidatePath('/dashboard');
        revalidatePath('/give-feedback/[slug]', 'page');
        revalidatePath('/show-feedback/[slug]', 'page');

        // Send email notification to uploader
        try {
            const song = await db.query.songs.findFirst({
                where: (songs, { eq }) => eq(songs.id, data.songId),
                with: { user: true }
            });

            if (song?.user?.email) {
                await sendFeedbackNotification({
                    to: song.user.email,
                    songTitle: song.title,
                    songSlug: song.slug
                });
            }
        } catch (emailError) {
            await logToDb({ message: "Email notification failed", data: emailError, source: "songs.ts:addFeedback" });
        }

        return { success: true, feedback };
    } catch (error) {
        await logToDb({ message: "Failed to add feedback details", data: error, source: "songs.ts:addFeedback" });
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
        await logToDb({ message: "Failed to delete song", data: error, source: "songs.ts:deleteSong" });
        return { success: false, error: "שגיאה במחיקת השיר" };
    }
}

export async function getUserTokens(userId: string) {
    const db = await getDb();
    try {
        const user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, userId),
            columns: { tokens: true }
        });
        return { success: true, tokens: user?.tokens ?? 0 };
    } catch (error) {
        await logToDb({ message: "Failed to get user tokens", data: error, source: "songs.ts:getUserTokens" });
        return { success: true, tokens: 0 };
    }
}

export async function getUserSongCount(userId: string) {
    const db = await getDb();
    try {
        const userSongs = await db.query.songs.findMany({
            where: (songs, { eq }) => eq(songs.userId, userId),
            columns: { id: true }
        });
        return { success: true, count: userSongs.length };
    } catch (error) {
        await logToDb({ message: "Failed to get song count", data: error, source: "songs.ts:getUserSongCount" });
        return { success: true, count: 0 };
    }
}

export async function getFeedSongs(firstSongSlug?: string) {
    const { userId } = await auth();
    const db = await getDb();

    try {
        // Get IDs of songs the user has already rated
        let ratedSongIds: string[] = [];
        if (userId) {
            const userFeedbacks = await db.query.feedbacks.findMany({
                where: (feedbacks, { eq }) => eq(feedbacks.authorId, userId),
                columns: { songId: true }
            });
            ratedSongIds = userFeedbacks.map(f => f.songId);
        }

        // Fetch the first song specifically if requested
        let firstSong = null;
        if (firstSongSlug) {
            firstSong = await db.query.songs.findFirst({
                where: (songs, { eq }) => eq(songs.slug, firstSongSlug),
                with: {
                    user: {
                        columns: {
                            name: true
                        }
                    }
                }
            });
        }

        const remainingSongs = await db.query.songs.findMany({
            where: (songs, { ne, and, not, inArray }) => {
                const filters = [];

                // Don't show user's own songs
                if (userId) {
                    filters.push(ne(songs.userId, userId));
                }

                // Don't show already rated songs
                if (ratedSongIds.length > 0) {
                    filters.push(not(inArray(songs.id, ratedSongIds)));
                }

                // Exclude the first song if it was fetched explicitly
                if (firstSongSlug) {
                    filters.push(ne(songs.slug, firstSongSlug));
                }

                return filters.length > 0 ? and(...filters) : undefined;
            },
            with: {
                user: {
                    columns: {
                        name: true
                    }
                }
            },
            orderBy: (songs, { sql }) => [sql`RANDOM()`]
        });

        const finalSongs = firstSong ? [firstSong, ...remainingSongs] : remainingSongs;

        return { success: true, songs: finalSongs };
    } catch (error) {
        await logToDb({ message: "Failed to fetch feed songs", data: error, source: "songs.ts:getFeedSongs" });
        return { success: false, error: "שגיאה בטעינת השירים" };
    }
}

export async function updateSong(songId: string, data: { title: string, url: string, genre: string }) {
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

        await db.update(songs)
            .set({
                title: data.title,
                url: data.url,
                genre: data.genre
            })
            .where(eq(songs.id, songId));

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        await logToDb({ message: "Failed to update song", data: error, source: "songs.ts:updateSong" });
        return { success: false, error: "שגיאה בעדכון השיר" };
    }
}

function decodeHtmlEntities(str: string) {
    if (!str) return '';
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

function cleanTitle(title: string) {
    if (!title) return '';

    return title
        .replace(/ - song and lyrics by .*\| Spotify/gi, '')
        .replace(/ \| Spotify/gi, '')
        .replace(/ \| YouTube/gi, '')
        .replace(/ - SoundCloud/gi, '')
        .replace(/ \(Official Video\)/gi, '')
        .replace(/ \(Official Audio\)/gi, '')
        .replace(/ \(Official Music Video\)/gi, '')
        .replace(/ \(Lyrics\)/gi, '')
        .replace(/ - Album$/gi, '')
        .replace(/ - YouTube$/gi, '')
        .trim();
}

export async function getURLMetadata(url: string) {
    try {
        // Support Spotify OEmbed
        if (url.includes('spotify.com')) {
            const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
            const res = await fetch(oembedUrl);
            if (res.ok) {
                const data = await res.json();
                return { success: true, title: cleanTitle(decodeHtmlEntities(data.title)) };
            }
        }

        // Support YouTube OEmbed
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const res = await fetch(oembedUrl);
            if (res.ok) {
                const data = await res.json();
                return { success: true, title: cleanTitle(decodeHtmlEntities(data.title)) };
            }
        }

        // Support SoundCloud OEmbed
        if (url.includes('soundcloud.com')) {
            const oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const res = await fetch(oembedUrl);
            if (res.ok) {
                const data = await res.json();
                return { success: true, title: cleanTitle(decodeHtmlEntities(data.title)) };
            }
        }

        // Generic fallback: fetch page and parse Open Graph or <title>
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FeedbackSpaceBot/1.0;)'
            }
        });
        if (res.ok) {
            const html = await res.text();

            // Try Open Graph title first
            const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);

            if (ogMatch && ogMatch[1]) {
                const title = cleanTitle(decodeHtmlEntities(ogMatch[1]));
                if (title) return { success: true, title };
            }

            // Fallback to <title>
            const match = html.match(/<title>(.*?)<\/title>/i);
            if (match && match[1]) {
                const title = cleanTitle(decodeHtmlEntities(match[1]));
                if (title) return { success: true, title };
            }
        }

        return { success: false, error: "לא ניתן היה למצוא כותרת באופן אוטומטי" };
    } catch (error) {
        await logToDb({ message: "Failed to fetch metadata", data: error, source: "songs.ts:getURLMetadata" });
        return { success: false, error: "שגיאה בגישה לקישור" };
    }
}