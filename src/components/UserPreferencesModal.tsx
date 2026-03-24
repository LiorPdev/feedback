"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GENRES } from "@/lib/constants";
import { updateUserGenre } from "@/app/actions/user";
import styles from "./UserPreferencesModal.module.css";

interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGenre: string;
}

export default function UserPreferencesModal({
  isOpen,
  onClose,
  initialGenre,
}: UserPreferencesModalProps) {
  const [localGenres, setLocalGenres] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialGenre) {
      setLocalGenres(initialGenre.split(",").map(g => g.trim()).filter(Boolean));
    } else {
      setLocalGenres([]);
    }
  }, [initialGenre, isOpen]);

  const toggleGenre = (genre: string) => {
    setLocalGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    const genreString = localGenres.join(",");
    const result = await updateUserGenre(genreString);
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
            <button 
              className={styles.closeButton} 
              onClick={onClose} 
              aria-label="סגור"
            >
              <X size={24} />
            </button>

            <div className={styles.content}>
              <h2 className={styles.title}>הסגנון המועדף עלי</h2>

               <div className={styles.formGroup}>
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

              <div className={styles.footer}>
                <button
                  className={styles.confirmButton}
                  onClick={handleConfirm}
                  disabled={isSaving || localGenres.length === 0}
                >
                  {isSaving ? <Loader2 size={20} className={styles.spinner} /> : "אישור"}
                </button>
                <button
                  className={styles.cancelButton}
                  onClick={onClose}
                  disabled={isSaving}
                >
                  ביטול
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
