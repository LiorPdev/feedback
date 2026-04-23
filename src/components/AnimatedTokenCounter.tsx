"use client";

import { motion, AnimatePresence } from "framer-motion";

interface AnimatedTokenCounterProps {
  value: number;
}

export default function AnimatedTokenCounter({ value }: AnimatedTokenCounterProps) {
  return (
    <span style={{ 
      display: "inline-flex", 
      position: "relative", 
      overflow: "hidden", 
      height: "1.2em", 
      alignItems: "center" 
    }}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -15, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 30,
            opacity: { duration: 0.15 } 
          }}
          style={{ display: "inline-block" }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
