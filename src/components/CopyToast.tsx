"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface CopyToastProps {
  isVisible: boolean;
  text?: string;
}

export default function CopyToast({ isVisible, text = "הקישור הועתק ואתם יכולים לשלוח לחברים" }: CopyToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: "-40%", x: "-50%", scale: 0.9 }}
          animate={{ opacity: 1, y: "-50%", x: "-50%", scale: 1 }}
          exit={{ opacity: 0, y: "-40%", x: "-50%", scale: 0.9 }}
          style={{
            position: 'fixed',
            top: '10%',
            left: '50%',
            background: '#002D4D',
            color: 'white',
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: 700,
            textAlign: 'center',
            zIndex: 999999, // Super high to ensure it sits over any portal
            pointerEvents: 'none',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}
        >
          {text}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
