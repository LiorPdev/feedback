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
  type?: "categories" | "retention" | "trueRating" | "overallCategories";
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
  const order = ['ציון לשיר', 'שירה', 'הפקה'];
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

interface ChartDataPoint {
  songTitle?: string;
  name?: string;
  value?: number;
  avgProduction?: number;
  avgSinging?: number;
  avgOverall?: number;
  avgListenTime?: number;
  trueRating?: number;
  userAverage?: number;
  feedbacksCount?: number;
  listenersCount?: number;
  color?: string;
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
        totalScoreAll += (fb.cat2 * WEIGHT_PRODUCTION + fb.cat3 * WEIGHT_SINGING + fb.overall * WEIGHT_OVERALL);
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
      .filter(Boolean);

    if (type === 'overallCategories') {
      let sumOverall = 0, sumCat2 = 0, sumCat3 = 0, totalCount = 0;
      songs.forEach(s => {
        const fbs = (s.feedbacks || []) as Feedback[];
        fbs.forEach(fb => {
          sumOverall += fb.overall || 0;
          sumCat2 += fb.cat2 || 0;
          sumCat3 += fb.cat3 || 0;
          totalCount++;
        });
      });

      if (totalCount === 0) return [];

      return [
        { category: 'הפקה', value: Math.round((sumCat2 / totalCount) * 10) / 10, fill: 'url(#gradientProduction)', feedbacksCount: totalCount },
        { category: 'שירה', value: Math.round((sumCat3 / totalCount) * 10) / 10, fill: 'url(#gradientSinging)', feedbacksCount: totalCount },
        { category: 'ציון לשיר', value: Math.round((sumOverall / totalCount) * 10) / 10, fill: 'url(#gradientOverall)', feedbacksCount: totalCount },
      ];
    }

    return baseData.sort((a, b) => {
      if (!a || !b) return 0;
      if (type === 'trueRating') return b.trueRating - a.trueRating;
      if (type === 'retention') return b.avgListenTime - a.avgListenTime;
      if (type === 'categories') {
        // For stacked bars, sort by the total height (sum of categories)
        const totalA = a.avgProduction + a.avgSinging + a.avgOverall;
        const totalB = b.avgProduction + b.avgSinging + b.avgOverall;
        return totalB - totalA;
      }
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
          layout={type === 'overallCategories' ? 'horizontal' : 'vertical'}
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          barCategoryGap={type === 'overallCategories' ? "20%" : "10%"}
        >
          <defs>
            <linearGradient id="colorRetentionGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity={1} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="gradientProduction" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="gradientSinging" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="gradientOverall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={type === 'overallCategories'} vertical={type !== 'overallCategories'} stroke="#f0f0f0" />
          {type === 'overallCategories' ? (
            <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontWeight: 600 }} />
          ) : (
            <XAxis
              type="number"
              domain={[0, 'dataMax']}
              ticks={undefined}
              allowDecimals={true}
              tick={false}
              axisLine={false}
              tickLine={false}
            />
          )}

          {type === 'overallCategories' ? (
            <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={false} width={0} />
          ) : (
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
          )}

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
                    {type === 'overallCategories' && (
                      <p className={styles.tooltipText}>{data.category}: {data.value}</p>
                    )}
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
                    {type === 'categories' && (
                      <>
                        <p className={styles.tooltipCategoryText} style={{ color: '#f59e0b' }}>ציון לשיר: {data.avgOverall}</p>
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

          {type === 'overallCategories' ? (
            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={120} />
          ) : (
            type !== 'categories' && (
              <Bar
                name={type === 'trueRating' ? "מדד איכות" : "ממוצע האזנה"}
                dataKey={type === 'trueRating' ? "trueRating" : "avgListenTime"}
                fill="url(#colorRetentionGradient)"
                radius={[0, 4, 4, 0]}
                maxBarSize={100}
              />
            )
          )}

          {type === 'categories' && (
            <>
              <Bar name="הפקה" dataKey="avgProduction" stackId="a" fill="#1e3a8a" maxBarSize={100} />
              <Bar name="שירה" dataKey="avgSinging" stackId="a" fill="#10b981" maxBarSize={100} />
              <Bar name="ציון לשיר" dataKey="avgOverall" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={100} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
