// ----------------------------------------------------
// Play Order Algorithms
// ----------------------------------------------------
export interface SongWithStats {
    userId: string;
    genre: string;
    totalFeedbacks: number;
}

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------
function applyStableGenreSort<T extends SongWithStats>(songs: T[], preferredGenres: string[]): T[] {
    const sorted = [...songs];
    sorted.sort((a, b) => {
        if (preferredGenres.length > 0) {
            const aMatch = preferredGenres.includes(a.genre) ? 0 : 1;
            const bMatch = preferredGenres.includes(b.genre) ? 0 : 1;
            return aMatch - bMatch;
        }
        return 0;
    });
    return sorted;
}

/**
 * Original Random Algorithm (`randomAlg`)
 * 
 * Logic:
 * 1. Shuffles all available songs in a completely random order.
 * 2. Applies a stable sort to push songs matching the user's preferred genres to the top.
 * 
 * Result: Genre matches first (in random order), then the rest of the songs (in random order).
 */
export function randomAlgorithm<T extends SongWithStats>(
    songs: T[],
    preferredGenres: string[]
): T[] {
    // 1. Randomize
    const sorted = [...songs].sort(() => Math.random() - 0.5);

    // 2. Stable Genre Sort
    return applyStableGenreSort(sorted, preferredGenres);
}

/**
 * No Feedback Priority Algorithm (`noFeedbackPriority`)
 * 
 * Logic:
 * 1. Sorts all songs based on their total feedback count (Ascending - songs with 0 feedbacks first).
 * 2. Applies a stable sort to push songs matching the user's preferred genres to the top.
 * 3. Applies a smart scheduling (interleaving) step to ensure that two songs by the same 
 *    artist (userId) are not played back-to-back, unless there is no other choice within 
 *    the current genre matching block.
 * 
 * Result: Genre matches first (ordered by fewest feedbacks, uniquely interleaved), 
 *         followed by the rest of the songs (ordered by fewest feedbacks, uniquely interleaved).
 */
export function noFeedbackPriorityAlgorithm<T extends SongWithStats>(
    songs: T[],
    preferredGenres: string[],
    firstSongUserId: string | null
): T[] {
    // 1. Sort by fewest feedbacks first, fallback to random
    const sortedByFeedback = [...songs].sort((a, b) => {
        const countDiff = a.totalFeedbacks - b.totalFeedbacks;
        if (countDiff !== 0) return countDiff;
        return Math.random() - 0.5;
    });

    // 2. Stable Genre Sort
    const sortedSongs = applyStableGenreSort(sortedByFeedback, preferredGenres);

    // 3. Smart Scheduling / Interleaving (avoid same user back-to-back)
    const finalArr: T[] = [];
    const queue = [...sortedSongs];
    let lastUserId = firstSongUserId;

    while (queue.length > 0) {
        const targetMatchStatus = preferredGenres.length > 0
            ? (preferredGenres.includes(queue[0].genre) ? 0 : 1)
            : 0;

        let nextIndex = queue.findIndex(s => {
            const matchStatus = preferredGenres.length > 0 ? (preferredGenres.includes(s.genre) ? 0 : 1) : 0;
            return s.userId !== lastUserId && matchStatus === targetMatchStatus;
        });

        // If no alternative user in the same matched status, take the first one
        if (nextIndex === -1) {
            nextIndex = 0;
        }

        const nextSong = queue.splice(nextIndex, 1)[0];
        finalArr.push(nextSong);
        lastUserId = nextSong.userId;
    }

    return finalArr;
}

// ----------------------------------------------------
// Dispatcher
// ----------------------------------------------------

export function applyFeedAlgorithm<T extends SongWithStats>(
    songs: T[],
    preferredGenres: string[],
    //firstSongUserId: string | null
): T[] {
    //const currentMinute = new Date().getMinutes();
    //if (currentMinute % 2 === 0) {
    return randomAlgorithm(songs, preferredGenres);
    /*} else {
        return noFeedbackPriorityAlgorithm(songs, preferredGenres, firstSongUserId);
    }*/
}
