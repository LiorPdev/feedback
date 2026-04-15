"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
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
  className?: string;
  arrowPosition?: "left" | "center" | "right";
  align?: "left" | "center" | "right";
  triggerRef?: React.RefObject<HTMLElement | null>;
  width?: number | string;
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
  width,
}: InfoTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [positionMode, setPositionMode] = useState<PositionMode | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Use useLayoutEffect for positioning to avoid flash of wrong position.
  // We measure the trigger relative to the viewport to decide on the best mode.
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef?.current) {
      if (!isOpen) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPositionMode(null);
      }
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipPlaceholderHeight = 400; 
    const mobileThreshold = 450;

    let newMode: PositionMode = "top";

    if (viewportWidth <= mobileThreshold) {
      newMode = "centered";
    } else {
      const spaceAbove = triggerRect.top;
      const spaceBelow = viewportHeight - triggerRect.bottom;

      if (spaceAbove < 120) {
        newMode = spaceBelow >= 200 ? "bottom" : "centered";
      } else if (spaceAbove < tooltipPlaceholderHeight) {
        if (spaceBelow >= tooltipPlaceholderHeight) {
          newMode = "bottom";
        } else {
          newMode = "centered";
        }
      }
    }

    if (newMode !== positionMode) {
      setPositionMode(newMode);
    }
  }, [isOpen, triggerRef, positionMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current?.contains(event.target as Node)) {
        return;
      }
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

  const positioningClass = positionMode ? styles[`pos-${positionMode}`] : "";

  const tooltipElement = (
    <AnimatePresence>
      {isOpen && positionMode && (
        <motion.div
          key={positionMode}
          ref={tooltipRef}
          initial={
            positionMode === "centered"
              ? { opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }
              : { opacity: 0, scale: 0.9, y: positionMode === "bottom" ? -10 : 10 }
          }
          animate={
            positionMode === "centered"
              ? { opacity: 1, scale: 1, x: "-50%", y: "-50%" }
              : { opacity: 1, scale: 1, y: 0 }
          }
          exit={{ opacity: 0, scale: 0.95 }}
          className={`${styles.popup} ${styles[`align-${align}`]} ${positioningClass} ${className}`}
          style={width ? { width: typeof width === "number" ? `${width}px` : width } : {}}
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

          {positionMode !== "centered" && (
            <div className={`${styles.popupArrow} ${styles[`arrow-${arrowPosition}`]}`} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!isOpen) return null;

  // Use Portal for centered mode to avoid clipping by parent overflow/filters
  if (positionMode === "centered" && mounted) {
    return createPortal(tooltipElement, document.body);
  }

  return tooltipElement;
}
