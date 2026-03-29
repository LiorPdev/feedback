"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import { ReactNode } from "react";
import styles from "./AuthOverlay.module.css";

interface AuthOverlayProps {
  message: ReactNode;
  redirectUrl?: string;
  onClose?: () => void;
  onDismiss?: () => void;
  dismissLabel?: string;
  isModal?: boolean;
}

export default function AuthOverlay({ 
  message, 
  redirectUrl, 
  onClose,
  onDismiss,
  dismissLabel,
  isModal = false 
}: AuthOverlayProps) {
  return (
    <div 
      className={`${styles.authOverlay} ${isModal ? styles.authOverlayModal : ""}`} 
      onClick={isModal ? onClose : undefined}
    >
      <motion.div
        className={styles.authContent}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <button 
            className={styles.closeBtn} 
            onClick={onClose} 
            aria-label="סגור"
          >
            <X size={20} />
          </button>
        )}
        <p className={styles.subHeading}>{message}</p>
        <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
          <button className={styles.submitBtn}>
            <span>התחברות</span>
          </button>
        </SignInButton>

        {onDismiss && (
          <button className={styles.dismissBtn} onClick={onDismiss}>
            {dismissLabel}
          </button>
        )}
      </motion.div>
    </div>
  );
}
