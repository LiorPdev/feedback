"use client";

import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Legend } from 'recharts';
import styles from './SongRatingsChart.module.css';
import { WEIGHT_PRODUCTION, WEIGHT_SINGING, WEIGHT_OVERALL } from '@/lib/constants';

interface Feedback {
  cat2: number;
  cat3: number;
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
  type?: "general" | "categories" | "retention" | "trueRating";
  globalAverage?: number;
  minThreshold?: number;
}

interface LegendPayloadEntry {
  value: string;
  color: string;
}

interface CustomLegendProps {
  payload?: LegendPayloadEntry[];
}

const CustomLegend = (props: CustomLegendProps) => {
  const { payload } = props;
  if (!payload) return null;

  // Define the desired order correctly
  const order = ['כללי', 'שירה', 'הפקה'];
  const sortedPayload = [...payload].sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));

  return (
    <div className={styles.legendContainer}>
      {sortedPayload.map((entry, index) => (
        <div key={`item-${index}`} className={styles.legendItem}>
          <div
            className={styles.legendColorBox}
            style={{ backgroundColor: entry.color }}
          />
          <span className={styles.legendLabel}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function SongRatingsChart({ songs, type = "general", globalAverage = 0, minThreshold = 3 }: SongRatingsChartProps) {
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
        totalScoreAll += (fb.cat2 * WEIGHT_PRODUCTION + fb.cat3 * WEIGHT_SINGING + fb.overall * WEIGHT_OVERALL);
        totalReviewsAll += 1;
      });
    });

    const userAverage = totalReviewsAll > 0 ? totalScoreAll / totalReviewsAll : globalAverage;

    return songs
      .map((song) => {
        const fbs = (song.feedbacks || []) as Feedback[];
        const events = (song.listenEvents || []) as { playedSeconds: number }[];

        if (fbs.length === 0 && events.length === 0) return null;

        const count = fbs.length;
        const avgOverall = count > 0 ? fbs.reduce((sum, fb) => sum + (fb.overall || 0), 0) / count : 0;
        const avgCat2 = count > 0 ? fbs.reduce((sum, fb) => sum + (fb.cat2 || 0), 0) / count : 0;
        const avgCat3 = count > 0 ? fbs.reduce((sum, fb) => sum + (fb.cat3 || 0), 0) / count : 0;

        // Current song average (average of all 3 categories across all reviews)
        const songAvgRating = count > 0
          ? (fbs.reduce((sum, fb) => sum + (fb.cat2 * WEIGHT_PRODUCTION + fb.cat3 * WEIGHT_SINGING + fb.overall * WEIGHT_OVERALL), 0) / count)
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
          avgProduction: Math.round(avgCat2 * 10) / 10,
          avgSinging: Math.round(avgCat3 * 10) / 10,
          avgOverall: Math.round(avgOverall * 10) / 10,
          avgListenTime: Math.round(avgListenTime),
          trueRating: Math.round(trueRating * 100) / 100,
          userAverage: Math.round(userAverage * 10) / 10,
          feedbacksCount: count,
          listenersCount: allPlayTimes.length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (!a || !b) return 0;
        if (type === 'trueRating') return b.trueRating - a.trueRating;
        if (type === 'retention') return b.avgListenTime - a.avgListenTime;
        if (type === 'categories') {
          // For stacked bars, sort by the total height (sum of categories)
          const totalA = a.avgProduction + a.avgSinging + a.avgOverall;
          const totalB = b.avgProduction + b.avgSinging + b.avgOverall;
          return totalB - totalA;
        }
        // Default to avgOverall for 'general'
        return b.avgOverall - a.avgOverall;
      }) as {
        songTitle: string;
        avgProduction: number;
        avgSinging: number;
        avgOverall: number;
        avgListenTime: number;
        trueRating: number;
        userAverage: number;
        feedbacksCount: number;
        listenersCount: number;
      }[];
  }, [songs, globalAverage, minThreshold, type]);

  if (chartData.length === 0) return null;

  return (
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height="100%" className={styles.responsiveContainer}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRetentionGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity={1} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis
            type="number"
            domain={type === 'general' ? [0, 5] : [0, 'dataMax']}
            ticks={type === 'general' ? [0, 1, 2, 3, 4, 5] : undefined}
            allowDecimals={true}
            tick={false}
            axisLine={false}
            tickLine={false}
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
                    fontSize={isMobile ? 11 : 14}
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
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 1000 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className={styles.tooltipContainer}>
                    {type === 'general' && (
                      <p className={styles.tooltipText}>ציון ממוצע: {data.avgOverall}</p>
                    )}
                    {type === 'trueRating' && (
                      <div className={styles.tooltipTrueRatingWrapper}>
                        <p className={styles.tooltipTrueRatingTitle}>מדד איכות משוקלל: {data.trueRating}</p>
                        <p className={styles.tooltipTrueRatingDesc}>
                          דירוג המשקלל את ממוצע השיר מול הממוצע הכללי של השירים שלך ({data.userAverage}) כדי למנוע הטיות בשירים עם מעט מדרגים.
                        </p>
                      </div>
                    )}
                    {type === 'retention' && (
                      <p className={styles.tooltipRetentionText}>
                        ממוצע האזנה: {Math.floor(data.avgListenTime / 60)}:{String(data.avgListenTime % 60).padStart(2, '0')} דקות
                      </p>
                    )}
                    {type === 'categories' && (
                      <>
                        <p className={styles.tooltipCategoryText} style={{ color: '#f59e0b' }}>כללי: {data.avgOverall}</p>
                        <p className={styles.tooltipCategoryText} style={{ color: '#10b981' }}>שירה: {data.avgSinging}</p>
                        <p className={styles.tooltipCategoryText} style={{ color: '#1e3a8a' }}>הפקה: {data.avgProduction}</p>
                      </>
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
          {type === 'categories' && <Legend content={<CustomLegend />} />}

          {type !== 'categories' && (
            <Bar
              name={type === 'general' ? "ציון ממוצע" : type === 'trueRating' ? "מדד איכות" : "ממוצע האזנה"}
              dataKey={type === 'general' ? "avgOverall" : type === 'trueRating' ? "trueRating" : "avgListenTime"}
              fill="url(#colorRetentionGradient)"
              radius={[0, 4, 4, 0]}
              maxBarSize={100}
            />
          )}

          {type === 'categories' && (
            <>
              <Bar name="הפקה" dataKey="avgProduction" stackId="a" fill="#1e3a8a" maxBarSize={100} />
              <Bar name="שירה" dataKey="avgSinging" stackId="a" fill="#10b981" maxBarSize={100} />
              <Bar name="כללי" dataKey="avgOverall" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={100} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
