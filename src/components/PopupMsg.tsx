"use client";

import { ReactNode, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Button from "./ui/Button";
import styles from "./PopupMsg.module.css";

interface PopupMsgProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  icon?: ReactNode;
  buttonText: string;
  onPrimaryClick?: () => void;
  secondaryButtonText?: string;
  secondaryButtonIcon?: ReactNode;
  onSecondaryClick?: () => void;
  variant?: "default" | "error";
}

export default function PopupMsg({
  isOpen,
  onClose,
  title,
  message,
  icon,
  buttonText,
  onPrimaryClick,
  secondaryButtonText,
  secondaryButtonIcon,
  onSecondaryClick,
  variant = "default",
}: PopupMsgProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(handle);
  }, []);

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="popup-overlay"
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`${styles.content} ${variant === "error" ? styles.contentError : ""}`}
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeBtn} onClick={onClose} aria-label="סגור">
              <X size={20} />
            </button>
            {icon && <div className={styles.iconWrapper}>{icon}</div>}
            <h2 className={styles.title}>{title}</h2>
            <div className={styles.message}>{message}</div>
            <div className={styles.buttonsWrapper}>
              {buttonText && (
                <Button 
                  className={styles.submitBtn} 
                  onClick={() => {
                    if (onPrimaryClick) onPrimaryClick();
                    onClose();
                  }}
                  fullWidth
                >
                  {buttonText}
                </Button>
              )}
              {secondaryButtonText && onSecondaryClick && (
                <Button 
                  variant="outline"
                  className={styles.secondaryBtn} 
                  onClick={onSecondaryClick}
                  leftIcon={secondaryButtonIcon}
                  fullWidth
                >
                  {secondaryButtonText}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;

  return createPortal(content, document.body);
}
