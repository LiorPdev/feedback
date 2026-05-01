"use client";

import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import styles from './SongRatingsChart.module.css';


interface Feedback {
  overall: number;
  playedSeconds?: number;
}

interface SongWithFeedbacks {
  title: string;
  feedbacks?: Feedback[] | unknown[];
  listenEvents?: { playedSeconds: number }[];
}

interface SongRatingsChartProps {
  songs: SongWithFeedbacks[];
  type?: "retention" | "trueRating";
  globalAverage?: number;
  minThreshold?: number;
}

interface ChartDataPoint {
  songTitle: string;
  avgOverall: number;
  avgListenTime: number;
  trueRating: number;
  userAverage: number;
  feedbacksCount: number;
  listenersCount: number;
}

export default function SongRatingsChart({ songs, type = "trueRating", globalAverage = 0, minThreshold = 3 }: SongRatingsChartProps) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const chartData = useMemo(() => {
    // Calculate the user's personal average rating across all their songs/feedbacks
    let totalScoreAll = 0;
    let totalReviewsAll = 0;

    songs.forEach(s => {
      const fbs = (s.feedbacks || []) as Feedback[];
      fbs.forEach(fb => {
        totalScoreAll += fb.overall;
        totalReviewsAll += 1;
      });
    });

    const userAverage = totalReviewsAll > 0 ? totalScoreAll / totalReviewsAll : globalAverage;

    const baseData = songs
      .map((song) => {
        const fbs = (song.feedbacks || []) as Feedback[];
        const events = (song.listenEvents || []) as { playedSeconds: number }[];

        const isRetention = type === 'retention';
        const hasFeedbacks = fbs.length > 0;
        const hasEvents = events.length > 0;

        // FILTERING LOGIC:
        // 1. For score-based charts (general, categories, trueRating), 
        //    we MUST have at least one feedback.
        // 2. For retention charts, we just need activity (feedback OR listen event).
        if (isRetention) {
          if (!hasFeedbacks && !hasEvents) return null;
        } else {
          if (!hasFeedbacks) return null;
        }

        const count = fbs.length;
        // Current song average
        const songAvgRating = count > 0
          ? (fbs.reduce((sum, fb) => sum + fb.overall, 0) / count)
          : 0;

        // Bayesian Rating: (v*R + m*C) / (v+m)
        const v = count;
        const R = songAvgRating;
        const m = minThreshold;
        const C = userAverage; // Now using the user's personal context

        const trueRating = ((v * R) + (m * C)) / (v + m);

        // Retention calculation
        const allPlayTimes = [
          ...fbs.map(fb => fb.playedSeconds || 0).filter(s => s > 0),
          ...events.map(ev => ev.playedSeconds || 0).filter(s => s > 0)
        ];

        const avgListenTime = allPlayTimes.length > 0
          ? allPlayTimes.reduce((sum, t) => sum + t, 0) / allPlayTimes.length
          : 0;

        return {
          songTitle: song.title,
          avgOverall: Math.round(songAvgRating * 10) / 10,
          avgListenTime: Math.round(avgListenTime),
          trueRating: Math.round(trueRating * 100) / 100,
          userAverage: Math.round(userAverage * 10) / 10,
          feedbacksCount: count,
          listenersCount: allPlayTimes.length,
        };
      })
      .filter(Boolean);



    return baseData.sort((a, b) => {
      if (!a || !b) return 0;
      if (type === 'trueRating') return b.trueRating - a.trueRating;
      if (type === 'retention') return b.avgListenTime - a.avgListenTime;
      return 0;
    }) as ChartDataPoint[];

  }, [songs, globalAverage, minThreshold, type]);

  if (chartData.length === 0) {
    return (
      <div className={styles.noDataMessage}>
        <p>אין מספיק נתונים להצגת הגרף שנבחר.</p>
        <p className={styles.noDataSubText}>
          {type === 'retention'
            ? "שירים יופיעו כאן לאחר שתהיה בהם פעילות האזנה."
            : "שירים יופיעו כאן לאחר שיקבלו פידבקים מהקהילה."}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height="100%" className={styles.responsiveContainer}>
        <BarChart
          layout={'vertical'}
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          barCategoryGap={"10%"}
        >
          <defs>
            <linearGradient id="colorRatingGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity={1} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="colorRetentionGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6d28d9" stopOpacity={1} />
              <stop offset="100%" stopColor="#c084fc" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f0f0f0" />
          <XAxis
            type="number"
            domain={[0, 'dataMax']}
            ticks={undefined}
            allowDecimals={true}
            tick={false}
            axisLine={false}
          />

          <YAxis
            dataKey="songTitle"
            type="category"
            width={10}
            interval={0}
            axisLine={false}
            tickLine={false}
            tick={(props) => {
              const { x, y, payload } = props;
              const name = payload.value;
              const xOffset = 30;

              return (
                <g transform={`translate(${Number(x) + xOffset},${Number(y)})`}>
                  <text
                    x={0}
                    y={0}
                    dy={4}
                    textAnchor="start"
                    fill="#fff"
                    stroke="#000"
                    strokeWidth={1}
                    fontSize={isMobile ? 13 : 14}
                    fontWeight={700}
                    style={{ direction: 'ltr', paintOrder: 'stroke' }}
                  >
                    {name}
                  </text>
                </g>
              );
            }}
          />

          <Tooltip
            cursor={{ fill: 'transparent' }}
            position={{ x: 50 }}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 1000 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className={styles.tooltipContainer} style={{ transform: 'translateY(-30px)' }}>
                    {type === 'trueRating' && (
                      <div className={styles.tooltipTrueRatingWrapper}>
                        <p className={styles.tooltipTrueRatingTitle}>מדד איכות משוקלל: {data.trueRating}</p>
                        <p className={styles.tooltipTrueRatingDesc}>
                          דירוג המשקלל את ממוצע השיר מול הממוצע הכללי של השירים שלך ({data.userAverage}).
                        </p>
                      </div>
                    )}
                    {type === 'retention' && (
                      <p className={styles.tooltipRetentionText}>
                        ממוצע האזנה: {Math.floor(data.avgListenTime / 60)}:{String(data.avgListenTime % 60).padStart(2, '0')} דקות
                      </p>
                    )}

                    <p className={styles.tooltipFooter}>
                      {type === 'retention' ? `סה"כ האזנות שחושבו: ${data.listenersCount}` : `מספר מדרגים: ${data.feedbacksCount}`}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />


          <Bar
            name={type === 'trueRating' ? "מדד איכות" : "ממוצע האזנה"}
            dataKey={type === 'trueRating' ? "trueRating" : "avgListenTime"}
            fill={type === 'trueRating' ? "url(#colorRatingGradient)" : "url(#colorRetentionGradient)"}
            radius={[0, 4, 4, 0]}
            maxBarSize={100}
          />


        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
