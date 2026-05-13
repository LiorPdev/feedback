"use client";

import { useState } from "react";
import Button from "./ui/Button";
import { X } from "lucide-react";
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
                  <h2 className={styles.title}>במה חופשית - דברו אלינו</h2>
                  <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.textareaWrapper}>
                      <textarea
                        className={styles.textarea}
                        value={message}
                        onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                        maxLength={200}
                        disabled={isSubmitting}
                        placeholder="נשמח לשמוע כל הצעה או בקשה..."
                        required
                      />
                      <div className={`${styles.counter} ${message.length >= 190 ? styles.counterLow : message.length > 0 ? styles.counterValid : ""}`}>
                        {message.length}/200
                      </div>
                    </div>

                    {status === "error" && (
                      <p className={styles.error}>{errorMessage}</p>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={isSubmitting}
                      disabled={!message.trim()}
                      fullWidth
                    >
                      שליחה
                    </Button>
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
