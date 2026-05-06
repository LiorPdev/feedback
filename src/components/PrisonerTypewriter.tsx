"use client";

import { useState } from "react";
import styles from "./PrisonerTypewriter.module.css";
import { getRandomFeedbacks } from "@/app/actions/feedback";

interface PrisonerTypewriterProps {
  texts: string[];
  speed?: number;
}

export default function PrisonerTypewriter({ texts: initialTexts }: PrisonerTypewriterProps) {
  const [allTexts, setAllTexts] = useState<string[]>(initialTexts);
  const [isFetching, setIsFetching] = useState(false);

  if (allTexts.length === 0) return null;

  const handleIteration = async () => {
    if (isFetching) return;

    setIsFetching(true);
    try {
      const newTexts = await getRandomFeedbacks();
      // Filter out duplicates if any and append
      setAllTexts(prev => {
        const uniqueNew = newTexts.filter(t => !prev.includes(t));
        return [...prev, ...uniqueNew].slice(-100); // Keep last 100 to avoid memory issues
      });
    } catch (error) {
      console.error("Failed to fetch more feedbacks:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const separator = "  ■  ";
  const combinedText = allTexts.join(separator) + separator;
  const scrollingText = combinedText + combinedText; // 2 copies for seamless loop

  return (
    <div className={styles.tickerContainer}>
      <div className={styles.tickerWrapper}>
        <div
          className={styles.tickerText}
          onAnimationIteration={handleIteration}
          style={{
            animationDuration: `${(combinedText.length) * 0.22}s`
          }}
        >
          {scrollingText}
        </div>
      </div>
    </div>
  );
}
