"use client";

import { motion, AnimatePresence } from "framer-motion";
import styles from "./Tooltip.module.css";

interface TooltipProps {
  show: boolean;
  message: React.ReactNode;
  align?: "center" | "left" | "right";
}

export default function Tooltip({ show, message, align = "center" }: TooltipProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`${styles.tooltip} ${styles[align]}`}
          initial={{ opacity: 0, y: 5, x: align === "center" ? "-50%" : "0" }}
          animate={{ opacity: 1, y: 0, x: align === "center" ? "-50%" : "0" }}
          exit={{ opacity: 0, y: 5, x: align === "center" ? "-50%" : "0" }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
