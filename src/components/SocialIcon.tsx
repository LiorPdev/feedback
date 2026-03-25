"use client";

import { Youtube, Facebook, Instagram, Globe } from "lucide-react";

interface SocialIconProps {
  platform: string;
  size?: number;
  className?: string;
}

export default function SocialIcon({ platform, size = 16, className }: SocialIconProps) {
  const p = platform.toLowerCase();

  if (p === "youtube") return <Youtube size={size} className={className} />;
  if (p === "facebook") return <Facebook size={size} className={className} />;
  if (p === "instagram") return <Instagram size={size} className={className} />;
  if (p === "website") return <Globe size={size} className={className} />;

  if (p === "spotify") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className}>
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.508 17.303c-.216.353-.672.466-1.025.25-2.822-1.725-6.375-2.112-10.558-1.157-.403.093-.812-.162-.905-.565-.093-.404.162-.813.565-.905 4.582-1.048 8.497-.6 11.673 1.343.353.216.466.672.25 1.025zm1.472-3.26c-.272.441-.848.583-1.288.311-3.232-1.987-8.158-2.559-11.979-1.399-.498.151-1.026-.134-1.177-.632-.151-.497.134-1.025.632-1.176 4.372-1.327 9.813-.67 13.502 1.6C19.61 13.018 19.752 13.594 19.48 14.043zm.126-3.414c-3.876-2.301-10.279-2.513-14.004-1.383-.595.181-1.22-.16-1.401-.755-.181-.595.16-1.22.755-1.401 4.275-1.299 11.341-1.047 15.82 1.613.535.317.71 1.008.393 1.543-.317.535-1.008.71-1.543.393z" />
      </svg>
    );
  }

  if (p === "applemusic") {
    return (
      <svg viewBox="0 0 384 512" width={size} height={size} fill="currentColor" className={className}>
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
      </svg>
    );
  }

  return null;
}
