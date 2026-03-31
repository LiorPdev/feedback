"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import styles from "./InfoTooltip.module.css";

type PositionMode = "top" | "bottom" | "centered";

interface InfoTooltipProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
  footer?: React.ReactNode;
  className?: string; // Additional classes for positioning or other custom styles
  arrowPosition?: "left" | "center" | "right";
  align?: "left" | "center" | "right";
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export default function InfoTooltip({
  isOpen,
  onClose,
  title,
  content,
  footer,
  className = "",
  arrowPosition = "right",
  align = "left",
  triggerRef,
}: InfoTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [positionMode, setPositionMode] = useState<PositionMode>("top");

  // Use useEffect to avoid synchronous state updates during layout,
  // which can trigger "cascading renders" lint errors/warnings.
  useEffect(() => {
    if (!isOpen || !triggerRef?.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const tooltipPlaceholderHeight = 450;

    let newMode: PositionMode = "top";

    // 1. Check space above
    const spaceAbove = triggerRect.top;
    if (spaceAbove < tooltipPlaceholderHeight) {
      // 2. Check space below
      const spaceBelow = viewportHeight - triggerRect.bottom;
      if (spaceBelow >= tooltipPlaceholderHeight) {
        newMode = "bottom";
      } else {
        // 3. Fallback to centered modal
        newMode = "centered";
      }
    }

    if (newMode !== positionMode) {
      requestAnimationFrame(() => {
        setPositionMode(newMode);
      });
    }
  }, [isOpen, triggerRef, positionMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking inside tooltip
      if (tooltipRef.current?.contains(event.target as Node)) {
        return;
      }
      
      // Don't close if clicking the trigger (let the trigger handle its own toggle)
      if (triggerRef?.current?.contains(event.target as Node)) {
        return;
      }

      onClose();
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  const positioningClass = styles[`pos-${positionMode}`] || "";

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key={positionMode}
          ref={tooltipRef}
          initial={positionMode === "centered" ? { opacity: 0, scale: 0.95 } : { opacity: 0, scale: 0.9, y: positionMode === "bottom" ? -10 : 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`${styles.popup} ${styles[`align-${align}`]} ${positioningClass} ${className}`}
        >
          <div className={styles.popupHeader}>
            <div className={styles.headerTitleGroup}>
              <HelpCircle size={18} className={styles.helpIcon} />
              <h3>{title}</h3>
            </div>
            <button
              className={styles.closePopupButton}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="סגור"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className={styles.content}>
            {content}
          </div>

          {footer && (
            <div className={styles.footer}>
              {footer}
            </div>
          )}

          <div className={`${styles.popupArrow} ${styles[`arrow-${arrowPosition}`]}`} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
