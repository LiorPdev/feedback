"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { getCommunityStats } from "@/app/actions/stats";
import { logAction } from "@/app/actions/logs";
import UserPreferencesModal from "./UserPreferencesModal";
import styles from "./HeroGallery.module.css";

const COLORS = [
    '#6366f1BF', // Indigo
    '#ec4899BF', // Pink
    '#f59e0bBF', // Amber
    '#10b981BF', // Emerald
    '#3b82f6BF', // Blue
    '#8b5cf6BF', // Violet
    '#f43f5eBF', // Rose
    '#06b6d4BF', // Cyan
];

// Extracted to avoid creating new objects on every render
const PIE_LABEL_STYLE = {
    fontSize: '0.8rem',
    fontWeight: 700,
    textShadow: '0px 0px 2px rgba(0,0,0,0.8)',
    pointerEvents: 'none' as const
};

export interface StatItem {
    genre: string | null;
    count: number;
    exactPercent?: number;
}

export interface CommunityStats {
    songStats: StatItem[];
    userStats: StatItem[];
    engagementStats: StatItem[];
    averageListenTime: number;
}

type Slide = {
    id: string;
    title: string;
    data?: StatItem[];
    value?: number;
    colorOffset: number;
};

const SLIDE_INTERVAL = 20000;         // interval between slides
const TRANSITION_DURATION = 0.3;      // duration of slide transition
const PIE_ANIMATION_DURATION = 900;   // duration of pie animation
const MIN_PERCENTAGE = 0.07;          // ignore genres with less than 6% of the data

let cachedStats: CommunityStats | null = null;

function formatTime(minutes: number) {
    const totalSeconds = Math.round(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getRoundedPercentages(data: StatItem[]) {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return [];

    const floats = data.map(item => (item.count / total) * 100);
    const rounded = floats.map(f => Math.floor(f));
    const diff = 100 - rounded.reduce((a, b) => a + b, 0);

    const withIndices = floats.map((f, i) => ({
        fraction: f - Math.floor(f),
        index: i
    })).sort((a, b) => b.fraction - a.fraction);

    for (let i = 0; i < diff; i++) {
        rounded[withIndices[i].index]++;
    }
    return rounded;
}

export default function HeroGallery({ initialData }: { initialData?: CommunityStats | null }) {
    const [stats, setStats] = useState<CommunityStats | null>(initialData || cachedStats);
    const [loading, setLoading] = useState(!initialData && !cachedStats);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const data = await getCommunityStats();
                cachedStats = data;
                setStats(data);
            } catch (error) {
                logAction({ message: "Failed to fetch stats", data: error, source: "HeroGallery" });
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        if (stats) {
            const timer = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % 4);
            }, SLIDE_INTERVAL);
            return () => clearInterval(timer);
        }
    }, [stats, currentIndex]);

    const slides: Slide[] = useMemo(() => {
        if (!stats) return [];

        const filterSmallData = (data: StatItem[]) => {
            const total = data.reduce((sum, item) => sum + item.count, 0);
            if (total === 0) return [];

            const mainItems = data.filter(item =>
                (item.count / total) >= MIN_PERCENTAGE &&
                item.genre !== 'אחר' &&
                item.genre !== null
            );

            const othersCount = data
                .filter(item =>
                    (item.count / total) < MIN_PERCENTAGE ||
                    item.genre === 'אחר' ||
                    item.genre === null
                )
                .reduce((sum, item) => sum + item.count, 0);

            if (othersCount > 0) {
                return [...mainItems, { genre: 'אחר', count: othersCount }];
            }
            return mainItems;
        };

        return [
            {
                id: 'songs',
                title: 'התפלגות סגנונות השירים בקהילה',
                data: filterSmallData(stats.songStats),
                colorOffset: 0
            },
            {
                id: 'users',
                title: 'התפלגות סגנונות המאזינים בקהילה',
                data: filterSmallData(stats.userStats),
                colorOffset: 2
            },
            {
                id: 'engagement',
                title: 'כמה פידבקים מקבלים השירים בקהילה?',
                data: stats.engagementStats,
                colorOffset: 4
            },
            {
                id: 'listenTime',
                title: 'ממוצע זמן האזנה לשיר בקהילה',
                value: stats.averageListenTime,
                colorOffset: 6
            }
        ].map(slide => {
            if (slide.data) {
                const roundedPercents = getRoundedPercentages(slide.data);
                return {
                    ...slide,
                    data: slide.data.map((item, idx) => ({
                        ...item,
                        exactPercent: roundedPercents[idx],
                        fill: COLORS[(idx + slide.colorOffset) % COLORS.length]
                    }))
                };
            }
            return slide;
        });
    }, [stats]);

    const handleDotClick = useCallback((index: number) => {
        setCurrentIndex(index);
    }, []);

    const handleChartClick = useCallback(() => {
        setIsModalOpen(true);
    }, []);

    if (loading) {
        return (
            <div className={styles.galleryContainer} style={{ background: 'var(--card-bg)', borderRadius: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="animate-pulse text-gray-400">טוען נתונים...</div>
            </div>
        );
    }

    if (!stats) return null;

    const currentSlide = slides[currentIndex];

    return (
        <div className={styles.galleryContainer}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: TRANSITION_DURATION }}
                    className={styles.chartSlideWrapper}
                >
                    <div className={styles.chartContainer} onClick={handleChartClick}>
                        <h3 className={styles.chartTitle}>{currentSlide.title}</h3>
                        <div className={styles.chartWrapper}>
                            {currentSlide.id === 'listenTime' ? (
                                <div className={styles.statsValueWrapper}>
                                    <div className={styles.statsValue}>
                                        {formatTime(currentSlide.value || 0)}
                                    </div>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                        <Pie
                                            animationDuration={PIE_ANIMATION_DURATION}
                                            data={currentSlide.data || []}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="50%"
                                            outerRadius="98%"
                                            paddingAngle={5}
                                            dataKey="count"
                                            nameKey="genre"
                                            labelLine={false}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            label={(props: any) => {
                                                const { cx, cy, midAngle, innerRadius, outerRadius, genre, payload } = props;
                                                const RADIAN = Math.PI / 180;
                                                const inner = typeof innerRadius === 'string' ? parseFloat(innerRadius) : (innerRadius as number);
                                                const outer = typeof outerRadius === 'string' ? parseFloat(outerRadius) : (outerRadius as number);
                                                const radius = inner + (outer - inner) * 0.5;
                                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                                const isEngagement = currentSlide.id === 'engagement';
                                                const line1 = genre;
                                                const line2 = isEngagement
                                                    ? `${payload.exactPercent}% מהשירים`
                                                    : `${payload.exactPercent}%`;

                                                return (
                                                    <g>
                                                        <text
                                                            x={x}
                                                            y={y - 8}
                                                            fill="white"
                                                            stroke="black"
                                                            strokeWidth="1.2px"
                                                            paintOrder="stroke"
                                                            textAnchor="middle"
                                                            dominantBaseline="central"
                                                            style={PIE_LABEL_STYLE}
                                                        >
                                                            {line1}
                                                        </text>
                                                        <text
                                                            x={x}
                                                            y={y + 10}
                                                            fill="white"
                                                            stroke="black"
                                                            strokeWidth="1.2px"
                                                            paintOrder="stroke"
                                                            textAnchor="middle"
                                                            dominantBaseline="central"
                                                            style={PIE_LABEL_STYLE}
                                                        >
                                                            {line2}
                                                        </text>
                                                    </g>
                                                );
                                            }}
                                            stroke="rgba(255, 255, 255, 0.2)"
                                            strokeWidth={1}
                                        >
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            <div className={styles.galleryDots}>
                {slides.map((_, idx) => (
                    <button
                        key={idx}
                        className={`${styles.dot} ${currentIndex === idx ? styles.dotActive : ""}`}
                        onClick={() => handleDotClick(idx)}
                        aria-label={`הצג גרף ${idx + 1}`}
                    />
                ))}
            </div>

            <UserPreferencesModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}
