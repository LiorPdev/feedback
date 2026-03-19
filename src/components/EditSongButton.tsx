"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Pencil, Loader2 } from "lucide-react";
import { updateSong } from "@/app/actions/songs";
import styles from "./EditSongButton.module.css";
import { motion, AnimatePresence } from "framer-motion";

interface EditSongButtonProps {
  song: {
    id: string;
    title: string;
    url: string;
    genre: string;
  };
}

import { GENRES } from "@/lib/constants";

export default function EditSongButton({ song }: EditSongButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [title, setTitle] = useState(song.title);
  const [url, setUrl] = useState(song.url);
  const [genre, setGenre] = useState(song.genre);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const result = await updateSong(song.id, { title, url, genre });
      if (result.success) {
        setShowModal(false);
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert("שגיאה בעדכון השיר");
    } finally {
      setIsUpdating(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {showModal && (
        <div 
          className={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <motion.div 
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>עריכת פרטי שיר</h3>
            
            <form onSubmit={handleSave} className={styles.form}>
              <div className={styles.field}>
                <label>שם השיר</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="לדוגמה: השיר החדש שלי"
                />
              </div>

              <div className={styles.field}>
                <label>קישור לשמיעה</label>
                <input 
                  type="url" 
                  className={styles.input}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="קישור ל-SoundCloud, YouTube וכו'"
                />
              </div>

              <div className={styles.field}>
                <label>סגנון מוזיקלי</label>
                <select 
                  className={styles.select}
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  required
                >
                  {GENRES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className={styles.actions}>
                <button 
                  type="button"
                  className={styles.cancelBtn} 
                  onClick={() => setShowModal(false)}
                  disabled={isUpdating}
                >
                  ביטול
                </button>
                <button 
                  type="submit"
                  className={styles.saveBtn} 
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 size={18} className={styles.spin} /> שומר...
                    </>
                  ) : (
                    "שמור שינויים"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button 
        className={styles.editBtn} 
        onClick={() => setShowModal(true)}
        title="עריכת שיר"
      >
        <Pencil size={18} />
      </button>

      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}
