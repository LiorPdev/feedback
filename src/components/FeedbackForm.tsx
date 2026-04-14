"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Star, AlertCircle, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addFeedback, getUserTokens } from "@/app/actions/songs";
import { REWARD_PRODUCTION, REWARD_VOCALS, REWARD_OVERALL, REWARD_COMMENT, MIN_COMMENT_LENGTH, COMMENT_LENGTH_BONUS } from "@/lib/constants";
import styles from "./FeedbackForm.module.css";
import AnimatedTokenCounter from "./AnimatedTokenCounter";
import PopupMsg from "./PopupMsg";
import GiftArtistPopup from "./GiftArtistPopup";
import Button from "./ui/Button";
import { useUtmMode } from "@/hooks/useUtmMode";

interface FeedbackFormProps {
  songId: string;
  songSlug?: string;
  onSuccess?: (feedback: unknown, stats?: { averageRating: number; totalFeedbacks: number }) => void;
  getPlayedSeconds?: () => Promise<number>;
  isPlaying?: boolean;
  isDisabled?: boolean;
  disabledMessage?: string;
  initialSource?: string;
  onPopupClose?: () => void;
  isLoggedIn: boolean;
}

export default function FeedbackForm({
  songId,
  onSuccess,
  getPlayedSeconds,
  isPlaying,
  isDisabled,
  disabledMessage,
  initialSource,
  onPopupClose,
  isLoggedIn
}: FeedbackFormProps) {
  const [ratings, setRatings] = useState({
    cat2: 0,
    cat3: 0,
    overall: 0,
  });
  const [comment, setComment] = useState(initialSource === "top-rated" ? "שמעתי את השיר באיזור השירים המדורגים" : "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [flyers, setFlyers] = useState<{ id: number; x: number; y: number; tx: number; ty: number; value: number; ox?: number; oy?: number }[]>([]);
  const bucketRef = useRef<HTMLDivElement>(null);
  const flyerIdRef = useRef(0);
  const [userTokens, setUserTokens] = useState<number>(0);
  const [isGiftPopupOpen, setIsGiftPopupOpen] = useState(false);
  const { isUtmMode } = useUtmMode();

  const triggerFlyer = useCallback((x: number, y: number, value: number, targetX?: number, targetY?: number, initialOffsetX = 0, initialOffsetY = 0) => {
    let finalX = targetX;
    let finalY = targetY;

    if (finalX === undefined || finalY === undefined) {
      if (!bucketRef.current) return;
      const bucketRect = bucketRef.current.getBoundingClientRect();
      finalX = bucketRect.left + bucketRect.width / 2;
      finalY = bucketRect.top + bucketRect.height / 2;
    }

    const id = ++flyerIdRef.current;

    // Add jitter to start and end positions so multiple flyers are visible
    const jitter = () => (Math.random() - 0.5) * 10;

    setFlyers(prev => [...prev, {
      id,
      x: x + jitter(),
      y: y + jitter(),
      tx: finalX + jitter(),
      ty: finalY + jitter(),
      ox: initialOffsetX,
      oy: initialOffsetY,
      value
    }]);

    // Cleanup after animation finishes (safety timeout)
    setTimeout(() => {
      setFlyers(prev => prev.filter(f => f.id !== id));
    }, 2000);
  }, []);

  const [listenCredits, setListenCredits] = useState(0);
  const playRewardGivenRef = useRef(false);
  const playTimeSecondsRef = useRef(0);

  useEffect(() => {
    if (isPlaying && !playRewardGivenRef.current) {
      playRewardGivenRef.current = true;
      setTimeout(() => setListenCredits(prev => prev + 1), 0);

      if (bucketRef.current) {
        const bucketRect = bucketRef.current.getBoundingClientRect();
        triggerFlyer(bucketRect.left + bucketRect.width / 2, bucketRect.top - 80, 1, bucketRect.left + bucketRect.width / 2, bucketRect.top + bucketRect.height / 2, -40, 50);
      }
    }

    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        playTimeSecondsRef.current += 1;

        if (playTimeSecondsRef.current >= 5) {
          playTimeSecondsRef.current = 0; // Reset for the next 5s block
          setListenCredits(prev => prev + 1);

          if (bucketRef.current) {
            const bucketRect = bucketRef.current.getBoundingClientRect();
            triggerFlyer(bucketRect.left + bucketRect.width / 2, bucketRect.top - 80, 1, bucketRect.left + bucketRect.width / 2, bucketRect.top + bucketRect.height / 2, -40, 50);
          }
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, triggerFlyer]);

  const categories = [
    { key: "cat2" as const, name: "הפקה", reward: REWARD_PRODUCTION },
    { key: "cat3" as const, name: "שירה", reward: REWARD_VOCALS },
    { key: "overall" as const, name: "ציון כללי", reward: REWARD_OVERALL },
  ];

  const handleRating = (key: keyof typeof ratings, value: number, e?: React.MouseEvent | React.TouchEvent) => {
    // Determine if we're gaining a new point for this category (from 0 to >0)
    const isGaining = ratings[key] === 0 && value > 0;
    const isSettingToZero = ratings[key] === value;

    setRatings((prev) => ({
      ...prev,
      [key]: isSettingToZero ? 0 : value
    }));


    if (status === "error") setStatus("idle");

    if (isGaining && e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const reward = categories.find(c => c.key === key)?.reward || REWARD_PRODUCTION;
      triggerFlyer(rect.left + rect.width / 2, rect.top + rect.height / 2, reward);
    }
  };

  const handleTouch = (e: React.TouchEvent, key: keyof typeof ratings) => {
    const touch = e.touches[0];
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    // In RTL, the first star (1) is on the right. 
    // We calculate the distance from the RIGHT edge of the container.
    const distanceFromRight = rect.right - touch.clientX;
    const percentage = distanceFromRight / rect.width;
    let rating = Math.ceil(percentage * 5);

    // Clamp rating between 1 and 5
    rating = Math.max(1, Math.min(5, rating));

    // Only update if it's a new value to avoid unnecessary re-renders
    if (ratings[key] !== rating) {
      handleRating(key, rating, e);
    }
  };

  const [songStats, setSongStats] = useState<{ averageRating: number; totalFeedbacks: number } | null>(null);

  // Calculate live earned credits
  const earnedFromCategories = categories.reduce((sum, cat) => sum + (ratings[cat.key] > 0 ? cat.reward : 0), 0);
  const commentLength = comment.trim().length;
  const hasValidComment = commentLength >= MIN_COMMENT_LENGTH;
  const hasBonusComment = commentLength >= COMMENT_LENGTH_BONUS;
  const currentCredits = earnedFromCategories + (hasValidComment ? REWARD_COMMENT : 0) + (hasBonusComment ? REWARD_COMMENT : 0) + listenCredits;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missingRatings = [];
    if (ratings.cat2 === 0) missingRatings.push("הפקה");
    if (ratings.cat3 === 0) missingRatings.push("שירה");
    if (ratings.overall === 0) missingRatings.push("ציון כללי");

    const commentTrimmed = comment.trim();
    const isCommentMissing = commentTrimmed.length === 0;
    const isCommentTooShort = !isCommentMissing && commentTrimmed.length < MIN_COMMENT_LENGTH;

    if (missingRatings.length > 0 || isCommentMissing || isCommentTooShort) {
      setStatus("error");
      let msg = "";
      if (missingRatings.length > 0) {
        msg = `חסר דירוג עבור: ${missingRatings.join(", ")}. `;
      }

      if (isCommentMissing) {
        msg += missingRatings.length > 0
          ? "בנוסף אנא כתבו גם פידבק קצר שיאפשר לאמן ללמוד ולהשתפר."
          : "אנא כתבו פידבק קצר לאמן. זה ממש חשוב להם.";
      } else if (isCommentTooShort) {
        msg += `התגובה קצרה מדי (מינימום ${MIN_COMMENT_LENGTH} תווים). זה ממש חשוב לאמן כדי ללמוד ולהשתפר.`;
      }

      setErrorMsg(msg.trim());
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    let playedSeconds = 0;
    if (getPlayedSeconds) {
      playedSeconds = await getPlayedSeconds();
    }

    try {
      const result = await addFeedback({
        songId,
        cat2: ratings.cat2,
        cat3: ratings.cat3,
        overall: ratings.overall,
        comment: commentTrimmed,
        playedSeconds,
        listenCredits,
      });

      if (isLoggedIn) {
        // Fetch user stats for the Gift feature
        const tokensResult = await getUserTokens();
        if (tokensResult.success) setUserTokens(tokensResult.tokens);
      }

      if (result.success) {
        // --- ADDED BUCKET -> NAVBAR ANIMATION --- //
        const navTokenElement = document.querySelector('[class*="tokenDisplay"]');
        if (navTokenElement && bucketRef.current && currentCredits > 0) {
          const navRect = navTokenElement.getBoundingClientRect();
          const bucketRect = bucketRef.current.getBoundingClientRect();

          triggerFlyer(
            bucketRect.left + bucketRect.width / 2,
            bucketRect.top + bucketRect.height / 2,
            currentCredits,
            navRect.left + navRect.width / 2,
            navRect.top + navRect.height / 2
          );
        }

        if (result.averageRating !== undefined) {
          setSongStats({
            averageRating: result.averageRating,
            totalFeedbacks: result.totalFeedbacks || 0
          });
        }

        setStatus("success");
        // Reset happens in PopupMsg onClose
        onSuccess?.(result.feedback, (result.averageRating !== undefined && result.totalFeedbacks !== undefined) ? {
          averageRating: result.averageRating,
          totalFeedbacks: result.totalFeedbacks
        } : undefined);
        // Dispatch custom event to notify Navbar or other components
        window.dispatchEvent(new CustomEvent("tokens-updated"));
      } else {
        setStatus("error");
        setErrorMsg(result.error || "משהו השתבש בשליחת הפידבק.");
      }
    } catch {
    }
  };

  const currentAverage = ((ratings.cat2 + ratings.cat3 + ratings.overall) / 3);
  const showGiftButton = !isUtmMode && currentAverage >= 4;

  return (
    <div className={styles.form}>
      {/* Form container is now always accessible (guest mode) */}
      <div>
        <PopupMsg
          key="success-popup"
          isOpen={status === "success" && !isGiftPopupOpen}
          onClose={() => {
            setStatus("idle");
            setSongStats(null);
            setRatings({
              cat2: 0,
              cat3: 0,
              overall: 0,
            });
            setComment("");
            onPopupClose?.();
          }}
          title="תודה על הפידבק!"
          buttonText="שיר הבא"
          secondaryButtonText={showGiftButton ? "תנו מתנה קטנה לאמן" : undefined}
          secondaryButtonIcon={showGiftButton ? <Gift size={18} /> : undefined}
          onSecondaryClick={showGiftButton ? () => setIsGiftPopupOpen(true) : undefined}
          message={
            songStats && (
              <div className={styles.successStats}>
                <p className={styles.successScoreLabel}>
                  <span className={styles.successScoreText}>הדירוג שלי לשיר: </span>
                  <span className={styles.successScoreValue}>
                    {((ratings.cat2 + ratings.cat3 + ratings.overall) / 3).toFixed(1)}
                  </span>
                </p>
                <p className={styles.successScoreLabel}>
                  <span className={styles.successScoreText}>דירוג הקהילה לשיר: </span>
                  <span className={styles.successScoreValue}>{songStats.averageRating.toFixed(1)}</span>
                </p>
              </div>
            )
          }
        />

        <PopupMsg
          key="error-popup"
          isOpen={status === "error"}
          onClose={() => setStatus("idle")}
          message={errorMsg}
          icon={<AlertCircle size={34} color="#DC2626" />}
          buttonText="הבנתי"
          variant="error"
        />

        <form onSubmit={handleSubmit}>
          <div className={styles.ratingGrid}>
            {categories.map((cat) => (
              <div key={cat.key} className={styles.ratingGroup}>
                <label className={styles.ratingLabel}>
                  {cat.name}
                </label>
                <div
                  className={styles.stars}
                  onTouchMove={(e) => handleTouch(e, cat.key)}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`${styles.starBtn} ${ratings[cat.key] >= star ? styles.starFilled : ""}`}
                      onClick={(e) => handleRating(cat.key, star, e)}
                    >
                      <Star
                        size={18 + (star - 1) * 1.5}
                        fill={ratings[cat.key] >= star ? "currentColor" : "none"}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.commentGroup}>
            <div className={styles.textareaWrapper}>
              <textarea
                className={styles.textarea}
                placeholder={`הוסיפו כמה מילים על מה שאהבתם ומה כדאי לשפר.`}
                value={comment}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const prevLength = comment.trim().length;
                  const nextLength = newValue.trim().length;

                  const rect = e.currentTarget.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;

                  // Trigger for MIN_COMMENT_LENGTH (30)
                  if (prevLength < MIN_COMMENT_LENGTH && nextLength >= MIN_COMMENT_LENGTH) {
                    triggerFlyer(centerX, centerY, REWARD_COMMENT);
                  }

                  // Trigger for COMMENT_LENGTH_BONUS (60)
                  if (prevLength < COMMENT_LENGTH_BONUS && nextLength >= COMMENT_LENGTH_BONUS) {
                    triggerFlyer(centerX, centerY, REWARD_COMMENT);
                  }

                  setComment(newValue);
                  if (status === "error") setStatus("idle");
                }}
              />
            </div>
            <div className={`${styles.charCounter} ${comment.length === 0 ? "" : (comment.length < MIN_COMMENT_LENGTH ? styles.charCounterLow : styles.charCounterValid)}`}>
              {comment.length < MIN_COMMENT_LENGTH && `עוד ${MIN_COMMENT_LENGTH - comment.length} תווים למינימום נדרש`}
            </div>
          </div>

          <div className={styles.submitWrapper}>
            <div className={styles.bucketWrapper}>
              <div ref={bucketRef} style={{ display: 'inline-flex', position: 'relative' }}>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={currentCredits}
                    initial={{ scale: 0.5, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.5, opacity: 0, y: -10 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={styles.bucketContainer}
                  >
                    <svg
                      width="44"
                      height="44"
                      viewBox="0 0 44 44"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={styles.bucketSvg}
                    >
                      {/* Token Depth/Edge */}
                      <circle cx="22" cy="24" r="18" fill="currentColor" fillOpacity="0.05" />

                      {/* Token Face */}
                      <circle
                        cx="22"
                        cy="20"
                        r="18"
                        fill="white"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeOpacity="0.2"
                      />
                    </svg>
                    <span className={styles.bucketValue}>
                      +<AnimatedTokenCounter value={currentCredits} />
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <Button
              type="submit"
              className={styles.submitBtn}
              isLoading={status === "loading"}
              disabled={isDisabled}
            >
              {isDisabled ? disabledMessage : "שליחת פידבק (אנונימי)"}
            </Button>
          </div>
        </form>
      </div>


      {/* Flying Numbers Portal-like overlay */}
      <AnimatePresence>
        {flyers.map((flyer) => (
          <motion.div
            key={flyer.id}
            initial={{
              x: flyer.x + (flyer.ox || 0),
              y: flyer.y + (flyer.oy || 0),
              opacity: 0,
              scale: 0.5
            }}
            animate={{
              x: flyer.tx,
              y: flyer.ty,
              opacity: [0, 1, 1, 0.8],
              scale: [0.5, 1.5, 1],
            }}
            transition={{
              duration: 1.0,
              ease: "circOut",
              x: { duration: 1.0, ease: "linear" },
              y: { duration: 1.0, ease: "circIn" } /* Create an arc effect */
            }}
            onAnimationComplete={() => {
              // Immediately remove flyer when animation completes to avoid DOM buildup
              setFlyers(prev => prev.filter(f => f.id !== flyer.id));
            }}
            className={styles.flyer}
          >
            +{flyer.value}
          </motion.div>
        ))}
      </AnimatePresence>

      <GiftArtistPopup
        isOpen={isGiftPopupOpen}
        onClose={() => setIsGiftPopupOpen(false)}
        songId={songId}
        songTitle={songStats ? "השיר שדירגת" : "השיר"} // We don't have song title here easily unless passed in, but we can use "השיר שדירגת"
        maxTokens={userTokens}
        onSuccess={() => {
          setStatus("idle");
          onPopupClose?.();
        }}
      />
    </div>
  );
}
