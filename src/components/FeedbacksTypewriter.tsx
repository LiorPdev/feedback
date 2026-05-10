"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./FeedbacksTypewriter.module.css";
import { getRandomFeedbacks } from "@/app/actions/feedback";
import { logAction } from "@/app/actions/logs";

interface FeedbacksTypewriterProps {
  texts?: string[];
  speed?: number;
  className?: string;
}

export default function FeedbacksTypewriter({
  texts: initialTexts = [],
  className
}: FeedbacksTypewriterProps) {
  const [allTexts, setAllTexts] = useState<string[]>(initialTexts);
  const [isFetching, setIsFetching] = useState(false);

  const fetchFeedbacks = useCallback(async () => {
    if (isFetching) return;
    setIsFetching(true);
    try {
      const newTexts = await getRandomFeedbacks();
      setAllTexts(prev => {
        const uniqueNew = newTexts.filter(t => !prev.includes(t));
        return [...prev, ...uniqueNew].slice(-100);
      });
    } catch (error) {
      logAction({ message: "Failed to fetch feedbacks", data: error, source: "FeedbacksTypewriter" });
    } finally {
      setIsFetching(false);
    }
  }, [isFetching]);

  useEffect(() => {
    if (allTexts.length === 0) {
      fetchFeedbacks();
    }
  }, [allTexts.length, fetchFeedbacks]);

  if (allTexts.length === 0 && !isFetching) return null;

  const handleIteration = async () => {
    await fetchFeedbacks();
  };

  const separator = "  ■  ";
  const combinedText = allTexts.join(separator) + separator;
  const scrollingText = combinedText + combinedText; // 2 copies for seamless loop

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <div className={styles.title}>
        פידבק חי מהקהילה
      </div>
      <div className={styles.tickerContainer}>
        <div className={styles.tickerWrapper}>
          <div
            className={styles.tickerText}
            onAnimationIteration={handleIteration}
            style={{
              animationDuration: `${(combinedText.length) * 0.25}s`
            }}
          >
            {scrollingText}
          </div>
        </div>
      </div>
    </div>
  );
}
