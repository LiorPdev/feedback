export const GENRES = [
  "פופ",
  "רוק",
  "בלדה",
  "אינדי",
  "צ'יל",
  "בלוז",
  "פולק",
  "פאנקי/גרוב",
  "היפ-הופ",
  "ים תיכוני",
  "אלקטרוני",
  "אחר"
];

export const MAX_SONG_TITLE_LENGTH = 30;

// Tokens i get
export const INITIAL_TOKENS = 100;
export const FREE_FEEDBACKS_FOR_ARTIST = 2;
export const LIKE_FEEDBACK_REWARD = 20;
export const REWARD_PRODUCTION = 1;
export const REWARD_VOCALS = 1;
export const REWARD_OVERALL = 1;
export const REWARD_COMMENT = 10;

// Tokens i spend
export const SONG_SUBMISSION_COST = 50;
export const UNLOCK_FEEDBACK_COST = 30;

export const MIN_COMMENT_LENGTH = 30;
export const COMMENT_LENGTH_BONUS = 60;
export const MIN_LISTEN_TIME = 40;
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ADMIN_EMAIL = "lior.porat.music@gmail.com";

export const TOP_RATED_NOTIFICATION_COOLDOWN_DAYS = 7;
export const TOP_RATED_MIN_RATINGS_THRESHOLD = 3;

// The amount of score points a song loses for each day it stays in the Top 10 list.
// Why: To prevent the same songs from dominating the Top 10 for too long, enabling new 
// and fresh talent to be discovered while rewarding consistent high performance.
// Lower value (e.g. 0.005) means songs stay longer; higher value (e.g. 0.05) means faster turnover.
export const TOP_RATED_DECAY_FACTOR = 0.07;

// Rating Weights (Must sum to 1.0)
export const WEIGHT_PRODUCTION = 0.3;
export const WEIGHT_SINGING = 0.3;
export const WEIGHT_OVERALL = 0.4;

// Rater Score Configuration (Weights must sum to 1.0)
export const RATER_WEIGHT_TEXT = 0.35;             // 35% - Weight for simply providing a text comment
export const RATER_WEIGHT_LENGTH = 0.15;           // 15% - Weight for the length/depth of the comment
export const RATER_WEIGHT_COUNT = 0.3;             // 30% - Weight for user's total number of ratings
export const RATER_WEIGHT_CONSENSUS = 0.2;         // 20% - Weight for rating similarity to other users

export const RATER_TARGET_CHARS_FOR_BONUS = 100;   // Number of characters required for maximum length bonus
export const RATER_COUNT_RATES = 30;               // Number of total ratings required for maximum count bonus
export const RATER_MIN_REVIEWS_TO_COMPARE = 2;     // Minimum ratings on a song before we calculate consensus score
