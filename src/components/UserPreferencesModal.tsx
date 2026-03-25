"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import SocialIcon from "./SocialIcon";
import { motion, AnimatePresence } from "framer-motion";
import { GENRES } from "@/lib/constants";
import { updateUserGenre } from "@/app/actions/user";
import styles from "./UserPreferencesModal.module.css";

interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGenre: string;
  initialSocialLinks: string;
}

interface SocialLinks {
  spotify?: string;
  youtube?: string;
  appleMusic?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
}

export default function UserPreferencesModal({
  isOpen,
  onClose,
  initialGenre,
  initialSocialLinks,
}: UserPreferencesModalProps) {
  const [localGenres, setLocalGenres] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [isSocialsOpen, setIsSocialsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialGenre) {
      setLocalGenres(initialGenre.split(",").map(g => g.trim()).filter(Boolean));
    } else {
      setLocalGenres([]);
    }

    if (initialSocialLinks) {
      try {
        setSocialLinks(JSON.parse(initialSocialLinks));
      } catch (e) {
        setSocialLinks({});
      }
    } else {
      setSocialLinks({});
    }
  }, [initialGenre, initialSocialLinks, isOpen]);

  const toggleGenre = (genre: string) => {
    setLocalGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const updateSocialLink = (platform: keyof SocialLinks, value: string) => {
    setSocialLinks(prev => ({ ...prev, [platform]: value }));
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    const genreString = localGenres.join(",");
    const socialLinksString = JSON.stringify(socialLinks);
    const { updateUserProfile } = await import("@/app/actions/user");
    const result = await updateUserProfile(genreString, socialLinksString);
    setIsSaving(false);
    if (result.success) {
      onClose();
      window.dispatchEvent(new CustomEvent("tokens-updated"));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlay} onClick={onClose}>
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >

            <div className={styles.content}>
              <div className={styles.formGroup}>
                <h3 className={styles.sectionTitle}>הסגנון המועדף עלי</h3>
                <div className={styles.genreGrid}>
                  {GENRES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`${styles.genreChip} ${localGenres.includes(g) ? styles.selectedChip : ""}`}
                      onClick={() => toggleGenre(g)}
                      disabled={isSaving}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <div 
                  className={styles.collapsibleHeader} 
                  onClick={() => setIsSocialsOpen(!isSocialsOpen)}
                >
                  <h3 className={styles.sectionTitleNoMargin}>המוזיקה שלי</h3>
                  {isSocialsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>

                <AnimatePresence>
                  {isSocialsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className={styles.socialInputs}>
                        <div className={styles.socialInputGroup}>
                          <label>
                            <SocialIcon platform="spotify" size={16} />
                            Spotify
                          </label>
                          <input
                            type="url"
                            placeholder="https://open.spotify.com/artist/..."
                            value={socialLinks.spotify || ""}
                            onChange={(e) => updateSocialLink("spotify", e.target.value)}
                          />
                        </div>
                        <div className={styles.socialInputGroup}>
                          <label>
                            <SocialIcon platform="youtube" size={16} />
                            YouTube
                          </label>
                          <input
                            type="url"
                            placeholder="https://youtube.com/@..."
                            value={socialLinks.youtube || ""}
                            onChange={(e) => updateSocialLink("youtube", e.target.value)}
                          />
                        </div>
                        <div className={styles.socialInputGroup}>
                          <label>
                            <SocialIcon platform="applemusic" size={16} />
                            Apple Music
                          </label>
                          <input
                            type="url"
                            placeholder="https://music.apple.com/artist/..."
                            value={socialLinks.appleMusic || ""}
                            onChange={(e) => updateSocialLink("appleMusic", e.target.value)}
                          />
                        </div>
                        <div className={styles.socialInputGroup}>
                          <label>
                            <SocialIcon platform="facebook" size={16} />
                            Facebook
                          </label>
                          <input
                            type="url"
                            placeholder="https://facebook.com/..."
                            value={socialLinks.facebook || ""}
                            onChange={(e) => updateSocialLink("facebook", e.target.value)}
                          />
                        </div>
                        <div className={styles.socialInputGroup}>
                          <label>
                            <SocialIcon platform="instagram" size={16} />
                            Instagram
                          </label>
                          <input
                            type="url"
                            placeholder="https://instagram.com/..."
                            value={socialLinks.instagram || ""}
                            onChange={(e) => updateSocialLink("instagram", e.target.value)}
                          />
                        </div>
                        <div className={styles.socialInputGroup}>
                          <label>
                            <SocialIcon platform="tiktok" size={16} />
                            TikTok
                          </label>
                          <input
                            type="url"
                            placeholder="https://tiktok.com/@..."
                            value={socialLinks.tiktok || ""}
                            onChange={(e) => updateSocialLink("tiktok", e.target.value)}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className={styles.footer}>
                <button
                  className={styles.cancelButton}
                  onClick={onClose}
                  disabled={isSaving}
                >
                  ביטול
                </button>
                <button
                  className={styles.confirmButton}
                  onClick={handleConfirm}
                  disabled={isSaving || localGenres.length === 0}
                >
                  {isSaving ? <Loader2 size={20} className={styles.spinner} /> : "אישור"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
