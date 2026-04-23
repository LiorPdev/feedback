
// ----------------------------------------------------
// Play Order Algorithms
// ----------------------------------------------------
export interface SongWithStats {
    userId: string;
    genre: string;
    totalFeedbacks: number;
    averageRating: number;
    priority: number;
}

/**
 * 
 * 1. Genre: שירים מהג'אנר שהמשתמש אוהב תמיד יופיעו לפני שירים אחרים.
 * 2. Priority: בתוך הג'אנר, שירים עם עדיפות גבוהה יותר יופיעו קודם.
 * 3. Random: שירים עם אותה רמת עדיפות יופיעו בסדר אקראי שמשתנה בכל טעינה.
 */
export function feedOrderAlgorithm<T extends SongWithStats>(
    songs: T[],
    preferredGenres: string[]
): T[] {
    // We map songs to include a random "jitter score" to allow for soft sorting.
    // This ensures high-priority songs usually appear first, but provides variety.
    const scoredSongs = songs.map(song => ({
        song,
        // Priority + random noise (0-1.5). 
        // This allows a priority 1 song to occasionally beat a priority 2 song.
        softScore: song.priority + (Math.random() * 1.5)
    }));

    return scoredSongs.sort((a, b) => {
        // 1. Genre match first (Strict)
        if (preferredGenres.length > 0) {
            const aMatch = preferredGenres.includes(a.song.genre) ? 0 : 1;
            const bMatch = preferredGenres.includes(b.song.genre) ? 0 : 1;
            if (aMatch !== bMatch) return aMatch - bMatch;
        }

        // 2. Sort by Soft Score (High to Low)
        return b.softScore - a.softScore;
    }).map(item => item.song);
}

// ----------------------------------------------------
// Dispatcher
// ----------------------------------------------------

export function applyFeedAlgorithm<T extends SongWithStats>(
    songs: T[],
    preferredGenres: string[],
): T[] {
    return feedOrderAlgorithm(songs, preferredGenres);
}
