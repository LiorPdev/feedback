
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
 * 1. Genere: שירים מהג'אנר שהמשתמש אוהב תמיד יופיעו לפני שירים אחרים.
 * 2. ציון משולב: בתוך הג'אנר, השירים ממוינים לפי ציון משוקלל.
 *    - (Priority): הערך שנקבע ידנית.
 *    - (Quality): ממוצע הדירוגים (0-5). שיר חדש מקבל ציון התחלתי גבוה (4) כדי לתת לו חשיפה.
 *    שיר איכותי מאוד יכול לעקוף שיר עם עדיפות נמוכה, מה שיוצר תחושה טבעית יותר למשתמש.
 * 3. Random: אם הציון המשוקלל זהה, השירים יופיעו בסדר אקראי שמשתנה בכל טעינה.
 */
export function feedOrderAlgorithm<T extends SongWithStats>(
    songs: T[],
    preferredGenres: string[]
): T[] {
    // First random all songs
    const randomized = [...songs].sort(() => Math.random() - 0.5);

    const calculateScore = (s: T) => {
        // A song with no feedback is considered high quality
        const quality = s.totalFeedbacks === 0 ? 4 : s.averageRating;
        // The formula: priority (0-anyNumber) + quality (0-5) multiplied by 10 (which gives up to 50 bonus points)
        return s.priority + (quality * 10);
    };

    return [...randomized].sort((a, b) => {
        // Genre first
        if (preferredGenres.length > 0) {
            const aMatch = preferredGenres.includes(a.genre) ? 0 : 1;
            const bMatch = preferredGenres.includes(b.genre) ? 0 : 1;
            if (aMatch !== bMatch) return aMatch - bMatch;
        }

        // Score Sort
        const aScore = calculateScore(a);
        const bScore = calculateScore(b);
        if (aScore !== bScore) return bScore - aScore;

        return 0; // Keep the original random order
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
