"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { submitContactMessage } from "@/app/actions/contact";
import styles from "./ContactModal.module.css";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setStatus("idle");

    try {
      const result = await submitContactMessage(message);
      if (result.success) {
        setStatus("success");
        setMessage("");
        setTimeout(() => {
          onClose();
          setStatus("idle");
        }, 2000);
      } else {
        setStatus("error");
        setErrorMessage(result.error || "משהו השתבש. נסו שוב מאוחר יותר.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("שגיאת תקשורת. נסו שוב מאוחר יותר.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlay} onClick={onClose}>
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeButton} onClick={onClose} aria-label="סגור">
              <X size={24} />
            </button>

            <div className={styles.content}>
              {status === "success" ? (
                <div className={styles.successMessage}>
                  <div className={styles.successIcon}>✓</div>
                  <p>ההודעה נשלחה בהצלחה! תודה על המשוב.</p>
                </div>
              ) : (
                <>
                  <h2 className={styles.title}>מה תרצו לספר לנו?</h2>
                  <p className={styles.subtitle}>לכל הצעה, בקשה או בעיה, דברו איתנו!</p>
                  <form onSubmit={handleSubmit} className={styles.form}>
                      <div className={styles.textareaWrapper}>
                        <textarea
                          className={styles.textarea}
                          value={message}
                          onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                          maxLength={200}
                          disabled={isSubmitting}
                          placeholder="מה תרצו לספר לנו? נשמח לשמוע כל הצעה או בקשה..."
                          required
                        />
                        <div className={`${styles.counter} ${message.length >= 190 ? styles.counterLow : message.length > 0 ? styles.counterValid : ""}`}>
                          {message.length}/200
                        </div>
                      </div>

                    {status === "error" && (
                      <p className={styles.error}>{errorMessage}</p>
                    )}

                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={isSubmitting || !message.trim()}
                    >
                      {isSubmitting ? (
                        <Loader2 className={styles.spinner} size={20} />
                      ) : (
                        "שליחה"
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
