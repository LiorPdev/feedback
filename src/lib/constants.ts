export const GENRES = [
  "פופ",
  "רוק",
  "בלדה",
  "אינדי",
  "צ'יל",
  "בלוז",
  "פולק",
  "פאנקי",
  "היפ-הופ",
  "ים תיכוני",
  "אלקטרוני",
  "אחר"
];

export const ADMIN_EMAIL = "lior.porat.music@gmail.com";

export const MAX_SONG_NAME_LENGTH = 25;
export const MAX_FEW_WORDS_LENGTH = 110;
export const MAX_ACTIVE_SONGS = 6;
export const MAX_FILE_SIZE_MB = 15;
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MIN_SONG_DURATION_SECONDS = 50;

// Tokens i get
export const INITIAL_TOKENS = 150;                // Amount of tokens a user gets when signing up.
export const FREE_FEEDBACKS_FOR_ARTIST = 1;       // Number of initial feedbacks an artist receives for free before having to "pay" to unlock.
export const LIKE_FEEDBACK_REWARD = 10;           // Amount of tokens a user gets when gets a like on his feedback.
export const REWARD_PER_COMMENT_STEP = 5;         // Tokens reward for each comment step in a feedback.
export const COMMENT_STEP_LENGTH = 25;            // Number of characters required to get the reward for comment step.
export const LISTEN_REWARD_INTERVAL_SECONDS = 10; // Seconds of playback required to get the reward.
export const LISTEN_REWARD_TOKENS = 1;            // Amount of tokens rewarded for each interval.

// Tokens i spend (Try and keep the same amount 50/50)
export const SONG_SUBMISSION_COST = 50;
export const UNLOCK_FEEDBACK_COST = 50;
export const PROMOTION_COST = 300;

// Feedback feed
export const MIN_COMMENT_LENGTH = 70;
export const MAX_COMMENT_LENGTH = 500;
export const MIN_LISTEN_TIME = 40;
export const MIN_LISTEN_EVENT_SECONDS = 40;       // Minimum seconds needed to play a song to be entered into listenEvents table

// Top Rated List Configuration
export const LISTEN_TIME_WEIGHT = 0.3;            // Every minute of average listening adds this many points to the rating
export const TOP_RATED_DECAY_FACTOR = 0.07;       // Amount of score points a song loses for each day it stays in the Top 10 list. To prevent the same songs from dominating the Top 10 for too long. Lower value (e.g. 0.005) means songs stay longer; higher value (e.g. 0.05) means faster turnover.
export const TOP_RATED_MIN_RATINGS_THRESHOLD = 4; // Damping factor (m) for Bayesian rating. Higher value means more ratings are needed to overcome the global average and reach the top.
export const TOP_LISTENED_MIN_FEEDBACKS = 3;      // Display songs in top rated by listen time only if were rated at least 3 times

// Rater Score Configuration
export const RATER_WEIGHT_LIKES_RATE = 0.6;        // 60% - Weight for percentage of feeds liked by authors
export const RATER_WEIGHT_FEEDBACKS_COUNT = 0.5;   // 50% - Weight for volume of feedbacks
export const RATER_LIKES_THRESHOLD = 0.5;          // 50% likes required for a perfect score in the likes component
export const RATER_FEEDBACKS_VOLUME_THRESHOLD = 20; // 20 feedbacks required for a perfect volume score

// For feedback counter logic on landing page (higher number = less feedbacks shown)
export const FEEDBACK_COUNT_FACTOR = 35;

// Feed Algorithm Configuration
// Algorithm: (Priority from DB * FEED_PRIORITY_WEIGHT) + FEED_RANDOM_JITTER_RANGE + (FEED_FEEDBACK_BOOST_COEFFICIENT / (totalFeedbacks + 1))
export const FEED_PRIORITY_WEIGHT = 2.0;            // Multiplier for the song's priority level
export const FEED_RANDOM_JITTER_RANGE = 1.5;        // Range of random noise (0 to 1.5)
export const FEED_FEEDBACK_BOOST_COEFFICIENT = 0.3; // Max boost for songs with 0 feedbacks