"use client";

import { useState, useRef } from "react";
import InfoTooltip from "@/components/InfoTooltip";
import RaterScoreInfo from "@/components/RaterScoreInfo";
import styles from "./FeedInfoFooter.module.css";

export default function FeedInfoFooter({ hasSongs, raterScore }: { hasSongs?: boolean; raterScore?: number }) {
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
          כיצד נקבע סדר הופעת השירים?
        </button>

        <InfoTooltip
          isOpen={showInfo}
          onClose={() => setShowInfo(false)}
          title="כיצד נקבע סדר השירים?"
          arrowPosition="center"
          align="center"
          triggerRef={triggerRef}
          content={
            <div className={styles.tooltipContent}>
              <p>סדר הופעת השירים נקבע לפי:</p>
              <p>
                1. <strong>סגנון מועדף:</strong> שירים מהסגנונות שסימנתם{" "}
                <button
                  className={styles.textLink}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowInfo(false);
                    window.dispatchEvent(new CustomEvent("open-preferences-modal"));
                  }}
                >
                  בכרטיס הביקור המוזיקלי
                </button>{" "}
                שלכם יופיעו תמיד ראשונים.
              </p>
              <p>
                2. <strong>סדר אקראי:</strong> השירים מופיעים בתוך כל קבוצת סגנון בסדר אקראי.
              </p>

              {hasSongs && (
                <div className={styles.prioritySection}>
                  <p>
                    <strong>אבל...</strong> אמן עם דירוג אישי גבוה, אשר נתן לאחרים פידבק איכותי, יקבל עדיפות.
                  </p>
                  {raterScore !== undefined && (
                    <div className={styles.myScoreWrapper}>
                      <RaterScoreInfo
                        score={raterScore}
                        label="הדירוג האישי שלכם"
                        variant="plain"
                        className={styles.raterScoreInfo}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* <p>
                <strong>קידום שירים:</strong> באפשרותכם לקדם את השירים שלכם באיזור האישי תמורת נקודות קרדיט.
              </p> */}
            </div>
          }
        />
      </div>
    </div>
  );
}
