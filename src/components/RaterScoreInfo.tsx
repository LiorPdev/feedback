"use client";

import { useState, useRef } from "react";
import { HelpCircle } from "lucide-react";
import InfoTooltip from "./InfoTooltip";
import styles from "./RaterScoreInfo.module.css";

interface RaterScoreInfoProps {
  score: number | null | undefined;
  label?: string;
  className?: string;
}

export default function RaterScoreInfo({
  score,
  label = "איכות המדרג",
  className = ""
}: RaterScoreInfoProps) {
  const [showInfo, setShowInfo] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Format score: show "אין דירוג" if 0 or undefined, otherwise show X.X/5
  const displayScore = (score && score > 0) ? score.toFixed(1) : "אין דירוג";

  return (
    <span className={`${styles.fbRaterScore} ${className}`}>
      <strong className={styles.fbLabel}>{label}:</strong> {displayScore}
      <button
        ref={triggerRef}
        className={styles.infoTriggerIcon}
        onClick={(e) => {
          e.preventDefault();
          setShowInfo(!showInfo);
        }}
        title="איך זה מחושב?"
      >
        <HelpCircle size={14} />
      </button>

      <InfoTooltip
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        triggerRef={triggerRef}
        title="איך זה מחושב?"
        align="right"
        arrowPosition="center"
        width={280}
        content={
          <div className={styles.tooltipContent}>
            <ul className={styles.formulaLegend}>
              <li><strong>לפי איכות:</strong> רמת הפירוט של ההסברים.</li>
              <li><strong>לפי כמות:</strong> מספר הפידבקים שניתנו.</li>
              <li><strong>לפי אמינות:</strong> מידת התאמת הדירוג לממוצע <br />הקהילה
                (למניעת הטיות).</li>
            </ul>
            <p style={{ marginTop: '1rem' }}>
              <strong>בונוס:</strong> מדרגים איכותיים זוכים לתעדוף <br />
              באלגוריתם ההשמעה!
            </p>
            <p style={{ marginTop: '1rem' }}>
              הציון המקסימלי הוא 5.
            </p>
          </div>
        }
      />
    </span>
  );
}
