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

export const INITIAL_TOKENS = 100;
export const SONG_SUBMISSION_COST = 50;
export const UNLOCK_FEEDBACK_COST = 30;
export const FREE_FEEDBACKS_FOR_ARTIST = 2;

export const REWARD_PRODUCTION = 2;
export const REWARD_VOCALS = 2;
export const REWARD_OVERALL = 2;
export const REWARD_COMMENT = 10;

export const MIN_COMMENT_LENGTH = 30;
export const MIN_LISTEN_TIME = 40;
export const MAX_FILE_SIZE_MB = 8;
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ADMIN_EMAIL = "lior.porat.music@gmail.com";

export const TOP_RATED_NOTIFICATION_COOLDOWN_DAYS = 7;
export const TOP_RATED_MIN_RATINGS_THRESHOLD = 3;

// The amount of score points a song loses for each day it stays in the Top 10 list.
// Why: To prevent the same songs from dominating the Top 10 for too long, enabling new 
// and fresh talent to be discovered while rewarding consistent high performance.
// Lower value (e.g. 0.005) means songs stay longer; higher value (e.g. 0.05) means faster turnover.
export const TOP_RATED_DECAY_FACTOR = 0.01;

// Rating Weights (Must sum to 1.0)
export const WEIGHT_PRODUCTION = 0.3;
export const WEIGHT_SINGING = 0.3;
export const WEIGHT_OVERALL = 0.4;
