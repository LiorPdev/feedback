"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Typewriter.module.css";

interface TypewriterProps {
  text: string;
  speed?: number;
  isPlaying?: boolean;
}

/**
 * Typewriter component: Animates text reveal character-by-character.
 * Logic: Starts typing with a 2-second delay only after 'isPlaying' becomes true.
 * Resets whenever the song or play state changes.
 */
export default function Typewriter({ text, speed = 100, isPlaying = false }: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [hasActivated, setHasActivated] = useState(false);
  const isResumingRef = useRef(false);

  const prefix = "מילה מהאמן: ";
  const fullText = text ? `${prefix}${text}` : "";

  useEffect(() => {
    if (!fullText || !isPlaying) return;

    // Use a timeout to avoid setting state synchronously within an effect
    const activationTimeout = setTimeout(() => {
      setHasActivated(true);
    }, 0);

    let typingInterval: NodeJS.Timeout;

    const startTyping = () => {
      isResumingRef.current = true;
      typingInterval = setInterval(() => {
        setDisplayedText((prev) => {
          if (prev.length >= fullText.length) {
            clearInterval(typingInterval);
            return prev;
          }
          return fullText.slice(0, prev.length + 1);
        });
      }, speed);
    };

    let delayTimer: NodeJS.Timeout;

    if (!isResumingRef.current) {
      // First time typing this song: 2-second delay
      delayTimer = setTimeout(startTyping, 2000);
    } else {
      // Resuming mid-typing: start immediately
      startTyping();
    }

    return () => {
      clearTimeout(activationTimeout);
      if (delayTimer) clearTimeout(delayTimer);
      if (typingInterval) clearInterval(typingInterval);
    };
  }, [fullText, speed, isPlaying]);

  const boldPart = displayedText.slice(0, prefix.length);
  const normalPart = displayedText.slice(prefix.length);

  return (
    <AnimatePresence>
      {(text && hasActivated) && (
        <motion.div
          className={styles.typewriterContainer}
          initial={{ height: 0, opacity: 0, marginBottom: 0 }}
          animate={{ height: "auto", opacity: 1, marginBottom: "0.8rem" }}
          exit={{ height: 0, opacity: 0, marginBottom: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <p className={styles.typewriterText}>
            {boldPart && <strong>{boldPart}</strong>}
            {normalPart}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
