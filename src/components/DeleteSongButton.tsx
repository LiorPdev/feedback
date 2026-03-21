"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2, AlertCircle, Loader2 } from "lucide-react";
import { deleteSong } from "@/app/actions/songs";
import styles from "./DeleteSongButton.module.css";
import { motion, AnimatePresence } from "framer-motion";

interface DeleteSongButtonProps {
  songId: string;
  songTitle: string;
}

export default function DeleteSongButton({ songId, songTitle }: DeleteSongButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteSong(songId);
      if (result.success) {
        setShowConfirm(false);
      } else {
        alert(result.error);
      }
    } catch {
      alert("שגיאה במחיקת השיר");
    } finally {
      setIsDeleting(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {showConfirm && (
        <div
          className={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfirm(false);
          }}
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.iconCircle}>
              <AlertCircle size={32} color="#ef4444" />
            </div>
            <h3>מחיקת השיר</h3>
            <p>האם אתם בטוחים שברצונכם למחוק את השיר <strong>&quot;{songTitle}&quot;</strong>? פעולה זו היא סופית ותמחק גם את כל הדירוגים שהתקבלו.</p>

            <div className={styles.actions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
              >
                ביטול
              </button>
              <button
                className={styles.confirmBtn}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={18} className={styles.spin} /> מוחק...
                  </>
                ) : (
                  "מחק לצמיתות"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        className={styles.deleteBtn}
        onClick={() => setShowConfirm(true)}
        title="מחיקת השיר"
      >
        <Trash2 size={16} />
      </button>

      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}
