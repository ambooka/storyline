"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
    TrendingUp,
    Clock,
    Zap,
    Award,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import styles from "./ReadingAnalytics.module.css";

interface ParticipantStats {
    id: string;
    name: string;
    avatar?: string;
    pagesRead: number;
    readingSpeed: number; // words per minute
    timeSpent: number; // minutes
    currentPosition: number;
}

interface ReadingAnalyticsProps {
    participants: ParticipantStats[];
    totalPages: number;
    sessionDuration: number; // minutes
}

/**
 * Reading Analytics
 * Shows reading pace and statistics for all participants.
 */
export function ReadingAnalytics({
    participants,
    totalPages,
    sessionDuration,
}: ReadingAnalyticsProps) {
    const [expanded, setExpanded] = useState(false);

    // Calculate group stats
    const groupStats = useMemo(() => {
        const avgSpeed = participants.reduce((sum, p) => sum + p.readingSpeed, 0) / participants.length || 0;
        const avgProgress = participants.reduce((sum, p) => sum + p.currentPosition, 0) / participants.length || 0;
        const fastestReader = participants.reduce((fastest, p) =>
            p.readingSpeed > (fastest?.readingSpeed || 0) ? p : fastest, participants[0]);
        const mostAhead = participants.reduce((ahead, p) =>
            p.currentPosition > (ahead?.currentPosition || 0) ? p : ahead, participants[0]);

        return { avgSpeed, avgProgress, fastestReader, mostAhead };
    }, [participants]);

    // Speed categories
    const getSpeedCategory = (speed: number) => {
        if (speed >= 300) return { label: "Speed Reader", color: "#22C55E", icon: Zap };
        if (speed >= 200) return { label: "Fast", color: "#3B82F6", icon: TrendingUp };
        if (speed >= 150) return { label: "Average", color: "#F59E0B", icon: Clock };
        return { label: "Relaxed", color: "#8B5CF6", icon: Clock };
    };

    return (
        <div className={styles.container}>
            <button
                className={styles.toggleBtn}
                onClick={() => setExpanded(!expanded)}
            >
                <TrendingUp size={16} />
                Reading Analytics
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expanded && (
                <motion.div
                    className={styles.panel}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                >
                    {/* Group Overview */}
                    <div className={styles.groupStats}>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Avg Speed</span>
                            <span className={styles.statValue}>{Math.round(groupStats.avgSpeed)} wpm</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Group Progress</span>
                            <span className={styles.statValue}>{Math.round(groupStats.avgProgress)}%</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Session Time</span>
                            <span className={styles.statValue}>{sessionDuration}m</span>
                        </div>
                    </div>

                    {/* Progress comparison */}
                    <div className={styles.progressComparison}>
                        <h4>Reading Progress</h4>
                        <div className={styles.progressBars}>
                            {participants.map((p) => (
                                <div key={p.id} className={styles.participantProgress}>
                                    <div className={styles.progressInfo}>
                                        <div className={styles.participantName}>
                                            {p.avatar ? (
                                                <img src={p.avatar} alt="" />
                                            ) : (
                                                <span className={styles.avatar}>{p.name.charAt(0)}</span>
                                            )}
                                            {p.name}
                                        </div>
                                        <span className={styles.progressPercent}>{p.currentPosition}%</span>
                                    </div>
                                    <div className={styles.progressBar}>
                                        <motion.div
                                            className={styles.progressFill}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${p.currentPosition}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Speed leaderboard */}
                    <div className={styles.leaderboard}>
                        <h4>Speed Comparison</h4>
                        <div className={styles.speedList}>
                            {participants
                                .sort((a, b) => b.readingSpeed - a.readingSpeed)
                                .map((p, index) => {
                                    const category = getSpeedCategory(p.readingSpeed);
                                    return (
                                        <div key={p.id} className={styles.speedItem}>
                                            <span className={styles.rank}>#{index + 1}</span>
                                            <div className={styles.speedInfo}>
                                                <span className={styles.speedName}>{p.name}</span>
                                                <span
                                                    className={styles.speedBadge}
                                                    style={{ backgroundColor: `${category.color}20`, color: category.color }}
                                                >
                                                    <category.icon size={12} />
                                                    {category.label}
                                                </span>
                                            </div>
                                            <span className={styles.speedValue}>{p.readingSpeed} wpm</span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
