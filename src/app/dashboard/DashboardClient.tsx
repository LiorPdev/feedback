"use client";

import { useState, useCallback, useMemo, memo, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { BarChart3, Music, Play, SquareStop } from "lucide-react";
import Image from "next/image";
import SongCard from "@/components/SongCard";
import SongRatingsChart from "./SongRatingsChart";
import HeartWithTooltip from "@/components/HeartWithTooltip";
import Button from "@/components/ui/Button";
import UrlPlayer, { UrlPlayerHandle } from "@/components/UrlPlayer";
import styles from "./DashboardClient.module.css";
import type { GivenFeedbackItem } from "@/app/actions/feedback";
import { LIKE_FEEDBACK_REWARD } from "@/lib/constants";

interface DashboardSong {
  id: string;
  userId: string;
  url: string;
  title: string;
  genre: string;
  slug: string;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
  isActive: boolean;
  feedbacks?: {
    id: string;
    cat2: number;
    cat3: number;
    overall: number;
    playedSeconds: number | null;
    isUnlocked: boolean;
  }[];
  listenEvents?: { playedSeconds: number }[];
}

interface DashboardClientProps {
  songs: DashboardSong[];
  newSlug?: string;
  globalAverage?: number;
  minThreshold?: number;
  givenFeedbacks?: GivenFeedbackItem[];
}

function formatSeconds(seconds: number | null | undefined) {
  if (!seconds || isNaN(seconds) || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} שנ'`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Memoized feedback row — only re-renders when its own isActive/isPlaying state changes ──
interface FeedbackItemProps {
  fb: GivenFeedbackItem;
  isActive: boolean;
  onActivate: (id: string | null) => void;
}

const FeedbackItem = memo(function FeedbackItem({ fb, isActive, onActivate }: FeedbackItemProps) {
  const dateStr = useMemo(
    () => new Date(fb.createdAt).toLocaleDateString("he-IL"),
    [fb.createdAt]
  );

  const togglePlay = useCallback(() => {
    if (!isActive) {
      onActivate(fb.id);
    } else {
      onActivate(null);
    }
  }, [isActive, fb.id, onActivate]);

  const commentParts = useMemo(() => {
    if (!fb.comment || !fb.comment.trim()) return null;
    return fb.comment.split(/(\*\*.*?\*\*)/g);
  }, [fb.comment]);

  return (
    <div className={styles.myFeedbackItem}>
      <div className={styles.myFbHeader}>
        <div className={styles.myFbTitleRow}>
          <button
            className={styles.playIconBtn}
            onClick={togglePlay}
            title={isActive ? "עצור" : "נגן"}
          >
            {isActive ? <SquareStop size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <span className={styles.myFbSongTitle}>{fb.songTitle}</span>
          {fb.isLiked && (
            <HeartWithTooltip rewardAmount={LIKE_FEEDBACK_REWARD} />
          )}
        </div>
        <span className={styles.myFbDate}>{dateStr}</span>
      </div>

      <div className={styles.myFbBody}>
        {fb.playedSeconds && fb.playedSeconds > 0 && (
          <div className={styles.myFbPlaytime}>
            <strong className={styles.myFbLabel}>זמן האזנה:</strong>{" "}
            {formatSeconds(fb.playedSeconds)}
          </div>
        )}

        {(fb.cat2 > 0 || fb.cat3 > 0 || fb.overall > 0) && (
          <div className={styles.myFbRatingsRow}>
            <strong className={styles.myFbRatingLabel}>דירוג:</strong>
            <span className={styles.myFbOverallBadge}><strong className={styles.myFbLabel}>ציון לשיר:</strong>{" "}{fb.overall}</span>
            <span><strong className={styles.myFbLabel}>הפקה:</strong>{" "}{fb.cat2}</span>
            <span><strong className={styles.myFbLabel}>שירה:</strong>{" "}{fb.cat3}</span>
          </div>
        )}

        {commentParts && (
          <p className={styles.myFbComment}>
            {commentParts.map((part, i) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={i}>{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        )}
      </div>
    </div>
  );
});

export default function DashboardClient({
  songs,
  globalAverage = 0,
  minThreshold = 3,
  givenFeedbacks = [],
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);

  const activeFeedback = useMemo(() => {
    return givenFeedbacks.find(fb => fb.id === activeFeedbackId);
  }, [activeFeedbackId, givenFeedbacks]);

  const globalPlayerRef = useRef<UrlPlayerHandle>(null);

  const onGlobalPlayerReady = useCallback(() => {
    if (activeFeedbackId) {
      globalPlayerRef.current?.play();
    }
  }, [activeFeedbackId]);

  const onlyFeedbacksGiven = useMemo(
    () => songs.length === 0 && givenFeedbacks.length > 0,
    [songs.length, givenFeedbacks.length]
  );

  // Derive active tab from URL param 'tab', fallback to logic-based default
  const urlTab = searchParams.get('tab') as "songs" | "insights" | "myFeedbacks" | null;
  const activeTab = urlTab || (onlyFeedbacksGiven ? "myFeedbacks" : "songs");

  const [chartType, setChartType] = useState<"categories" | "retention" | "trueRating" | "overallCategories">("trueRating");

  const handleTabChange = useCallback((tab: "songs" | "insights" | "myFeedbacks") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  // Check if any song has feedbacks or listen events
  const hasAnyData = useMemo(() => songs.some(
    (song) => (Array.isArray(song.feedbacks) && song.feedbacks.length > 0) ||
      (Array.isArray(song.listenEvents) && song.listenEvents.length > 0)
  ), [songs]);

  return (
    <div className={styles.container}>
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {!onlyFeedbacksGiven && (
            <>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === "songs" ? styles.activeTab : ""}`}
                onClick={() => handleTabChange("songs")}
              >
                <div className={styles.tabLabel}>
                  <Music size={18} />
                  <span>השירים שלי</span>
                </div>
              </button>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === "insights" ? styles.activeTab : ""}`}
                onClick={() => handleTabChange("insights")}
              >
                <div className={styles.tabLabel}>
                  <BarChart3 size={18} />
                  <span>תובנות</span>
                </div>
              </button>
            </>
          )}

          {/* "הפידבק שנתתי" tab — shown if onlyFeedbacksGiven, otherwise shown alongside songs tabs */}
          {(onlyFeedbacksGiven || givenFeedbacks.length > 0) && (
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "myFeedbacks" ? styles.activeTab : ""}`}
              onClick={() => handleTabChange("myFeedbacks")}
            >
              <div className={styles.tabLabel}>
                <Image src="/Logo.png" alt="פידבק" width={18} height={18} />
                <span>הפידבק שנתתי</span>
              </div>
            </button>
          )}
        </div>

        <div className={`${styles.headerAction} ${styles.hideOnMobile}`}>
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push(`/get-feedback?new=true${searchParams.get('backHome') === 'true' ? "&backHome=true" : ""}`)}
          >
            הוספת שיר
          </Button>
        </div>
      </div>

      <div className={styles.tabContent}>
        {activeTab === "songs" && (
          <div className={styles.songsSection}>
            <div className={styles.songGrid}>
              {songs.map((song) => (
                <SongCard key={song.id} song={song} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "insights" && (
          <div className={styles.insightsSection}>
            <select
              className={styles.chartSelector}
              value={chartType}
              onChange={(e) => {
                setChartType(e.target.value as "categories" | "retention" | "trueRating" | "overallCategories");
                e.target.blur();
              }}
            >
              <option value="trueRating">מדד איכות משוקלל</option>
              <option value="retention">מדד האזנה</option>
              <option value="categories">לפי קטגוריית דירוג</option>
              <option value="overallCategories">ממוצע לפי קטגוריה</option>
            </select>

            {hasAnyData ? (
              <div className={styles.chartWrapper}>
                <SongRatingsChart
                  songs={songs}
                  type={chartType}
                  globalAverage={globalAverage}
                  minThreshold={minThreshold}
                />
              </div>
            ) : (
              <div className={styles.insightsContainer}>
                <h3>התובנות שלך!</h3>
                <p>כאן תוכלו לראות ניתוח של חוויית המאזינים בכל השירים שלכם.</p>
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem', opacity: 0.5 }}>
                  <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'rgba(0,0,0,0.05)' }} />
                  <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'rgba(0,0,0,0.05)' }} />
                  <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'rgba(0,0,0,0.05)' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "myFeedbacks" && (
          <div className={styles.myFeedbacksSection}>
            {givenFeedbacks.length > 0 ? (
              <div className={styles.myFeedbacksList}>
                {givenFeedbacks.map((fb) => (
                  <FeedbackItem
                    key={fb.id}
                    fb={fb}
                    isActive={activeFeedbackId === fb.id}
                    onActivate={setActiveFeedbackId}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.insightsContainer}>
                <Image src="/Logo.png" alt="פידבק" width={48} height={48} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
                <h3>עדיין לא נתת פידבקים</h3>
                <p>לאחר שתיתן פידבקים לשירים של יוצרים אחרים, הם יופיעו כאן.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {activeFeedback && (
        <UrlPlayer
          ref={globalPlayerRef}
          url={activeFeedback.songUrl}
          isHidden={true}
          onReady={onGlobalPlayerReady}
          onEnded={() => setActiveFeedbackId(null)}
        />
      )}
    </div>
  );
}
