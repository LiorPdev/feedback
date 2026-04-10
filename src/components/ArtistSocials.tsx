"use client";

import { useState, useRef, useEffect } from "react";
import SocialIcon from "./SocialIcon";
import styles from "./ArtistSocials.module.css";

interface ArtistSocialsProps {
  socialLinks?: string | null;
  size?: number;
}

export default function ArtistSocials({ socialLinks, size = 16 }: ArtistSocialsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpwards, setIsUpwards] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If space below is less than 240px (enough for ~5-6 items), open upwards
      setIsUpwards(spaceBelow < 250);
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!socialLinks) return null;


  let links: Record<string, string | undefined> = {};
  try {
    links = JSON.parse(socialLinks) as Record<string, string | undefined>;
  } catch {
    return null;
  }

  if (!links) return null;

  const platforms = [
    { id: "spotify", name: "Spotify", url: links.spotify },
    { id: "youtube", name: "YouTube", url: links.youtube },
    { id: "applemusic", name: "Apple Music", url: links.appleMusic },
    { id: "instagram", name: "Instagram", url: links.instagram },
    { id: "facebook", name: "Facebook", url: links.facebook },
    { id: "website", name: "Website", url: links.website },
  ].filter(p => p.url);

  if (platforms.length === 0) return null;

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.moreBtn}
        onClick={toggleDropdown}
        ref={buttonRef}
        title="כרטיס ביקור מוזיקלי"
      >
        <SocialIcon platform="music" size={size} />
      </button>

      {isOpen && (
        <div className={`${styles.dropdown} ${isUpwards ? styles.dropdownUp : ""}`}>
          {platforms.map(p => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              title={p.name}
              className={styles.dropdownLink}
              onClick={() => setIsOpen(false)}
            >
              <SocialIcon platform={p.id} size={size + 2} />
              <span>{p.name}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

