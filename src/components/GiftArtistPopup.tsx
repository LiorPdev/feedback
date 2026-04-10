"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, X, Loader2, Coins } from "lucide-react";
import styles from "./GiftArtistPopup.module.css";
import { sendArtistGift } from "@/app/actions/gift";
import { logAction } from "@/app/actions/logs";

interface GiftArtistPopupProps {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  songTitle: string;
  maxTokens: number;
  onSuccess?: () => void;
}

export default function GiftArtistPopup({
  isOpen,
  onClose,
  songId,
  maxTokens,
  onSuccess
}: GiftArtistPopupProps) {
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [amount, setAmount] = useState(Math.min(50, maxTokens));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      setAmount(Math.min(50, maxTokens));
      setMessage("");
      setSenderName("");
      setError("");
    }
  }, [isOpen, maxTokens]);

  if (!mounted) return null;

  const handleSend = async () => {
    if (amount < 0 || amount > maxTokens) {
      setError(`ניתן לשלוח עד ${maxTokens} קרדיטים`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      // We still run the action to try and transfer the gift
      const result = await sendArtistGift(songId, amount, message, senderName);

      if (!result.success) {
        // Log the failure to DB but fail silently to user
        logAction({ message: "Gift sending failed (Action returned success:false)", data: { result, songId, amount }, source: "GiftArtistPopup.tsx:handleSend" });
      }

      // Regardless of success, we close and indicate success to the user (fail silently)
      onSuccess?.();
      onClose();
      // Trigger navbar update
      window.dispatchEvent(new CustomEvent("tokens-updated"));
    } catch (err) {
      // Log the exception to DB
      logAction({ message: "Gift sending threw an exception", data: err, source: "GiftArtistPopup.tsx:handleSend" });
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.content}
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeBtn}
              onClick={() => {
                onSuccess?.();
                onClose();
              }}
            >
              <X size={20} />
            </button>

            <div className={styles.body}>
              <div className={styles.amountSection}>
                <div className={styles.sentence}>
                  <span>מתנה קטנה ממני</span>
                  <input
                    type="number"
                    className={styles.inlineInput}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min="0"
                    max={maxTokens}
                    disabled={loading}
                  />
                  <span>נק&apos; קרדיט</span>
                  <div className={styles.coinIcon}>
                    <Coins size={22} />
                  </div>
                </div>
                <div className={styles.tokenStatus}>
                  <p className={error ? styles.errorMsg : styles.tokenHint}>
                    {error || `יתרה זמינה: ${maxTokens} קרדיטים`}
                  </p>
                </div>
              </div>

              <div className={styles.field}>
                <textarea
                  className={styles.textarea}
                  placeholder="כתבו כאן משהו נחמד לאמן (אופציונאלי)..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className={styles.field}>
                <input
                  type="text"
                  className={styles.nameInput}
                  placeholder="שם או כינוי (אופציונאלי)"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.footer}>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
                disabled={loading}
              >
                ביטול
              </button>
              <button
                className={styles.submitBtn}
                onClick={handleSend}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className={styles.spin} size={20} />
                ) : (
                  <>
                    <Gift size={18} />
                    <span>שליחה</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
