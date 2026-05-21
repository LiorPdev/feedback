import { MAX_SONG_NAME_LENGTH, MAX_FEW_WORDS_LENGTH } from "./constants";
import { sanitizeInput } from "./utils";

export const YOUTUBE_DOMAINS = ["youtube.com", "youtu.be"];

export function isYouTubeUrl(url: string = ""): boolean {
  return YOUTUBE_DOMAINS.some(domain => url.includes(domain));
}

export function isR2Url(url: string = ""): boolean {
  return url.includes("r2.dev");
}

export function isShortsUrl(url: string = ""): boolean {
  return url.includes("/shorts");
}

export function isPlaylistUrl(url: string = ""): boolean {
  return url.includes("/playlist") || (url.includes("list=") && !url.includes("v="));
}

export function isAudioUrl(url: string = ""): boolean {
  return !!url.match(/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i) || isR2Url(url);
}

export const SONG_VALIDATION_MESSAGES = {
  ONLY_YOUTUBE: "חלק מהנגנים מגבילים האזנה ממקורות חיצוניים. יש לשתף קישורים מיוטיוב בלבד או להעלות קובץ.",
  NO_SHORTS: "לא ניתן לשלוח Youtube Shorts. אנא צרפו קישור לשיר רגיל.",
  NO_PLAYLIST: "אנא צרפו קישור לשיר ולא קישור לפלייליסט.",
  MIN_DURATION: (seconds: number) => `אורך השיר חייב להיות לפחות ${seconds} שניות`,
  LOAD_ERROR: "שגיאה בטעינת פרטי השיר",
};

export function validateSongUrl(url: string): { success: boolean; error?: string } {
  const normalizedUrl = url.trim();

  if (!normalizedUrl) return { success: true };

  try {
    new URL(normalizedUrl);
  } catch {
    return { success: false, error: "קישור לא תקין" };
  }

  const isYT = isYouTubeUrl(normalizedUrl);
  const isR2 = isR2Url(normalizedUrl);

  if (!isYT && !isR2) {
    return { success: false, error: SONG_VALIDATION_MESSAGES.ONLY_YOUTUBE };
  }

  if (isYT) {
    if (isShortsUrl(normalizedUrl)) {
      return { success: false, error: SONG_VALIDATION_MESSAGES.NO_SHORTS };
    }
    if (isPlaylistUrl(normalizedUrl)) {
      return { success: false, error: SONG_VALIDATION_MESSAGES.NO_PLAYLIST };
    }
  }

  return { success: true };
}

export function cleanSongTitle(title: string): string {
  return sanitizeInput(title).substring(0, MAX_SONG_NAME_LENGTH);
}

export function detectArtistInTitle(title: string, artistName: string): boolean {
  const normArtist = artistName.trim().toLowerCase().replace(/\s+/g, ' ');
  const normTitle = title.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normArtist.length <= 2 || !normTitle) {
    return false;
  }

  return normTitle.includes(normArtist);
}

export function cleanFewWords(text: string = ""): string {
  return sanitizeInput(text).substring(0, MAX_FEW_WORDS_LENGTH);
}

/**
 * Extracts YouTube Video ID for use in embeds or other logic
 */
export function getYouTubeVideoId(url: string): string | null {
  const ytMatch = url.match(
    /(?:https?:\/\/)?(?:www\.|music\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/)?([a-zA-Z0-9_-]{11})/
  );
  return ytMatch ? ytMatch[1] : null;
}
