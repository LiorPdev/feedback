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

export const MAX_SONG_TITLE_LENGTH = 25;
export const MIN_SONG_DURATION_SECONDS = 50;

// Tokens i get
export const INITIAL_TOKENS = 150;
export const FREE_FEEDBACKS_FOR_ARTIST = 2;
export const LIKE_FEEDBACK_REWARD = 20;
export const REWARD_PRODUCTION = 1;
export const REWARD_VOCALS = 1;
export const REWARD_OVERALL = 1;
export const REWARD_COMMENT = 10;

// Tokens i spend (Try and keep the same amount)
export const SONG_SUBMISSION_COST = 50;
export const UNLOCK_FEEDBACK_COST = 50;

export const MIN_COMMENT_LENGTH = 40;
export const COMMENT_LENGTH_BONUS = 60;
export const MIN_LISTEN_TIME = 40;
export const MAX_FILE_SIZE_MB = 13;
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ADMIN_EMAIL = "lior.porat.music@gmail.com";

// The amount of score points a song loses for each day it stays in the Top 10 list.
// Why: To prevent the same songs from dominating the Top 10 for too long, enabling new 
// and fresh talent to be discovered while rewarding consistent high performance.
// Lower value (e.g. 0.005) means songs stay longer; higher value (e.g. 0.05) means faster turnover.
export const TOP_RATED_DECAY_FACTOR = 0.06;
export const TOP_RATED_NOTIFICATION_COOLDOWN_DAYS = 3;  // Days a song must stay out of Top 10 to reset its decay and allow new notification
export const TOP_RATED_MIN_RATINGS_THRESHOLD = 4;       // Minimum number of ratings a song must have to be eligible for the Top 10 list

// Rating Weights (Must sum to 1.0)
export const WEIGHT_PRODUCTION = 0.3;
export const WEIGHT_SINGING = 0.3;
export const WEIGHT_OVERALL = 0.4;

// Rater Score Configuration
export const RATER_WEIGHT_LIKES_RATE = 0.6;        // 60% - Weight for percentage of feeds liked by authors
export const RATER_WEIGHT_FEEDBACKS_COUNT = 0.4;   // 40% - Weight for volume of feedbacks
export const RATER_LIKES_THRESHOLD = 0.4;          // 40% likes required for a perfect score in the likes component
export const RATER_FEEDBACKS_VOLUME_THRESHOLD = 15; // 15 feedbacks required for a perfect volume score


// For feedback counter logic on landing page (higher number = less feedbacks shown)
export const FEEDBACK_COUNT_FACTOR = 30;
