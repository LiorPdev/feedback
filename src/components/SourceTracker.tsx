"use client";

import { useUtmMode } from "@/hooks/useUtmMode";

/**
 * SourceTracker is a non-visual component that captures marketing source parameters
 * (like utm_source) from the URL and persists them in sessionStorage for the duration
 * of the user's stay. This allows attribution even if they navigate away from the landing page.
 */
export default function SourceTracker() {
  useUtmMode({ persist: true });

  return null;
}
