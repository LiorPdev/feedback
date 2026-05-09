
// ----------------------------------------------------
// Play Order Algorithms
// ----------------------------------------------------
import { 
    FEED_PRIORITY_WEIGHT, 
    FEED_RANDOM_JITTER_RANGE, 
    FEED_FEEDBACK_BOOST_COEFFICIENT 
} from "./constants";

export interface SongWithStats {
    userId: string;
    genre: string;
    totalFeedbacks: number;
    averageRating: number;
    priority: number;
}

/**
 * Feed Ordering Algorithm (אלגוריתם סדר השירים בפיד):
 * 1. Genre: שירים מהג'אנר המועדף על המשתמש תמיד יופיעו לפני שירים אחרים (עדיפות מוחלטת).
 * 2. Weighted Priority: שירים שקודמו (בתשלום או ע"י מנהל) מקבלים משקל גבוה יותר במיקום.
 * 3. Random Jitter: מוסיף רכיב אקראי כדי שהפיד לא יהיה סטטי וישתנה בכל טעינה.
 * 4. Feedback Boost: שירים עם מעט פידבקים מקבלים "דחיפה" כדי לעזור להם לקבל חשיפה ראשונית.
 */
export function feedOrderAlgorithm<T extends SongWithStats>(
    songs: T[],
    preferredGenres: string[]
): T[] {
    const scoredSongs = songs.map(song => {
        // The algorithm gives a head start to songs with fewer feedbacks to ensure 
        // every song gets a chance to be heard.
        const feedbackBoost = FEED_FEEDBACK_BOOST_COEFFICIENT / (song.totalFeedbacks + 1);
        
        return {
            song,
            // (Priority * Weight) ensures priority is the main driver.
            // Random Jitter ensures the feed isn't static.
            // Feedback Boost ensures new content reaches the top.
            softScore: (song.priority * FEED_PRIORITY_WEIGHT) + 
                       (Math.random() * FEED_RANDOM_JITTER_RANGE) + 
                       feedbackBoost
        };
    });

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
