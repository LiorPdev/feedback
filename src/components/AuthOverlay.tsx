"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { ReactNode, useState } from "react";
import Button from "./ui/Button";
import UnifiedAuthForm from "./auth/UnifiedAuthForm";
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
  const { userId, isLoaded } = useAuth();
  const [isVerifyStep, setIsVerifyStep] = useState(false);

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
        
        {!isVerifyStep && message && <p className={styles.subHeading}>{message}</p>}
        
        {isLoaded && !userId && (
          <div className="mt-4">
            <UnifiedAuthForm 
              onSuccess={onClose} 
              redirectUrl={redirectUrl} 
              onStepChange={(step) => setIsVerifyStep(step === "VERIFY")}
            />
          </div>
        )}

        {onDismiss && dismissLabel && (
          <Button
            variant="ghost"
            fullWidth
            onClick={onDismiss}
            style={{ marginTop: '0.75rem' }}
          >
            {dismissLabel}
          </Button>
        )}
      </motion.div>
    </div>
  );
}
