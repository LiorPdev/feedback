"use client";

import { useState, useRef } from "react";
import InfoTooltip from "@/components/InfoTooltip";
import styles from "./top-rated.module.css";

export default function TopRatedFooter() {
  const [showInfo, setShowInfo] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={styles.footerWrapper}>

      <div className={styles.infoTriggerWrapper}>
        <button
          className={styles.infoTrigger}
          onClick={() => setShowInfo(!showInfo)}
          ref={triggerRef}
        >
          שקיפות לחישוב מנגנון הדירוג
        </button>

        <InfoTooltip
          isOpen={showInfo}
          onClose={() => setShowInfo(false)}
          title="איך מחשבים את הדירוג?"
          arrowPosition="center"
          align="center"
          triggerRef={triggerRef}
          className={styles.ratingTooltip}
          content={
            <div className={styles.tooltipContent}>
              <p>הדירוג נקבע לפי נוסחת ממוצע משוקלל (Bayesian Average):</p>
              <div className={styles.formula}>
                (v × R + m × C) / (v + m)
              </div>
              <ul className={styles.formulaLegend}>
                <li><strong>v</strong>: סכום משקלי הדירוגים (מושפע מאיכות המדרג)</li>
                <li><strong>R</strong>: הציון הממוצע של השיר</li>
                <li><strong>m</strong>: רף המינימום (3 דירוגים)</li>
                <li><strong>C</strong>: הציון הממוצע של כלל השירים באתר</li>
              </ul>
              <p>כך אנחנו מבטיחים ששיר עם הרבה דירוגים ומדרגים איכותיים ידורג גבוה יותר.</p>
            </div>
          }
        />
      </div>
    </div>
  );
}
