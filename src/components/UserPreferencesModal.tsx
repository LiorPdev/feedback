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
  website?: string;
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
                          <label htmlFor="pref-spotify">
                            <SocialIcon platform="spotify" size={16} />
                            <span>Spotify</span>
                          </label>
                          <input
                            id="pref-spotify"
                            name="spotify"
                            type="url"
                            inputMode="url"
                            autoComplete="url"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            aria-label="Spotify Link"
                            placeholder="https://open.spotify.com/artist/..."
                            value={socialLinks.spotify || ""}
                            onChange={(e) => updateSocialLink("spotify", e.target.value)}
                          />
                        </div>
                        <div className={styles.socialInputGroup}>
                          <label htmlFor="pref-youtube">
                            <SocialIcon platform="youtube" size={16} />
                            <span>YouTube</span>
                          </label>
                          <input
                            id="pref-youtube"
                            name="youtube"
                            type="url"
                            inputMode="url"
                            autoComplete="url"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            aria-label="YouTube Link"
                            placeholder="https://youtube.com/@..."
                            value={socialLinks.youtube || ""}
                            onChange={(e) => updateSocialLink("youtube", e.target.value)}
                          />
                        </div>
                        <div className={styles.socialInputGroup}>
                          <label htmlFor="pref-applemusic">
                            <SocialIcon platform="applemusic" size={16} />
                            <span>Apple Music</span>
                          </label>
                          <input
                            id="pref-applemusic"
                            name="applemusic"
                            type="url"
                            inputMode="url"
                            autoComplete="url"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            aria-label="Apple Music Link"
                            placeholder="https://music.apple.com/artist/..."
                            value={socialLinks.appleMusic || ""}
                            onChange={(e) => updateSocialLink("appleMusic", e.target.value)}
                          />
                        </div>
                        <div className={styles.socialInputGroup}>
                          <label htmlFor="pref-facebook">
                            <SocialIcon platform="facebook" size={16} />
                            <span>Facebook</span>
                          </label>
                          <input
                            id="pref-facebook"
                            name="facebook"
                            type="url"
                            inputMode="url"
                            autoComplete="url"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            aria-label="Facebook Link"
                            placeholder="https://facebook.com/..."
                            value={socialLinks.facebook || ""}
                            onChange={(e) => updateSocialLink("facebook", e.target.value)}
                          />
                        </div>
                        <div className={styles.socialInputGroup}>
                          <label htmlFor="pref-instagram">
                            <SocialIcon platform="instagram" size={16} />
                            <span>Instagram</span>
                          </label>
                          <input
                            id="pref-instagram"
                            name="instagram"
                            type="url"
                            inputMode="url"
                            autoComplete="url"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            aria-label="Instagram Link"
                            placeholder="https://instagram.com/..."
                            value={socialLinks.instagram || ""}
                            onChange={(e) => updateSocialLink("instagram", e.target.value)}
                          />
                        </div>
                        <div className={styles.socialInputGroup}>
                          <label htmlFor="pref-website">
                            <SocialIcon platform="website" size={16} />
                            <span>Website</span>
                          </label>
                          <input
                            id="pref-website"
                            name="website"
                            type="url"
                            inputMode="url"
                            autoComplete="url"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            aria-label="Artist Website"
                            placeholder="https://www.yourwebsite.com"
                            value={socialLinks.website || ""}
                            onChange={(e) => updateSocialLink("website", e.target.value)}
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
