"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { getCommunityStats } from "@/app/actions/stats";
import { logAction } from "@/app/actions/logs";
import UserPreferencesModal from "./UserPreferencesModal";
import styles from "./HeroGallery.module.css";

const COLORS = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#f43f5e', // Rose
    '#06b6d4', // Cyan
];

interface StatItem {
    genre: string | null;
    count: number;
}

const SLIDE_INTERVAL = 13000;         // interval between slides
const TRANSITION_DURATION = 0.3;      // duration of slide transition
const PIE_ANIMATION_DURATION = 1500;  // duration of pie animation
const MIN_PERCENTAGE = 0.07;          // ignore genres with less than 6% of the data

export default function HeroGallery() {
    const [stats, setStats] = useState<{
        songStats: StatItem[];
        userStats: StatItem[];
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
                setCurrentIndex((prev) => (prev + 1) % 2);
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
        }
    ];

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
                                            const { cx, cy, midAngle, innerRadius, outerRadius, genre, percent } = props;
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
                                                    strokeWidth="0.7px"
                                                    paintOrder="stroke"
                                                    textAnchor="middle"
                                                    dominantBaseline="central"
                                                    style={{
                                                        fontSize: '0.7rem',
                                                        fontWeight: 600,
                                                        textShadow: '0px 0px 4px rgba(0,0,0,0.5)',
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    {`${genre} ${(percent * 100).toFixed(0)}%`}
                                                </text>
                                            );
                                        }}
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
