"use client";

import { ReactNode, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./PopupMsg.module.css";

interface PopupMsgProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  icon?: ReactNode;
  buttonText: string;
  secondaryButtonText?: string;
  secondaryButtonIcon?: ReactNode;
  onSecondaryClick?: () => void;
}

export default function PopupMsg({
  isOpen,
  onClose,
  title,
  message,
  icon,
  buttonText,
  secondaryButtonText,
  secondaryButtonIcon,
  onSecondaryClick,
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
            {icon && <div className={styles.iconWrapper}>{icon}</div>}
            <h2 className={styles.title}>{title}</h2>
            <div className={styles.message}>{message}</div>
            <div className={styles.buttonsWrapper}>
              <button className={styles.submitBtn} onClick={onClose}>
                {buttonText}
              </button>
              {secondaryButtonText && onSecondaryClick && (
                <button className={styles.secondaryBtn} onClick={onSecondaryClick}>
                  {secondaryButtonIcon && <span className={styles.btnIcon}>{secondaryButtonIcon}</span>}
                  {secondaryButtonText}
                </button>
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
