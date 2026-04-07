import { useState, useCallback } from 'react';
import { logAction } from "@/app/actions/logs";

interface ShareOptions {
  title: string;
  text: string;
  url: string;
}

export function useShare() {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async ({ title, text, url }: ShareOptions) => {
    // Check if the user is on a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );

    if (isMobile && navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        // Silently return if the user cancelled the share (standard browser behavior)
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        logAction({
          message: "Share API failed",
          data: { error: String(err) },
          source: "useShare.ts:navigator.share"
        });
      }
    } else {
      // On desktop (or if navigator.share is unavailable), use clipboard
      const shareText = `${text}\n${url}`;
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 4000);
      } catch (err) {
        logAction({
          message: "Clipboard copy failed",
          data: { error: String(err) },
          source: "useShare.ts:navigator.clipboard"
        });
      }
    }
  }, []);

  return { share, copied };
}
