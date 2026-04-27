"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle, Gift } from "lucide-react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { addFeedback, getUserTokens } from "@/app/actions/songs";
import { REWARD_PER_COMMENT_STEP, COMMENT_STEP_LENGTH, MIN_COMMENT_LENGTH, MAX_COMMENT_LENGTH } from "@/lib/constants";
import styles from "./FeedbackForm.module.css";
import AnimatedTokenCounter from "./AnimatedTokenCounter";
import PopupMsg from "./PopupMsg";
import GiftArtistPopup from "./GiftArtistPopup";
import Button from "./ui/Button";
import { useUtmMode } from "@/hooks/useUtmMode";
import { getRatingText } from "@/lib/utils";

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
    overall: 5.5,
  });
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [hasInteractedWithSlider, setHasInteractedWithSlider] = useState(false);
  const [flyers, setFlyers] = useState<{ id: number; x: number; y: number; tx: number; ty: number; value: number }[]>([]);
  const bucketRef = useRef<HTMLDivElement>(null);
  const flyerIdRef = useRef(0);
  const totalListenTimeRef = useRef(0);
  const [userTokens, setUserTokens] = useState<number>(0);
  const [isGiftPopupOpen, setIsGiftPopupOpen] = useState(false);
  const { isUtmMode } = useUtmMode();

  const triggerFlyer = useCallback((x: number, y: number, value: number, targetX?: number, targetY?: number) => {
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
      value
    }]);

    // Flyers are cleaned up via onAnimationComplete in the render loop
  }, []);

  const [listenCredits, setListenCredits] = useState(0);
  const playTimeSecondsRef = useRef(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        playTimeSecondsRef.current += 1;

        if (playTimeSecondsRef.current >= 5) {
          playTimeSecondsRef.current = 0; // Reset for the next 5s block
          setListenCredits(prev => prev + 1);
        }
        totalListenTimeRef.current += 1;
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSliderChange = (value: number) => {
    setRatings({ overall: value });
    setHasInteractedWithSlider(true);
    if (status === "error") setStatus("idle");
  };

  const [songStats, setSongStats] = useState<{ averageRating: number; totalFeedbacks: number } | null>(null);

  // Calculate live earned credits
  const commentLength = comment.trim().length;
  const commentCredits = Math.floor(commentLength / COMMENT_STEP_LENGTH) * REWARD_PER_COMMENT_STEP;
  const currentCredits = commentCredits + listenCredits;

  const [displayedCredits, setDisplayedCredits] = useState(currentCredits);
  const bucketControls = useAnimation();

  // Sync displayed credits with a delay to match flyer animation (1s)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayedCredits(currentCredits);
    }, currentCredits > displayedCredits ? 1000 : 0); // Only delay when increasing (reward)

    return () => clearTimeout(timer);
  }, [currentCredits, displayedCredits]);

  useEffect(() => {
    if (displayedCredits > 0) {
      bucketControls.start({
        y: [0, -5, 0],
        transition: { duration: 0.2, ease: "easeOut" }
      });
    }
  }, [displayedCredits, bucketControls]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const commentTrimmed = comment.trim();
    const isCommentMissing = commentTrimmed.length === 0;
    const isCommentTooShort = !isCommentMissing && commentTrimmed.length < MIN_COMMENT_LENGTH;
    if (isCommentMissing || isCommentTooShort) {
      setStatus("error");
      let msg = "";

      if (isCommentMissing) {
        msg = "אנא כתבו פידבק קצר לאמן. זה ממש חשוב להם.";
      } else if (isCommentTooShort) {
        msg = `התגובה קצרה מדי (מינימום ${MIN_COMMENT_LENGTH} תווים). זה ממש חשוב לאמן כדי ללמוד ולהשתפר.`;
      }

      setErrorMsg(msg.trim());
      return;
    }

    if (!hasInteractedWithSlider) {
      setStatus("error");
      setErrorMsg("רק רגע, מה ההתרשמות שלך? הזיזו את הסליידר כדי שנדע מה הרגשת.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    let playedSeconds = 0;
    if (getPlayedSeconds) {
      playedSeconds = await getPlayedSeconds();
    }
    // Fallback to internal tracker if player returns 0 or less
    if (playedSeconds <= 0 && totalListenTimeRef.current > 0) {
      playedSeconds = totalListenTimeRef.current;
    }

    try {
      const result = await addFeedback({
        songId,
        overall: ratings.overall,
        comment: initialSource === "top-rated" ? `שמעתי את השיר ב 10 הגדולים\n${commentTrimmed}` : commentTrimmed,
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

  const currentAverage = ratings.overall;
  const showGiftButton = !isUtmMode && currentAverage >= 7;

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
            setRatings({ overall: 0 });
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
                  <span className={styles.successScoreText}>הציון שלי: </span>
                  <span className={styles.successScoreValue}>
                    {Math.round(currentAverage * 2) / 2}
                  </span>
                </p>
                <p className={styles.successScoreLabel}>
                  <span className={styles.successScoreText}>ממוצע הקהילה: </span>
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
          {/* Text feedback first */}
          <div className={styles.commentGroup}>
            <label className={styles.commentLabel}>
              הפידבק שלך עוזר לאמן להשתפר. כתבו בכנות: מה עבד לכם ומה הרגיש פחות מדויק.
            </label>
            <div className={styles.textareaWrapper}>
              <textarea
                className={styles.textarea}
                placeholder={"אהבתי את...\nפחות התחברתי ל...\nכדאי לנסות לשפר את..."}
                maxLength={MAX_COMMENT_LENGTH}
                value={comment}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const prevLength = comment.trim().length;
                  const nextLength = newValue.trim().length;

                  const rect = e.currentTarget.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;

                  const prevSteps = Math.floor(prevLength / COMMENT_STEP_LENGTH);
                  const nextSteps = Math.floor(nextLength / COMMENT_STEP_LENGTH);

                  if (nextSteps > prevSteps) {
                    triggerFlyer(centerX, centerY, REWARD_PER_COMMENT_STEP);
                  }

                  setComment(newValue);
                  if (status === "error") setStatus("idle");
                }}
              />
            </div>
            <div className={`${styles.charCounter} ${comment.length === 0 ? "" : (comment.length < MIN_COMMENT_LENGTH ? styles.charCounterLow : styles.charCounterValid)}`}>
              {comment.length < MIN_COMMENT_LENGTH
                ? `עוד ${MIN_COMMENT_LENGTH - comment.length} תווים למינימום נדרש`
                : `${comment.length} / ${MAX_COMMENT_LENGTH}`}
            </div>
          </div>

          {/* Overall impression slider */}
          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel}>
              {hasInteractedWithSlider ? getRatingText(ratings.overall) : "התרשמות כללית"}
            </label>
            <div className={styles.sliderRow}>
              <span className={styles.sliderIcon}>❤️</span>
              <input
                type="range"
                min={1}
                max={10}
                step={0.1}
                value={ratings.overall || 5.5}
                className={styles.sliderInput}
                style={{
                  background: `hsl(${(ratings.overall - 1) * 120 / 9}, 80%, ${50 + Math.max(0, 48 - Math.abs(((ratings.overall - 1) * 120 / 9) - 60))
                    }%)`
                }}
                onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
              />
              <span className={styles.sliderIcon}>👎</span>
            </div>
          </div>

          <div className={styles.submitWrapper}>
            <div className={styles.bucketWrapper}>
              <div ref={bucketRef} style={{ display: 'inline-flex', position: 'relative' }}>
                <motion.div
                  animate={bucketControls}
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
                    +<AnimatedTokenCounter value={displayedCredits} />
                  </span>
                </motion.div>
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
              x: flyer.x,
              y: flyer.y,
              opacity: 0
            }}
            animate={{
              x: flyer.tx,
              y: flyer.ty,
              opacity: [0, 1, 1, 0.8]
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
