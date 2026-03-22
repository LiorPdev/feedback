'use server'

import { getDb } from '@/lib/db';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { currentUser, auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { users, songs, feedbacks } from '@/lib/schema';
import { SONG_SUBMISSION_COST, INITIAL_TOKENS, REWARD_LYRICS, REWARD_COMPOSITION, REWARD_PRODUCTION, REWARD_OVERALL, REWARD_COMMENT, MIN_COMMENT_LENGTH } from '@/lib/constants';
import { sendFeedbackNotification } from '@/lib/mail';
import { logToDb } from "@/lib/logger";
import { deleteFileFromR2 } from '@/app/actions/upload';
import { syncUser } from '@/lib/user-auth';

export async function createSong(formData: FormData) {
    // Extract data from form
    const url = formData.get('url') as string;
    const title = formData.get('title') as string;
    const genre = formData.get('genre') as string;

    // Strict URL validation: Only YouTube, Spotify, or internal R2 uploads
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
    const isSpotify = url.includes("spotify.com");
    const isR2 = url.includes("r2.dev");
    
    if (url && !isYouTube && !isSpotify && !isR2) {
        return { success: false, error: "ניתן לשתף קישורים מיוטיוב או ספוטיפיי בלבד" };
    }

    // Create random slug
    const slug = nanoid(6);

    const db = await getDb();

    try {
        const clerkUser = await currentUser();
        if (!clerkUser) {
            await logToDb({ message: "createSong: No clerk user found", source: "songs.ts:createSong" });
            return { success: false, error: "חובה להתחבר כדי לשלוח שיר" };
        }

        // Sync user with Clerk to DB using shared utility
        const dbUser = await syncUser();

        if (!dbUser) {
            return { success: false, error: "משתמש לא נמצא" };
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
    } catch (error: unknown) {
        await logToDb({ message: "Failed to create song details", data: error, source: "songs.ts:createSong" });

        // Handle common SQLite errors
        const errorStr = String(error);
        if (errorStr.includes('UNIQUE constraint failed: Song.url') || (error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
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
        // Sync/get user to grant credits using shared utility
        const dbUser = await syncUser();

        if (!dbUser) {
            return { success: false, error: "משתמש לא נמצא" };
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
            columns: { userId: true, url: true }
        });

        if (!song || song.userId !== clerkUser.id) {
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

async function searchYouTube(query: string, targetDuration?: number) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return null;

    console.log(`[YouTube Search] Query: "${query}", Target Duration: ${targetDuration}s`);

    try {
        // Step 1: Search for candidates
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${apiKey}`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) return null;

        const searchData = await searchRes.json();
        if (!searchData.items || searchData.items.length === 0) {
            console.log(`[YouTube Search] No results found for query.`);
            return null;
        }

        // Step 2: Get durations and details for candidates
        const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
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
                console.log(`[YouTube Search] Selected: "${bestMatch.snippet.title}" (Score: ${minScore})`);
                return {
                    url: `https://www.youtube.com/watch?v=${bestMatch.id}`,
                    title: decodeHtmlEntities(bestMatch.snippet.title)
                };
            }
        }

        console.log(`[YouTube Search] No satisfying match found (Best Score: ${minScore}).`);
        return null;
    } catch (error) {
        console.error(`[YouTube Search] Error:`, error);
        return null;
    }
}

export async function getURLMetadata(url: string) {
    console.log(`[Server Action] getURLMetadata called with: ${url}`);
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
                        } catch (ldError) {
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
                    console.error(`[Spotify Page Fetch] Error:`, e);
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