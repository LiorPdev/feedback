
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
    // First random all songs to ensure randomness within same priority groups
    const randomized = [...songs].sort(() => Math.random() - 0.5);

    return [...randomized].sort((a, b) => {
        // 1. Genre match first
        if (preferredGenres.length > 0) {
            const aMatch = preferredGenres.includes(a.genre) ? 0 : 1;
            const bMatch = preferredGenres.includes(b.genre) ? 0 : 1;
            if (aMatch !== bMatch) return aMatch - bMatch;
        }

        // 2. Priority Sort (High to Low)
        if (a.priority !== b.priority) {
            return b.priority - a.priority;
        }

        // 3. Keep the original random order for ties
        return 0;
    });
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
