"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { BarChart3, MessageSquare, Music } from "lucide-react";
import SongCard from "@/components/SongCard";
import SongRatingsChart from "./SongRatingsChart";
import PlayButton from "@/components/PlayButton";
import styles from "./DashboardClient.module.css";
import type { GivenFeedbackItem } from "@/app/actions/feedback";

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
  feedbacks?: unknown[];
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

export default function DashboardClient({
  songs,
  newSlug,
  globalAverage = 0,
  minThreshold = 3,
  givenFeedbacks = [],
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const onlyFeedbacksGiven = songs.length === 0 && givenFeedbacks.length > 0;

  // Derive active tab from URL param 'tab', fallback to logic-based default
  const urlTab = searchParams.get('tab') as "songs" | "insights" | "myFeedbacks" | null;
  const activeTab = urlTab || (onlyFeedbacksGiven ? "myFeedbacks" : "songs");

  const [chartType, setChartType] = useState<"general" | "categories" | "retention" | "trueRating">("trueRating");
  const [activeNewSlug, setActiveNewSlug] = useState<string | undefined>(newSlug);

  const handleTabChange = (tab: "songs" | "insights" | "myFeedbacks") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (newSlug) {
      // Clear URL query parameters via Next.js router
      const params = new URLSearchParams(searchParams.toString());
      if (params.has('new')) {
        params.delete('new');
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }

      // Clear the "new" highlight state after 10 seconds to ensure
      // it doesn't re-trigger on tab switches later.
      const timer = setTimeout(() => {
        setActiveNewSlug(undefined);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [newSlug, pathname, router, searchParams]);

  // Check if any song has feedbacks or listen events
  const hasAnyData = songs.some(
    (song) => (Array.isArray(song.feedbacks) && song.feedbacks.length > 0) ||
      (Array.isArray(song.listenEvents) && song.listenEvents.length > 0)
  );

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

          {/* "הפידבק שנתתי" tab — always shown if onlyFeedbacksGiven, otherwise shown alongside songs tabs */}
          {(onlyFeedbacksGiven || givenFeedbacks.length > 0) && (
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "myFeedbacks" ? styles.activeTab : ""}`}
              onClick={() => handleTabChange("myFeedbacks")}
            >
              <div className={styles.tabLabel}>
                <MessageSquare size={18} />
                <span>הפידבק שנתתי</span>
              </div>
            </button>
          )}
        </div>

        <div className={`${styles.headerAction} ${styles.hideOnMobile}`}>
          <Link href="/get-feedback" className={styles.submitNewBtn}>
            <span className={styles.btnText}>שליחת שיר</span>
          </Link>
        </div>
      </div>

      <div className={styles.tabContent}>
        {activeTab === "songs" && (
          <div className={styles.songsSection}>
            <div className={styles.songGrid}>
              {songs.map((song) => (
                <SongCard key={song.id} song={song} isNew={song.slug === activeNewSlug} />
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
                setChartType(e.target.value as "general" | "categories" | "retention" | "trueRating");
                e.target.blur();
              }}
            >
              <option value="trueRating">מדד איכות משוקלל</option>
              <option value="general">ציון ממוצע (כוכבים)</option>
              <option value="categories">פילוח לפי קטגוריות</option>
              <option value="retention">מדד האזנה</option>
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
                <BarChart3 size={48} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
                <h3>התובנות שלך בדרך!</h3>
                <p>כאן תוכל לראות ניתוח עומק של חוויית המאזינים בכל השירים שלך.</p>
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
                  <div key={fb.id} className={styles.myFeedbackItem}>
                    {/* Header: PlayButton + Song title + Date */}
                    <div className={styles.myFbHeader}>
                      <div className={styles.myFbTitleRow}>
                        <PlayButton
                          url={fb.songUrl}
                          songId={fb.songId}
                          size={26}
                        />
                        <span className={styles.myFbSongTitle}>{fb.songTitle}</span>
                      </div>
                      <span className={styles.myFbDate}>
                        {new Date(fb.createdAt).toLocaleDateString("he-IL")}
                      </span>
                    </div>



                    {/* Playtime + Ratings + Comment */}
                    <div className={styles.myFbBody}>
                      {fb.playedSeconds && fb.playedSeconds > 0 && (
                        <div className={styles.myFbPlaytime}>
                          <strong className={styles.myFbLabel}>זמן השמעה:</strong>{" "}
                          {formatSeconds(fb.playedSeconds)}
                        </div>
                      )}

                      {/* Ratings row */}
                      {(fb.cat2 > 0 || fb.cat3 > 0 || fb.overall > 0) && (
                        <div className={styles.myFbRatingsRow}>
                          <strong className={styles.myFbRatingLabel}>דירוג:</strong>
                          <span><strong className={styles.myFbLabel}>הפקה:</strong>{" "}{fb.cat2}</span>
                          <span><strong className={styles.myFbLabel}>שירה:</strong>{" "}{fb.cat3}</span>
                          <span className={styles.myFbOverallBadge}>
                            <strong className={styles.myFbLabel}>כללי:</strong>{" "}{fb.overall}
                          </span>
                        </div>
                      )}

                      {/* Comment */}
                      {fb.comment && fb.comment.trim().length > 0 && (
                        <p className={styles.myFbComment}>
                          {fb.comment.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                            part.startsWith('**') && part.endsWith('**')
                              ? <strong key={i}>{part.slice(2, -2)}</strong>
                              : part
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.insightsContainer}>
                <MessageSquare size={48} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
                <h3>עדיין לא נתת פידבקים</h3>
                <p>לאחר שתיתן פידבקים לשירים של יוצרים אחרים, הם יופיעו כאן.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
