"use client";

import { motion } from "framer-motion";
import {
    BookOpen,
    Clock,
    Flame,
    Trophy,
    TrendingUp,
    Calendar,
    Target,
    Zap
} from "lucide-react";
import { useGamificationStore } from "@/stores/gamificationStore";
import { XPBar } from "@/components/gamification/XPBar";
import { StreakCounter } from "@/components/gamification/StreakCounter";
import { BadgeCard } from "@/components/gamification/BadgeNotification";
import styles from "./ReadingStats.module.css";

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subValue?: string;
    color?: string;
}

function StatCard({ icon, label, value, subValue, color }: StatCardProps) {
    return (
        <motion.div
            className={styles.statCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
        >
            <div className={styles.statIcon} style={{ background: color }}>
                {icon}
            </div>
            <div className={styles.statInfo}>
                <span className={styles.statValue}>{value}</span>
                <span className={styles.statLabel}>{label}</span>
                {subValue && <span className={styles.statSubValue}>{subValue}</span>}
            </div>
        </motion.div>
    );
}

export function ReadingStats() {
    const { level, xp, stats, badges, currentStreak, longestStreak } = useGamificationStore();

    // Calculate reading pace
    const daysActive = Math.max(1, Math.floor((Date.now() - (stats.totalTimeMinutes / 1440)) / 86400000));
    const pagesPerDay = Math.round(stats.totalPagesRead / daysActive);

    // Format time
    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className={styles.statsContainer}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1>Reading Stats</h1>
                    <p>Your reading journey at a glance</p>
                </div>
                <div className={styles.levelBadge}>
                    <Trophy size={16} />
                    Level {level}
                </div>
            </div>

            {/* XP Progress */}
            <XPBar />

            {/* Streak */}
            <StreakCounter />

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <StatCard
                    icon={<BookOpen size={20} />}
                    label="Books Finished"
                    value={stats.totalBooksFinished}
                    subValue={stats.totalBooksFinished > 0 ? "Keep going!" : "Start your first book"}
                    color="linear-gradient(135deg, #FF6B54, #FF8A7A)"
                />
                <StatCard
                    icon={<Target size={20} />}
                    label="Pages Read"
                    value={stats.totalPagesRead.toLocaleString()}
                    subValue={`~${pagesPerDay} pages/day`}
                    color="linear-gradient(135deg, #4FACFE, #00F2FE)"
                />
                <StatCard
                    icon={<Clock size={20} />}
                    label="Time Reading"
                    value={formatTime(stats.totalTimeMinutes)}
                    subValue={`Longest: ${formatTime(stats.longestSession)}`}
                    color="linear-gradient(135deg, #667EEA, #764BA2)"
                />
                <StatCard
                    icon={<Zap size={20} />}
                    label="Total XP"
                    value={xp.toLocaleString()}
                    subValue={`Level ${level} reader`}
                    color="linear-gradient(135deg, #F093FB, #F5576C)"
                />
                <StatCard
                    icon={<Flame size={20} />}
                    label="Best Streak"
                    value={`${longestStreak} days`}
                    subValue={currentStreak > 0 ? `Current: ${currentStreak} days` : "Start a streak!"}
                    color="linear-gradient(135deg, #FA709A, #FEE140)"
                />
                <StatCard
                    icon={<Calendar size={20} />}
                    label="Favorite Genre"
                    value={stats.favoriteGenre || "Explore"}
                    subValue="Based on reading time"
                    color="linear-gradient(135deg, #11998E, #38EF7D)"
                />
            </div>

            {/* Reading Goals */}
            <div className={styles.goalsSection}>
                <h2>
                    <TrendingUp size={20} />
                    Reading Goals
                </h2>
                <div className={styles.goalCards}>
                    <div className={styles.goalCard}>
                        <div className={styles.goalProgress}>
                            <svg viewBox="0 0 36 36" className={styles.progressRing}>
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="var(--color-border)"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="var(--color-accent)"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeDasharray={`${Math.min(100, (stats.totalBooksFinished / 12) * 100)}, 100`}
                                />
                            </svg>
                            <span className={styles.goalPercent}>
                                {stats.totalBooksFinished}/12
                            </span>
                        </div>
                        <div className={styles.goalInfo}>
                            <h3>Yearly Goal</h3>
                            <p>Books this year</p>
                        </div>
                    </div>

                    <div className={styles.goalCard}>
                        <div className={styles.goalProgress}>
                            <svg viewBox="0 0 36 36" className={styles.progressRing}>
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="var(--color-border)"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#22C55E"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeDasharray={`${Math.min(100, (currentStreak / 7) * 100)}, 100`}
                                />
                            </svg>
                            <span className={styles.goalPercent}>
                                {currentStreak}/7
                            </span>
                        </div>
                        <div className={styles.goalInfo}>
                            <h3>Weekly Streak</h3>
                            <p>Days in a row</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Badges */}
            <div className={styles.badgesSection}>
                <h2>
                    <Trophy size={20} />
                    Achievements ({badges.length})
                </h2>
                {badges.length === 0 ? (
                    <div className={styles.emptyBadges}>
                        <Trophy size={40} />
                        <p>Start reading to unlock badges!</p>
                    </div>
                ) : (
                    <div className={styles.badgesGrid}>
                        {badges.map((badge) => (
                            <BadgeCard key={badge.id} badge={badge} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
