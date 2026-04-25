"use client";

import { useState, useRef } from "react";
import { HelpCircle } from "lucide-react";
import InfoTooltip from "./InfoTooltip";
import RaterBadge from "./RaterBadge";
import styles from "./RaterScoreInfo.module.css";

interface RaterScoreInfoProps {
  score: number | null | undefined;
  label?: string;
  variant?: "default" | "plain";
  className?: string;
}

export default function RaterScoreInfo({
  score,
  label = "איכות המדרג",
  variant = "default",
  className = ""
}: RaterScoreInfoProps) {
  const [showInfo, setShowInfo] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <span className={`${styles.fbRaterScore} ${className}`}>
      <span>{label}:</span>
      <button
        ref={triggerRef}
        className={styles.triggerButton}
        onClick={(e) => {
          e.preventDefault();
          setShowInfo(!showInfo);
        }}
        title="איך זה מחושב?"
      >
        {score && score > 0 ? (
          <RaterBadge score={score} variant={variant} className={styles.badgeNudge} />
        ) : (
          <span className={styles.noScoreText}>אין דירוג</span>
        )}
        <div className={styles.infoTriggerIcon}>
          <HelpCircle size={14} />
        </div>
      </button>

      <InfoTooltip
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        triggerRef={triggerRef}
        title="איך זה נקבע?"
        align="right"
        arrowPosition="center"
        width={280}
        content={
          <div className={styles.tooltipContent}>
            <ul className={styles.formulaLegend}>
              <li>לפי כמות ואורך הפידבקים ששלחת</li>
            </ul>
          </div>
        }
      />
    </span>
  );
}
