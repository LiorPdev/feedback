"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { logAction } from "@/app/actions/logs";

/**
 * useUtmMode is a custom hook that detects if the user is in "UTM mode" (campaign/ad traffic).
 * It checks the URL for utm_source and optionally persists it in sessionStorage.
 */
export function useUtmMode(options?: { persist?: boolean }) {
  const [utmSource, setUtmSource] = useState<string | null>(null);
  const [isUtmMode, setIsUtmMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      // Robust UTM check: check URL directly to avoid useSearchParams de-sync
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const utmFromUrl = urlParams?.get("utm_source");
      
      if (utmFromUrl && options?.persist) {
        sessionStorage.setItem("campaign_source", utmFromUrl);
      }

      const storedSource = sessionStorage.getItem("campaign_source");
      const activeSource = utmFromUrl || storedSource;
      
      setUtmSource(activeSource);
      setIsUtmMode(!!activeSource);
    } catch (e) {
      logAction({
        message: "Failed to process UTM source",
        source: "useUtmMode hook",
        data: { error: String(e) }
      });
    } finally {
      setIsLoaded(true);
    }
  }, [searchParams, options?.persist]);

  return { isUtmMode, utmSource, isLoaded };
}
