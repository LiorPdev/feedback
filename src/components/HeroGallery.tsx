"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, ResponsiveContainer } from "recharts";
import { getCommunityStats } from "@/app/actions/stats";
import { logAction } from "@/app/actions/logs";
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

export default function HeroGallery() {
    const [stats, setStats] = useState<{
        songStats: StatItem[];
        userStats: StatItem[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

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
            }, 10000);
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
        return data.filter(item => (item.count / total) >= 0.03);
    };

    const slides = [
        {
            id: 'songs',
            title: 'סגנונות השירים בקהילה',
            data: filterSmallData(stats.songStats),
            colorOffset: 0
        },
        {
            id: 'users',
            title: 'סגנונות המאזינים בקהילה',
            data: filterSmallData(stats.userStats),
            colorOffset: 2
        }
    ];

    const handleDotClick = (index: number) => {
        setCurrentIndex(index);
    };

    return (
        <div className={styles.galleryContainer}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.5 }}
                    className={styles.chartSlideWrapper}
                >
                    <div className={styles.chartContainer}>
                        <h3 className={styles.chartTitle}>{slides[currentIndex].title}</h3>
                        <div className={styles.chartWrapper} style={{ pointerEvents: 'none' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                    <Pie
                                        data={slides[currentIndex].data.map((entry, index) => ({
                                            ...entry,
                                            fill: COLORS[(index + slides[currentIndex].colorOffset) % COLORS.length]
                                        }))}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="50%"
                                        outerRadius="95%"
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
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
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
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
