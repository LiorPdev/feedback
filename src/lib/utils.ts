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
