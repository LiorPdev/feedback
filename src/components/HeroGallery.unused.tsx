"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import styles from "./HeroGallery.module.css";

const IMAGES = ["/mockup1.webp", "/mockup2.webp", "/mockup3.webp"];

export default function HeroGallery() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className={styles.galleryContainer}>
      <AnimatePresence>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            const threshold = 50;
            if (info.offset.x < -threshold) {
              // Swiped Left -> Previous
              setCurrentIndex((prev) => (prev - 1 + IMAGES.length) % IMAGES.length);
            } else if (info.offset.x > threshold) {
              // Swiped Right -> Next
              setCurrentIndex((prev) => (prev + 1) % IMAGES.length);
            }
          }}
          whileTap={{ cursor: "grabbing" }}
          className={styles.mockupImageWrapper}
          style={{ cursor: "grab" }}
        >
          <Image
            src={IMAGES[currentIndex]}
            alt={`Feedback Space Mockup ${currentIndex + 1}`}
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        </motion.div>
      </AnimatePresence>

      <div className={styles.galleryDots}>
        {IMAGES.map((_, idx) => (
          <button
            key={idx}
            className={`${styles.dot} ${currentIndex === idx ? styles.dotActive : ""}`}
            onClick={() => handleDotClick(idx)}
            aria-label={`Go to image ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
