'use server'

import { getDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { eq, sql, and, notInArray, inArray, gt, aliasedTable } from 'drizzle-orm';
import { users, songs, feedbacks, listenEvents } from '@/lib/schema';
import { SONG_SUBMISSION_COST, REWARD_PRODUCTION, REWARD_VOCALS, REWARD_OVERALL, REWARD_COMMENT, MIN_COMMENT_LENGTH, COMMENT_LENGTH_BONUS, TOP_RATED_MIN_RATINGS_THRESHOLD, TOP_RATED_NOTIFICATION_COOLDOWN_DAYS, WEIGHT_PRODUCTION, WEIGHT_SINGING, WEIGHT_OVERALL, TOP_RATED_DECAY_FACTOR, MAX_SONG_TITLE_LENGTH } from '@/lib/constants';
import { sendFeedbackNotification, sendTopRatedNotification } from '@/lib/mail';
import { logToDb } from "@/lib/logger";
import { deleteFileFromR2 } from '@/app/actions/upload';
import { syncUser } from '@/lib/user-auth';
import { sanitizeInput } from '@/lib/utils';
import { updateRaterScore } from '@/lib/rater-score';
import { applyFeedAlgorithm } from '@/lib/feed-algorithms';

export async function createSong(formData: FormData) {
    // Extract and sanitize data from form
    const url = formData.get('url') as string;
    const title = sanitizeInput(formData.get('title') as string).substring(0, MAX_SONG_TITLE_LENGTH);
    const genre = sanitizeInput(formData.get('genre') as string);
    const guestEmail = formData.get('guestEmail') as string | null;

    // Strict URL validation: Only YouTube or internal R2 uploads
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
    const isR2 = url.includes("r2.dev");

    if (url && !isYouTube && !isR2) {
        return { success: false, error: "ניתן לשתף קישורים מיוטיוב בלבד" };
    }

    // Create random slug
    const slug = nanoid(6);

    const db = await getDb();

    try {
        // Resolve internal identity (with conditional metadata sync)
        let dbUser = await syncUser();
        let isGuestSubmission = false;

        // Guest Flow: If not authenticated but coming from an ad (we assume ad-status passed via guestEmail presence)
        if (!dbUser && guestEmail) {
            const sanitizedEmail = sanitizeInput(guestEmail).toLowerCase();

            // Security Check: Does this email already exist?
            const existingUser = await db.query.users.findFirst({
                where: eq(users.email, sanitizedEmail)
            });

            if (existingUser) {
                // Return a specific error if user exists to prevent "hijacking" accounts
                return {
                    success: false,
                    error: "EMAIL_EXISTS",
                    message: "המייל הזה כבר קיים במערכת. כדי להמשיך, עליך להתחבר לחשבון שלך."
                };
            }

            // Create new "shadow" user for this guest
            const [newUser] = await db.insert(users).values({
                id: crypto.randomUUID(),
                email: sanitizedEmail,
                tokens: 100, // Give them initial tokens for future use
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }).returning();

            dbUser = newUser;
            isGuestSubmission = true;

            // Give them a session cookie so they "behave like any other user"
            const cookieStore = await cookies();
            cookieStore.set("tmp_id", dbUser.id, {
                expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/"
            });
        }

        if (!dbUser) {
            return { success: false, error: "יש להתחבר כדי לשלוח שיר" };
        }

        // Check if song already exists for this specific user
        const existingSong = await db.query.songs.findFirst({
            where: (songs, { eq, and }) => and(eq(songs.url, url), eq(songs.userId, dbUser.id))
        });

        if (existingSong) {
            return { success: false, error: "השיר כבר הועלה בעבר וקיים באיזור האישי" };
        }

        // Check tokens (Skip for guest submissions arriving from ads)
        if (!isGuestSubmission && dbUser.tokens < SONG_SUBMISSION_COST) {
            return { success: false, error: "יתרת קרדיט נמוכה מדי", type: "insufficient_tokens" };
        }

        const [newSong] = await db.insert(songs).values({
            userId: dbUser.id,
            url,
            title,
            genre,
            slug,
        }).returning();

        // Deduct tokens (Skip for guest submissions)
        if (!isGuestSubmission) {
            await db.update(users)
                .set({ tokens: dbUser.tokens - SONG_SUBMISSION_COST })
                .where(eq(users.id, dbUser.id));
        }

        revalidatePath('/dashboard');
        return { success: true, song: newSong };
    } catch (error: unknown) {
        await logToDb({ message: "Failed to create song details", data: error, source: "songs.ts:createSong" });

        const errorStr = String(error);
        if (errorStr.includes('UNIQUE constraint failed') || (error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return { success: false, error: "שגיאה בשמירת השיר, נסה שוב" };
        }

        return { success: false, error: "שגיאה בשליחת השיר, אנא נסו שוב" };
    }
}

export async function addFeedback(data: {
    songId: string;
    cat2: number;
    cat3: number;
    overall: number;
    comment: string;
    playedSeconds?: number;
    listenCredits?: number;
}) {
    const db = await getDb();
    try {
        // Resolve internal identity (with conditional metadata sync)
        const dbUser = await syncUser();

        const [feedback] = await db.insert(feedbacks).values({
            songId: data.songId,
            authorId: dbUser?.id || null,
            cat1: 0, // FFU - Not used but required by schema
            cat2: data.cat2,
            cat3: data.cat3,
            overall: data.overall,
            comment: sanitizeInput(data.comment),
            playedSeconds: data.playedSeconds,
        }).returning();

        // Update rater score asynchronously
        if (dbUser) {
            updateRaterScore(dbUser.id).catch(err =>
                logToDb({ message: "Async updateRaterScore failed", data: err, source: "songs.ts:addFeedback" })
            );
        }

        if (dbUser) {
            // Calculate rewards (only for authenticated users)
            let reward = 0;
            if (data.cat2 > 0) reward += REWARD_PRODUCTION;
            if (data.cat3 > 0) reward += REWARD_VOCALS;
            if (data.overall > 0) reward += REWARD_OVERALL;
            if (data.comment.trim().length >= MIN_COMMENT_LENGTH) reward += REWARD_COMMENT;
            if (data.comment.trim().length >= COMMENT_LENGTH_BONUS) reward += REWARD_COMMENT;
            if (data.listenCredits) reward += data.listenCredits;

            // Grant credits
            await db.update(users)
                .set({ tokens: (dbUser.tokens || 0) + reward })
                .where(eq(users.id, dbUser.id));
        }

        // Revalidate both views to show the new feedback and updated tokens in dashboard
        revalidatePath('/dashboard');
        revalidatePath('/give-feedback');
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

        // Fetch averages for the song after the new feedback (ignoring 0 ratings)
        const allFeedbacks = await db.query.feedbacks.findMany({
            where: (feedbacks, { eq, and, gt }) => and(
                eq(feedbacks.songId, data.songId),
                gt(feedbacks.overall, 0)
            ),
            columns: { cat2: true, cat3: true, overall: true }
        });

        const totalRatedFeedbacks = allFeedbacks.length;
        const averageRating = totalRatedFeedbacks > 0
            ? allFeedbacks.reduce((acc, f) => acc + (f.cat2 * WEIGHT_PRODUCTION + f.cat3 * WEIGHT_SINGING + f.overall * WEIGHT_OVERALL), 0) / totalRatedFeedbacks
            : 0;

        // Revalidate top-rated as well since it might change
        revalidatePath('/top-rated');

        // Check and notify for Top-Rated status (asynchronously)
        checkAndNotifyTopRated().catch(err =>
            logToDb({ message: "Async checkAndNotifyTopRated failed", data: err, source: "songs.ts:addFeedback" })
        );

        return { success: true, feedback, averageRating, totalFeedbacks: totalRatedFeedbacks, error: undefined };

    } catch (error) {
        await logToDb({ message: "Failed to add feedback", data: error, source: "songs.ts:addFeedback" });
        return { success: true, feedback: undefined, averageRating: undefined, totalFeedbacks: undefined, error: undefined };
    }
}

export async function recordListenEvent(data: {
    songId: string;
    playedSeconds: number;
}) {
    // Ignore very short listens (< 2 seconds) — noise filter
    if (!data.playedSeconds || data.playedSeconds < 2) {
        return { success: true, skipped: true };
    }

    const db = await getDb();
    try {
        const dbUser = await syncUser();

        await db.insert(listenEvents).values({
            songId: data.songId,
            userId: dbUser?.id || null,
            playedSeconds: data.playedSeconds,
        });

        return { success: true };
    } catch (error) {
        await logToDb({ message: "Failed to record listen event", data: error, source: "songs.ts:recordListenEvent" });
        return { success: false };
    }
}

export async function getListenTimeEvents(songId: string) {
    const db = await getDb();
    try {
        const events = await db.query.listenEvents.findMany({
            where: (listenEvents, { eq }) => eq(listenEvents.songId, songId),
            orderBy: (listenEvents, { desc }) => [desc(listenEvents.createdAt)],
            with: {
                user: {
                    columns: { userGenre: true }
                }
            }
        });

        // Calculate average listen time
        const avgSeconds = events.length > 0
            ? Math.round(events.reduce((sum, e) => sum + e.playedSeconds, 0) / events.length)
            : 0;

        return { success: true, events, avgSeconds };
    } catch (error) {
        await logToDb({ message: "Failed to get listen events", data: error, source: "songs.ts:getListenEvents" });
        return { success: false, events: [], avgSeconds: 0 };
    }
}

export async function deleteSong(songId: string) {
    const db = await getDb();
    try {
        const dbUser = await syncUser();
        if (!dbUser) {
            return { success: false, error: "לא מחובר" };
        }

        // Double check ownership
        const song = await db.query.songs.findFirst({
            where: (songs, { eq, and }) => and(eq(songs.id, songId), eq(songs.userId, dbUser.id)),
            columns: { userId: true, url: true }
        });

        if (!song) {
            return { success: false, error: "לא מורשה" };
        }

        // Clear R2 if it's an uploaded file
        if (song.url.includes("r2.dev")) {
            try {
                const fileKey = song.url.split("/").pop();
                if (fileKey) {
                    await deleteFileFromR2(fileKey);
                }
            } catch (err) {
                await logToDb({ message: "R2 deletion error during song delete", data: err, source: "songs.ts:deleteSong" });
            }
        }

        await db.delete(songs).where(eq(songs.id, songId));

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        await logToDb({ message: "Failed to delete song", data: error, source: "songs.ts:deleteSong" });
        return { success: false, error: "שגיאה במחיקת השיר" };
    }
}

export async function getUserTokens() {
    try {
        const dbUser = await syncUser();
        if (!dbUser) return { success: true, tokens: 0 };
        return { success: true, tokens: dbUser.tokens ?? 0 };
    } catch (error) {
        await logToDb({ message: "Failed to get user tokens", data: error, source: "songs.ts:getUserTokens" });
        return { success: true, tokens: 0 };
    }
}

export async function getUserSongCount() {
    try {
        const dbUser = await syncUser();
        if (!dbUser) return { success: true, count: 0 };

        const db = await getDb();
        const result = await db.select({
            count: sql<number>`count(*)`
        })
            .from(songs)
            .where(eq(songs.userId, dbUser.id));

        return { success: true, count: result[0]?.count ?? 0 };
    } catch (error) {
        await logToDb({ message: "Failed to get song count", data: error, source: "songs.ts:getUserSongCount" });
        return { success: false, count: 0 };
    }
}

export async function getFeedSongs(firstSongSlug?: string) {
    const dbUser = await syncUser();
    const db = await getDb();

    try {
        // Get IDs of songs the user has already rated
        let ratedSongIds: string[] = [];
        if (dbUser) {
            const userFeedbacks = await db.query.feedbacks.findMany({
                where: (feedbacks, { eq }) => eq(feedbacks.authorId, dbUser.id),
                columns: { songId: true }
            });
            ratedSongIds = userFeedbacks.map(f => f.songId);
        }

        // 1. Get user's preferred genre if authenticated
        let preferredGenre: string | null = null;
        if (dbUser) {
            preferredGenre = dbUser.userGenre ?? null;
        }

        // 2. Fetch the first song specifically if requested
        let firstSong = null;
        if (firstSongSlug) {
            firstSong = await db.query.songs.findFirst({
                where: (songs, { eq, and }) => and(eq(songs.slug, firstSongSlug), eq(songs.isActive, true)),
                with: {
                    user: {
                        columns: {
                            name: true,
                            socialLinks: true
                        }
                    }
                }
            });
        }

        const remainingSongs = await db.query.songs.findMany({
            where: (songs, { ne, and, not, inArray, eq }) => {
                const filters = [];

                // Don't show user's own songs
                if (dbUser) {
                    filters.push(ne(songs.userId, dbUser.id));
                }

                // Don't show already rated songs
                if (ratedSongIds.length > 0) {
                    filters.push(not(inArray(songs.id, ratedSongIds)));
                }

                // Exclude the first song if it was fetched explicitly
                if (firstSongSlug) {
                    filters.push(ne(songs.slug, firstSongSlug));
                }

                // Only show active songs
                filters.push(eq(songs.isActive, true));

                return filters.length > 0 ? and(...filters) : undefined;
            },
            with: {
                user: {
                    columns: {
                        name: true,
                        socialLinks: true
                    }
                }
            },
        });

        const allSongsToProcess = firstSong ? [firstSong, ...remainingSongs] : remainingSongs;
        let songsWithStats = allSongsToProcess.map(s => ({ ...s, averageRating: 0, totalFeedbacks: 0 }));

        if (allSongsToProcess.length > 0) {
            const songIds = allSongsToProcess.map(s => s.id);
            const stats = await db.select({
                songId: feedbacks.songId,
                total: sql<number>`count(${feedbacks.id})`,
                avgRating: sql<number>`avg(${feedbacks.cat2} * ${WEIGHT_PRODUCTION} + ${feedbacks.cat3} * ${WEIGHT_SINGING} + ${feedbacks.overall} * ${WEIGHT_OVERALL})`
            })
                .from(feedbacks)
                .where(and(inArray(feedbacks.songId, songIds), gt(feedbacks.overall, 0)))
                .groupBy(feedbacks.songId);

            const statsMap = new Map(stats.map(s => [s.songId, s]));
            songsWithStats = allSongsToProcess.map(s => ({
                ...s,
                averageRating: statsMap.get(s.id)?.avgRating ?? 0,
                totalFeedbacks: statsMap.get(s.id)?.total ?? 0
            }));
        }

        const processedFirstSong = firstSong ? songsWithStats[0] : null;
        const processedRemainingSongs = firstSong ? songsWithStats.slice(1) : songsWithStats;

        // 3. Sort/Prioritize based on Algorithm Output
        const preferredGenres = preferredGenre
            ? preferredGenre.split(",").map(g => g.trim()).filter(Boolean)
            : [];

        const sortedSongs = applyFeedAlgorithm(
            processedRemainingSongs,
            preferredGenres
        );

        const finalOutputSongs = processedFirstSong ? [processedFirstSong, ...sortedSongs] : sortedSongs;

        return { success: true, songs: finalOutputSongs };
    } catch (error) {
        await logToDb({ message: "Failed to fetch feed songs", data: error, source: "songs.ts:getFeedSongs" });
        return { success: false, error: "שגיאה בטעינת השירים" };
    }
}

export async function updateSong(songId: string, data: { title: string, url: string, genre: string }) {
    try {
        const dbUser = await syncUser();
        if (!dbUser) return { success: false, error: "לא מחובר" };

        const db = await getDb();

        const song = await db.query.songs.findFirst({
            where: (songs, { eq, and }) => and(eq(songs.id, songId), eq(songs.userId, dbUser.id)),
        });

        if (!song) return { success: false, error: "לא מורשה" };

        const isYouTube = data.url.includes("youtube.com") || data.url.includes("youtu.be");
        const isR2 = data.url.includes("r2.dev");

        if (data.url && !isYouTube && !isR2) {
            return { success: false, error: "ניתן לשתף קישורים מיוטיוב בלבד" };
        }

        await db.update(songs)
            .set({
                title: sanitizeInput(data.title).substring(0, MAX_SONG_TITLE_LENGTH),
                url: data.url,
                genre: sanitizeInput(data.genre)
            })
            .where(eq(songs.id, songId));

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        await logToDb({ message: "Failed to update song", data: error, source: "songs.ts:updateSong" });
        return { success: false, error: "שגיאה בעדכון השיר" };
    }
}

export async function toggleSongStatus(songId: string, isActive: boolean) {
    const db = await getDb();
    try {
        const dbUser = await syncUser();
        if (!dbUser) return { success: false, error: "לא מחובר" };

        // Double check ownership
        const song = await db.query.songs.findFirst({
            where: (songs, { eq, and }) => and(eq(songs.id, songId), eq(songs.userId, dbUser.id)),
            columns: { userId: true }
        });

        if (!song) {
            return { success: false, error: "לא מורשה" };
        }

        await db.update(songs)
            .set({ isActive: isActive })
            .where(eq(songs.id, songId));

        revalidatePath('/dashboard');
        revalidatePath('/give-feedback');
        return { success: true };
    } catch (error) {
        await logToDb({ message: "Failed to toggle song status", data: error, source: "songs.ts:toggleSongStatus" });
        return { success: false, error: "שגיאה בעדכון סטטוס השיר" };
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

function parseISO8601Duration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
}

function cleanTitle(title: string) {
    if (!title) return '';

    return title
        .replace(/ - song and lyrics by .*\| Spotify/gi, '')
        .replace(/ \| Spotify/gi, '')
        .replace(/ \| YouTube/gi, '')
        .replace(/ \(Official Video\)/gi, '')
        .replace(/ \(Official Audio\)/gi, '')
        .replace(/ \(Official Music Video\)/gi, '')
        .replace(/ \(Lyrics\)/gi, '')
        .replace(/ - Album$/gi, '')
        .replace(/ - YouTube$/gi, '')
        .trim();
}

export async function searchYouTubeVideos(query: string) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return { success: false, error: "Missing API Key" };
    if (!query || query.length < 2) return { success: true, results: [] };

    try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${apiKey}`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) return { success: false, error: "Search failed" };

        const searchData = await searchRes.json();
        if (!searchData.items) return { success: true, results: [] };

        const results = searchData.items.map((item: { id: { videoId: string }, snippet: { title: string, thumbnails: { default: { url: string }, medium: { url: string } } } }) => ({
            id: item.id.videoId,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            title: decodeHtmlEntities(item.snippet.title),
            thumbnail: item.snippet.thumbnails.default?.url || item.snippet.thumbnails.medium?.url
        }));

        return { success: true, results };
    } catch {
        return { success: false, error: "Search error" };
    }
}

async function searchYouTube(query: string, targetDuration?: number) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return null;

    try {
        // Step 1: Search for candidates
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${apiKey}`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) return null;

        const searchData = await searchRes.json();
        if (!searchData.items || searchData.items.length === 0) {
            return null;
        }

        // Step 2: Get durations and details for candidates
        const videoIds = searchData.items.map((item: { id: { videoId: string } }) => item.id.videoId).join(',');
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${apiKey}`;
        const detailsRes = await fetch(detailsUrl);
        if (!detailsRes.ok) return null;

        const detailsData = await detailsRes.json();
        let bestMatch = null;
        let minScore = Infinity;

        for (const item of detailsData.items) {
            const duration = parseISO8601Duration(item.contentDetails.duration);
            const diff = targetDuration ? Math.abs(duration - targetDuration) : 0;
            const title = item.snippet.title.toLowerCase();
            const channelTitle = item.snippet.channelTitle.toLowerCase();

            // Scoring system: lower score is better
            let score = targetDuration ? diff * 5 : 0;

            // Topic channels are the "Holy Grail" for matching Spotify
            if (channelTitle.includes('topic')) score -= 50;

            // Bonus for exact title matches (ignoring case)
            if (title.includes(query.toLowerCase())) score -= 20;

            // Penalties for common "noise" that adds duration
            if (title.includes('video') || title.includes('clip') || title.includes('קליפ')) score += 30;
            if (title.includes('live') || title.includes('הופעה')) score += 50;

            if (score < minScore) {
                minScore = score;
                bestMatch = item;
            }
        }

        if (bestMatch) {
            const finalDuration = parseISO8601Duration(bestMatch.contentDetails.duration);
            // If we have a target, check reasonable threshold (30s if artist matches well)
            if (!targetDuration || Math.abs(finalDuration - targetDuration) < 30 || minScore < 0) {
                return {
                    url: `https://www.youtube.com/watch?v=${bestMatch.id}`,
                    title: decodeHtmlEntities(bestMatch.snippet.title)
                };
            }
        }

        return null;
    } catch {
        return null;
    }
}

export async function getURLMetadata(url: string) {
    try {
        // Support Spotify OEmbed
        if (url.includes('spotify.com')) {
            const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
            const res = await fetch(oembedUrl);
            if (res.ok) {
                const data = await res.json();

                let title = cleanTitle(decodeHtmlEntities(data.title));
                let artist = decodeHtmlEntities(data.author_name || "");

                // Get duration and extra metadata from Spotify page
                let spotifyDuration: number | undefined;
                try {
                    const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } });
                    if (pageRes.ok) {
                        const html = await pageRes.text();

                        // Strategy 1: JSON-LD (Most reliable if present)
                        try {
                            const scriptTags = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
                            if (scriptTags) {
                                for (const tag of scriptTags) {
                                    const jsonStr = tag.replace(/<script[^>]*>|<\/script>/gi, '');
                                    const ldData = JSON.parse(jsonStr);

                                    if (ldData.name && !title) title = cleanTitle(decodeHtmlEntities(ldData.name));
                                    if (ldData.duration && !spotifyDuration) spotifyDuration = parseISO8601Duration(ldData.duration);

                                    // Extract artist from byArtist or description
                                    if (!artist) {
                                        if (ldData.byArtist && ldData.byArtist.name) {
                                            artist = decodeHtmlEntities(ldData.byArtist.name);
                                        } else if (ldData.byArtist && Array.isArray(ldData.byArtist) && ldData.byArtist[0].name) {
                                            artist = decodeHtmlEntities(ldData.byArtist[0].name);
                                        } else if (ldData.description) {
                                            // Pattern: "Song · Artist Name · Year"
                                            const desc = decodeHtmlEntities(ldData.description);
                                            const match = desc.match(/Song · (.*?) ·/i);
                                            if (match) artist = match[1];
                                        }
                                    }
                                }
                            }
                        } catch {
                            // Silently ignore LD errors in production
                        }

                        // Strategy 2: Global Duration Search (more aggressive)
                        if (!spotifyDuration) {
                            const globalDurationMatch = html.match(/["']duration_ms["']\s*:\s*(\d+)/i) ||
                                html.match(/["']durationMS["']\s*:\s*(\d+)/i);
                            if (globalDurationMatch) {
                                const ms = parseInt(globalDurationMatch[1]);
                                if (ms > 1000) spotifyDuration = Math.floor(ms / 1000);
                            }
                        }

                        // Strategy 3: Meta Tags (Fallback)
                        if (!spotifyDuration || !artist) {
                            const durationMatch =
                                html.match(/property=["']music:duration["'][^>]*content=["'](\d+)["']/i) ||
                                html.match(/content=["'](\d+)["'][^>]*property=["']music:duration["']/i);

                            if (durationMatch && !spotifyDuration) {
                                spotifyDuration = parseInt(durationMatch[1]);
                            }

                            if (!artist) {
                                const ogDescMatch = html.match(/property=["']og:description["'][^>]*content=["']([^"']+)· Song · ([^"']+)["']/i);
                                if (ogDescMatch) artist = decodeHtmlEntities(ogDescMatch[1]);
                            }
                        }
                    }
                } catch (e) {
                    await logToDb({ message: "[Spotify Page Fetch] Error", data: e, source: "songs.ts:getURLMetadata" });
                }

                // Final Cleanups
                if (artist && title && artist.includes(title)) {
                    // Avoid "Artist - Title Title" if artist contains title
                    artist = artist.replace(title, '').replace(/[\s·|-]+$/, '').trim();
                }

                // Search with Artist + Title for much better accuracy
                const searchQuery = artist ? `${artist} ${title}` : title;
                const youtubeAlternative = await searchYouTube(searchQuery, spotifyDuration);

                return {
                    success: true,
                    title,
                    youtubeAlternative
                };
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

const authorUsers = aliasedTable(users, 'authorUsers');

/**
 * Bayesian Rating Formula: (v*R + m*C) / (v+m)
 * v = sum of weights (weight = raterScore + 1)
 * R = weighted average rating of the song
 * m = minimum ratings threshold (prior weight)
 * C = global simple average rating
 */
function getBayesianRatingSql(m: number, C: number | ReturnType<typeof sql>) {
    const weightSql = sql`CAST(COALESCE(${authorUsers.raterScore}, 0) + 1.0 AS REAL)`;
    const ratingExprSql = sql`(CAST(${feedbacks.cat2} AS REAL) * 0.3 + CAST(${feedbacks.cat3} AS REAL) * 0.3 + CAST(${feedbacks.overall} AS REAL) * 0.4)`;

    const weightedSum = sql`SUM(${weightSql} * ${ratingExprSql})`;
    const weightedCount = sql`SUM(${weightSql})`;

    const bayesianAvg = sql<number>`
        ( (${weightedSum}) + (${m} * ${C}) )
        / ( (${weightedCount}) + ${m} )
    `;

    // Final score = Bayesian Average - (Days since entry * Decay Factor)
    return sql<number>`
        ${bayesianAvg} - (CASE 
            WHEN ${songs.topRatedLastNotified} IS NULL THEN 0 
            ELSE (julianday('now') - julianday(${songs.topRatedLastNotified})) * ${TOP_RATED_DECAY_FACTOR} 
        END)
    `;
}

export interface TopRatedSong {
    id: string;
    title: string;
    url: string;
    genre: string;
    artist: string | null;
    slug: string;
    userId: string;
    topRatedLastNotified: string | null;
    socialLinks: string | null;
    averageRating: number;
    totalFeedbacks: number;
    weightedRating: number;
}

export async function getTopRatedSongs(): Promise<{ success: boolean; songs?: TopRatedSong[]; error?: string }> {
    const db = await getDb();
    try {
        // Calculate the Bayesian threshold (m) and the global average (C) as a subquery
        const m = TOP_RATED_MIN_RATINGS_THRESHOLD;
        const C_sql = sql<number>`(SELECT avg(f_global.cat2 * ${WEIGHT_PRODUCTION} + f_global.cat3 * ${WEIGHT_SINGING} + f_global.overall * ${WEIGHT_OVERALL}) FROM Feedback f_global WHERE f_global.overall > 0)`;

        const weightedRatingSql = getBayesianRatingSql(m, C_sql);

        const topSongs = await db.select({
            id: songs.id,
            title: songs.title,
            url: songs.url,
            genre: songs.genre,
            artist: songs.artist,
            slug: songs.slug,
            userId: songs.userId,
            topRatedLastNotified: songs.topRatedLastNotified,
            socialLinks: users.socialLinks,
            averageRating: sql<number>`CAST(AVG(CAST(${feedbacks.cat2} AS REAL) * 0.3 + CAST(${feedbacks.cat3} AS REAL) * 0.3 + CAST(${feedbacks.overall} AS REAL) * 0.4) AS REAL)`,
            totalFeedbacks: sql<number>`count(${feedbacks.id})`,
            weightedRating: weightedRatingSql
        })
            .from(songs)
            .innerJoin(feedbacks, and(eq(songs.id, feedbacks.songId), gt(feedbacks.overall, 0)))
            .innerJoin(users, eq(songs.userId, users.id)) // Song owner
            .leftJoin(authorUsers, eq(feedbacks.authorId, authorUsers.id)) // Feedback author (for quality)
            .where(eq(songs.isActive, true))
            .groupBy(songs.id)
            .orderBy(sql`${weightedRatingSql} DESC`)
            .limit(10);

        return { success: true, songs: topSongs };
    } catch (error) {
        await logToDb({ message: "Failed to fetch top rated songs", data: error, source: "songs.ts:getTopRatedSongs" });
        return { success: false, error: "שגיאה בטעינת השירים המדורגים" };
    }
}

/**
 * Checks if any song in the current Top 10 should receive a notification.
 * Logic for non-developers:
 * 1. Calculate the current Top 10 songs on the site.
 * 2. If a song just entered the Top 10 (wasn't there before):
 *    - Check if we already sent them an email in the last 7 days (to avoid spam).
 *    - If not, send a celebratory email and mark them as "In Top 10".
 * 3. If a song is no longer in the Top 10, mark it as "Out" so we can detect its next entry.
 * Runs asynchronously to avoid blocking the main feedback submission flow.
 */
export async function checkAndNotifyTopRated() {
    const db = await getDb();
    try {
        // 1. Get current Top 10 using the shared Bayesian logic
        const m = TOP_RATED_MIN_RATINGS_THRESHOLD;
        const C_sql = sql<number>`(SELECT avg(f_global.cat2 * ${WEIGHT_PRODUCTION} + f_global.cat3 * ${WEIGHT_SINGING} + f_global.overall * ${WEIGHT_OVERALL}) FROM Feedback f_global WHERE f_global.overall > 0)`;
        const weightedRatingSql = getBayesianRatingSql(m, C_sql);

        const currentTop10 = await db.select({
            id: songs.id,
            title: songs.title,
            slug: songs.slug,
            userId: songs.userId,
            topRatedLastNotified: songs.topRatedLastNotified,
            isInTopRated: songs.isInTopRated,
        })
            .from(songs)
            .innerJoin(feedbacks, and(eq(songs.id, feedbacks.songId), gt(feedbacks.overall, 0)))
            .leftJoin(authorUsers, eq(feedbacks.authorId, authorUsers.id)) // Feedback author (for quality)
            .where(eq(songs.isActive, true))
            .groupBy(songs.id)
            .orderBy(sql`${weightedRatingSql} DESC`)
            .limit(10);

        const currentTop10Ids = currentTop10.map(s => s.id);
        const now = new Date();
        const cooldownMs = TOP_RATED_NOTIFICATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

        // 2. Handle Entries (songs in Top 10 but flag is false)
        for (let i = 0; i < currentTop10.length; i++) {
            const song = currentTop10[i];

            if (!song.isInTopRated) {
                // ENTRY EVENT!
                const lastNotified = song.topRatedLastNotified ? new Date(song.topRatedLastNotified) : null;

                // Check if never notified OR cooldown passed
                if (!lastNotified || (now.getTime() - lastNotified.getTime() >= cooldownMs)) {
                    // Fetch user email
                    const user = await db.query.users.findFirst({
                        where: (users, { eq }) => eq(users.id, song.userId),
                        columns: { email: true }
                    });

                    if (user?.email) {
                        const result = await sendTopRatedNotification({
                            to: user.email,
                            songTitle: song.title,
                        });

                        if (result.success) {
                            // Update last notified date
                            await db.update(songs)
                                .set({
                                    topRatedLastNotified: now.toISOString(),
                                    isInTopRated: true
                                })
                                .where(eq(songs.id, song.id));
                        } else {
                            await logToDb({
                                message: `Top-Rated notification failed for song: ${song.title}`,
                                data: result.error,
                                source: "songs.ts:checkAndNotifyTopRated"
                            });
                            // Still set the flag to true so we don't keep trying to send email on every feedback
                            // if it's already in the top 10 (we'll try again next time it "enters").
                            await db.update(songs).set({ isInTopRated: true }).where(eq(songs.id, song.id));
                        }
                    } else {
                        // Mark as In even if no email found
                        await db.update(songs).set({ isInTopRated: true }).where(eq(songs.id, song.id));
                    }
                } else {
                    // Re-entered before cooldown. Mark as In but don't send mail.
                    await db.update(songs).set({ isInTopRated: true }).where(eq(songs.id, song.id));
                }
            }
        }

        // 3. Handle Exits (songs marked as In but not in the current IDs)
        if (currentTop10Ids.length > 0) {
            await db.update(songs)
                .set({ isInTopRated: false })
                .where(and(
                    eq(songs.isInTopRated, true),
                    notInArray(songs.id, currentTop10Ids)
                ));
        } else {
            // If Top 10 is somehow empty, clear all flags
            await db.update(songs).set({ isInTopRated: false }).where(eq(songs.isInTopRated, true));
        }

    } catch (error) {
        await logToDb({ message: "Failed in checkAndNotifyTopRated", data: error, source: "songs.ts:checkAndNotifyTopRated" });
    }
}