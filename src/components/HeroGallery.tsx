"use client";

import { useState, useEffect } from "react";
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

interface StatItem {
    genre: string | null;
    count: number;
}

const SLIDE_INTERVAL = 20000;         // interval between slides
const TRANSITION_DURATION = 0.3;      // duration of slide transition
const PIE_ANIMATION_DURATION = 1500;  // duration of pie animation
const MIN_PERCENTAGE = 0.07;          // ignore genres with less than 6% of the data

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

export default function HeroGallery() {
    const [stats, setStats] = useState<{
        songStats: StatItem[];
        userStats: StatItem[];
        engagementStats: StatItem[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const data = await getCommunityStats();
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
                setCurrentIndex((prev) => (prev + 1) % 3);
            }, SLIDE_INTERVAL);
            return () => clearInterval(timer);
        }
    }, [stats]);

    if (loading) {
        return (
            <div className={styles.galleryContainer} style={{ background: 'var(--card-bg)', borderRadius: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="animate-pulse text-gray-400">טוען נתונים...</div>
            </div>
        );
    }

    if (!stats) return null;

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

    const slides = [
        {
            id: 'songs',
            title: 'סגנון השירים המוביל בקהילה',
            data: filterSmallData(stats.songStats),
            colorOffset: 0
        },
        {
            id: 'users',
            title: 'סגנון המאזינים המוביל בקהילה',
            data: filterSmallData(stats.userStats),
            colorOffset: 2
        },
        {
            id: 'engagement',
            title: 'כמות הפידבקים לכל שיר',
            data: stats.engagementStats,
            colorOffset: 4
        }
    ].map(slide => {
        const roundedPercents = getRoundedPercentages(slide.data);
        return {
            ...slide,
            data: slide.data.map((item, idx) => ({
                ...item,
                exactPercent: roundedPercents[idx]
            }))
        };
    });

    const handleDotClick = (index: number) => {
        setCurrentIndex(index);
    };

    const handleChartClick = () => {
        setIsModalOpen(true);
    };

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
                        <h3 className={styles.chartTitle}>{slides[currentIndex].title}</h3>
                        <div className={styles.chartWrapper}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                    <Pie
                                        animationDuration={PIE_ANIMATION_DURATION}
                                        data={slides[currentIndex].data.map((entry, index) => ({
                                            ...entry,
                                            fill: COLORS[(index + slides[currentIndex].colorOffset) % COLORS.length]
                                        }))}
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
                                            const { cx, cy, midAngle, innerRadius, outerRadius, genre } = props;
                                            const RADIAN = Math.PI / 180;
                                            const inner = typeof innerRadius === 'string' ? parseFloat(innerRadius) : (innerRadius as number);
                                            const outer = typeof outerRadius === 'string' ? parseFloat(outerRadius) : (outerRadius as number);
                                            const radius = inner + (outer - inner) * 0.5;
                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                            return (
                                                <text
                                                    x={x}
                                                    y={y}
                                                    fill="white"
                                                    stroke="black"
                                                    strokeWidth="1.2px"
                                                    paintOrder="stroke"
                                                    textAnchor="middle"
                                                    dominantBaseline="central"
                                                    direction="rtl"
                                                    unicodeBidi="plaintext"
                                                    style={{
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        textShadow: '0px 0px 2px rgba(0,0,0,0.8)',
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    {slides[currentIndex].id === 'engagement' ? (
                                                        <>
                                                            <tspan x={x} dy="-0.5em">{`\u200e${props.payload.exactPercent}%\u200e`} מהשירים</tspan>
                                                            <tspan x={x} dy="1.2em">{genre === 'מעל 10' ? genre : `\u200e${genre}\u200e`} פידבקים</tspan>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <tspan x={x} dy="-0.5em">{genre}</tspan>
                                                            <tspan x={x} dy="1.2em">{`\u200e${props.payload.exactPercent}%\u200e`}</tspan>
                                                        </>
                                                    )}
                                                </text>
                                            );
                                        }}
                                        stroke="rgba(255, 255, 255, 0.2)"
                                        strokeWidth={1}
                                    >
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
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
