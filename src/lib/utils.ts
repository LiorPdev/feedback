/**
 * Simple utility to sanitize user input by stripping HTML tags.
 * Helps prevent basic XSS attacks.
 */
export function sanitizeInput(str: string | null | undefined): string {
  if (!str) return "";

  // Strip HTML tags using regex
  // This is a basic "defense in depth" measure.
  // React already escapes most things, but it's good to clean data before storage.
  return str
    .replace(/<[^>]*>?/gm, "") // Remove tags
    .trim();
}

/**
 * Convert a numeric rating (1-10) to a localized descriptive string.
 */
export function getRatingText(rating: number): string {
  if (rating <= 2) return "טעון שיפור";
  if (rating <= 4) return "פחות התחברתי";
  if (rating <= 5) return "סביר";
  if (rating <= 6) return "נחמד";
  if (rating <= 8) return "אהבתי";
  if (rating < 10) return "ממש טוב!";
  return "וואו, מעולה!";
}
