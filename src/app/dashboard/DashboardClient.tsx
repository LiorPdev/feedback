"use client";

import { useState } from "react";
import Link from "next/link";
import SongCard from "@/components/SongCard";
import styles from "./dashboard-client.module.css";
import { BarChart3, Music } from "lucide-react";
import SongRatingsChart from "./SongRatingsChart";

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
}

export default function DashboardClient({ songs, newSlug, globalAverage = 0, minThreshold = 3 }: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"songs" | "insights">("songs");
  const [chartType, setChartType] = useState<"general" | "categories" | "retention" | "trueRating">("trueRating");

  // Check if any song has feedbacks or listen events
  const hasAnyData = songs.some(
    (song) => (Array.isArray(song.feedbacks) && song.feedbacks.length > 0) ||
      (Array.isArray(song.listenEvents) && song.listenEvents.length > 0)
  );

  return (
    <div className={styles.container}>
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "songs" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("songs")}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Music size={18} />
              <span>השירים ששלחתי</span>
            </div>
          </button>
          <button
            className={`${styles.tab} ${activeTab === "insights" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("insights")}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} />
              <span>תובנות</span>
            </div>
          </button>
        </div>

        <div className={`${styles.headerAction} ${styles.hideOnMobile}`}>
          <Link href="/get-feedback" className={styles.submitNewBtn}>
            <span className={styles.btnText}>שליחת שיר נוסף</span>
          </Link>
        </div>
      </div>

      <div className={styles.tabContent}>
        {activeTab === "songs" ? (
          <div className={styles.songsSection}>
            <div className={styles.songGrid}>
              {songs.map((song) => (
                <SongCard key={song.id} song={song} isNew={song.slug === newSlug} />
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.insightsSection}>
            <select
              className={styles.chartSelector}
              value={chartType}
              onChange={(e) => setChartType(e.target.value as "general" | "categories" | "retention" | "trueRating")}
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
                  {/* Visual placeholders */}
                  <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'rgba(0,0,0,0.05)' }} />
                  <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'rgba(0,0,0,0.05)' }} />
                  <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'rgba(0,0,0,0.05)' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
