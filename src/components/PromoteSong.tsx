"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Megaphone, AlertCircle } from "lucide-react";
import { promoteSong, getUserTokens } from "@/app/actions/songs";
import { PROMOTION_COST } from "@/lib/constants";
import styles from "./PromoteSong.module.css";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./ui/Button";
import PageHeader from "./PageHeader";
import PopupMsg from "./PopupMsg";

interface PromoteSongProps {
  song: {
    id: string;
    title: string;
    priority: number;
    promotedUntil?: string | null;
  };
  disabled?: boolean;
}

export default function PromoteSong({ song, disabled }: PromoteSongProps) {
  const [showModal, setShowModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userTokens, setUserTokens] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (showModal) {
      const fetchTokens = async () => {
        const result = await getUserTokens();
        if (result.success) {
          setUserTokens(result.tokens);
        }
      };
      fetchTokens();
    }
  }, [showModal]);

  const handlePromote = async () => {
    setIsUpdating(true);
    setErrorMsg("");
    try {
      const result = await promoteSong(song.id);
      if (result.success) {
        setShowModal(false);
        // Dispatch custom event to notify Navbar or other components to refresh tokens
        window.dispatchEvent(new CustomEvent("tokens-updated"));
      } else {
        setErrorMsg(result.error || "שגיאה בקידום השיר");
        setStatus("error");
      }
    } catch {
      setErrorMsg("שגיאה בתקשורת עם השרת");
      setStatus("error");
    } finally {
      setIsUpdating(false);
    }
  };

  const now = new Date();
  const isCurrentlyPromoted = song.priority === 1 && song.promotedUntil && new Date(song.promotedUntil) > now;
  const expiryDate = song.promotedUntil ? new Date(song.promotedUntil).toLocaleDateString('he-IL') : "";

  const modalContent = (
    <AnimatePresence>
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <PageHeader
              title="קידום השיר"
              showClose={true}
              onClose={() => setShowModal(false)}
              showBack={false}
              align="center"
            />

            <div className={styles.content}>
              <p className={styles.description}>
                ככל שיש יותר שירים לכל שיר קשה יותר להתבלט ולהגיע למאזינים. במידה ואתם משתמשים שצברתם מספיק נקודות קרדיט, אתם יכולים להשתמש בהם כדי לקדם את השיר שלכם.
                <br /><br />
                קידום השיר לשבוע ישתמש ב {PROMOTION_COST} נק׳ קרדיט {userTokens !== null && `(יש לך ${userTokens} נק׳)`} ויקפיץ את השיר קדימה למאזינים.
              </p>

              {isCurrentlyPromoted ? (
                <div className={styles.activePromotion}>
                  השיר כבר מקודם עד תאריך {expiryDate}
                </div>
              ) : (
                <>

                  <div className={styles.actions}>
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={() => setShowModal(false)}
                      disabled={isUpdating}
                      fullWidth
                    >
                      ביטול
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handlePromote}
                      isLoading={isUpdating}
                      disabled={userTokens !== null && userTokens < PROMOTION_COST}
                      fullWidth
                    >
                      {userTokens !== null && userTokens < PROMOTION_COST ? "אין מספיק נק' קרדיט" : "אישור"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="md"
        onClick={() => setShowModal(true)}
        title="קידום השיר"
        style={{ padding: '8px', minWidth: 'auto' }}
        disabled={disabled}
      >
        <Megaphone size={16} color={isCurrentlyPromoted ? "#EAB308" : "currentColor"} />
      </Button>

      {status === "error" && (
        <PopupMsg
          isOpen={true}
          onClose={() => setStatus("idle")}
          message={errorMsg}
          icon={<AlertCircle size={34} color="#DC2626" />}
          buttonText="הבנתי"
          variant="error"
        />
      )}

      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}
