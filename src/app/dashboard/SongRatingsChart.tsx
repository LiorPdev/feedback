"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Legend
} from 'recharts';

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
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '24px',
      marginTop: '20px',
      direction: 'rtl',
      flexWrap: 'wrap'
    }}>
      {sortedPayload.map((entry, index) => (
        <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '14px',
            height: '14px',
            backgroundColor: entry.color,
            borderRadius: '3px'
          }} />
          <span style={{ fontSize: '14px', color: '#444', fontWeight: 700 }}>{entry.value}</span>
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
    // 1. Calculate the user's personal average rating across all their songs/feedbacks
    // This serves as the "anchor" (C) for the Bayesian formula to compare songs against each other.
    let totalScoreAll = 0;
    let totalReviewsAll = 0;

    songs.forEach(s => {
      const fbs = (s.feedbacks || []) as Feedback[];
      fbs.forEach(fb => {
        totalScoreAll += (fb.cat2 + fb.cat3 + fb.overall);
        totalReviewsAll += 3;
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
          ? (fbs.reduce((sum, fb) => sum + fb.cat2 + fb.cat3 + fb.overall, 0) / (count * 3))
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
          averageRating: Math.round(avgOverall * 10) / 10,
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
      .filter(Boolean) as {
        songTitle: string;
        averageRating: number;
        avgProduction: number;
        avgSinging: number;
        avgOverall: number;
        avgListenTime: number;
        trueRating: number;
        userAverage: number;
        feedbacksCount: number;
        listenersCount: number;
      }[];
  }, [songs, globalAverage, minThreshold]);

  if (chartData.length === 0) return null;

  const chartHeight = Math.max(isMobile ? 200 : 300, Math.min(400, chartData.length * (isMobile ? 50 : 80)));

  return (
    <div style={{ direction: 'ltr', width: '100%', height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: isMobile ? 10 : 50,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="colorRatingGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity={1} />
              <stop offset="100%" stopColor="var(--brand-hover)" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="colorRetentionGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0891b2" stopOpacity={1} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="colorTrueRatingGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={type === 'categories' || type === 'retention' ? [0, 'dataMax'] : [0, 5]}
            ticks={type === 'general' || type === 'trueRating' ? [0, 1, 2, 3, 4, 5] : undefined}
            allowDecimals={true}
            tick={type === 'general' || type === 'trueRating'}
          />
          <YAxis
            dataKey="songTitle"
            type="category"
            width={isMobile ? 55 : 80}
            interval={0}
            tickLine={false}
            tick={(props) => {
              const { x, y, payload } = props;
              const name = payload.value;
              const limit = isMobile ? 10 : 18;

              if (name.length <= limit) {
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={-2}
                      y={0}
                      dy={4}
                      textAnchor="start"
                      fill="#333"
                      fontSize={isMobile ? 9 : 12}
                      fontWeight={500}
                      style={{ direction: 'rtl' }}
                    >
                      {name}
                    </text>
                  </g>
                );
              }

              // Robust split logic for RTL and word-safety
              const mid = Math.floor(name.length / 2);
              let splitIdx = name.lastIndexOf(' ', limit);

              // If no space before limit, try any space closest to middle
              if (splitIdx === -1) {
                const spaceBeforeMid = name.lastIndexOf(' ', mid);
                const spaceAfterMid = name.indexOf(' ', mid);
                if (spaceBeforeMid !== -1) splitIdx = spaceBeforeMid;
                else if (spaceAfterMid !== -1) splitIdx = spaceAfterMid;
                else splitIdx = mid; // Fallback to character split
              }

              const line1 = name.substring(0, splitIdx).trim();
              const line2 = name.substring(splitIdx).trim();
              const truncated2 = line2.length > limit ? line2.substring(0, limit - 2) + '..' : line2;

              return (
                <g transform={`translate(${x},${y})`}>
                  <text
                    x={-4}
                    y={0}
                    textAnchor="start"
                    fill="#333"
                    fontSize={isMobile ? 9 : 12}
                    fontWeight={500}
                    style={{ direction: 'rtl' }}
                  >
                    <tspan x={-4} dy="-0.5em">{line1}</tspan>
                    <tspan x={-4} dy="1.2em">{truncated2}</tspan>
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
                  <div style={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    padding: isMobile ? '10px' : '12px',
                    borderRadius: '8px',
                    direction: 'rtl',
                    maxWidth: isMobile ? '220px' : '300px',
                    fontSize: isMobile ? '13px' : '15px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: '1.6',
                    pointerEvents: 'none'
                  }}>
                    <p style={{ margin: '0 0 5px', fontWeight: 'bold' }}>{data.songTitle}</p>
                    {type === 'general' && (
                      <p style={{ margin: '0 0 5px' }}>ציון ממוצע: {data.averageRating}</p>
                    )}
                    {type === 'trueRating' && (
                      <div style={{ marginBottom: '10px' }}>
                        <p style={{ margin: '0 0 2px', color: '#4f46e5', fontWeight: 'bold' }}>מדד איכות משוקלל: {data.trueRating}</p>
                        <p style={{ margin: '0', fontSize: '0.85em', color: '#666', lineHeight: 1.6 }}>
                          זהו דירוג המשקלל את ממוצע השיר מול הממוצע הכללי של השירים שלך ({data.userAverage}) כדי למנוע הטיות בשירים עם מעט מדרגים.
                        </p>
                      </div>
                    )}
                    {type === 'retention' && (
                      <p style={{ margin: '0 0 5px', color: '#0891b2', fontWeight: 'bold' }}>מדד האזנה: {data.avgListenTime} שניות</p>
                    )}
                    {type === 'categories' && (
                      <>
                        <p style={{ margin: '0 0 2px', color: '#f59e0b' }}>כללי: {data.avgOverall}</p>
                        <p style={{ margin: '0 0 2px', color: '#10b981' }}>שירה: {data.avgSinging}</p>
                        <p style={{ margin: '0 0 5px', color: '#1e3a8a' }}>הפקה: {data.avgProduction}</p>
                      </>
                    )}
                    <p style={{ margin: '0', fontSize: '0.85em', color: '#666' }}>
                      {type === 'retention' ? `סה"כ האזנות שחושבו: ${data.listenersCount}` : `מספר מדרגים: ${data.feedbacksCount}`}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          {type === 'categories' && <Legend content={<CustomLegend />} />}

          {type === 'general' && (
            <Bar
              name="ציון ממוצע"
              dataKey="averageRating"
              fill="url(#colorRetentionGradient)"
              radius={[0, 4, 4, 0]}
              maxBarSize={isMobile ? 40 : 70}
            />
          )}

          {type === 'trueRating' && (
            <Bar
              name="מדד איכות"
              dataKey="trueRating"
              fill="url(#colorRetentionGradient)"
              radius={[0, 4, 4, 0]}
              maxBarSize={isMobile ? 40 : 70}
            />
          )}

          {type === 'retention' && (
            <Bar
              name="מדד האזנה"
              dataKey="avgListenTime"
              fill="url(#colorRetentionGradient)"
              radius={[0, 4, 4, 0]}
              maxBarSize={isMobile ? 40 : 70}
            />
          )}

          {type === 'categories' && (
            <>
              <Bar name="הפקה" dataKey="avgProduction" stackId="a" fill="#1e3a8a" maxBarSize={70} />
              <Bar name="שירה" dataKey="avgSinging" stackId="a" fill="#10b981" maxBarSize={70} />
              <Bar name="כללי" dataKey="avgOverall" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={70} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
