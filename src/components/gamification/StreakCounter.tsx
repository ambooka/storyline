"use client";

import { motion } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";
import { useGamificationStore } from "@/stores/gamificationStore";
import styles from "./StreakCounter.module.css";

export function StreakCounter() {
    const { currentStreak, longestStreak } = useGamificationStore();

    return (
        <div className={styles.streakCounter}>
            <div className={styles.currentStreak}>
                <motion.div
                    className={styles.flameIcon}
                    animate={{
                        scale: currentStreak > 0 ? [1, 1.1, 1] : 1,
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 1.5
                    }}
                >
                    <Flame size={24} />
                </motion.div>
                <div className={styles.streakInfo}>
                    <span className={styles.streakNumber}>{currentStreak}</span>
                    <span className={styles.streakLabel}>day streak</span>
                </div>
            </div>

            <div className={styles.longestStreak}>
                <TrendingUp size={16} />
                <span>Best: {longestStreak} days</span>
            </div>
        </div>
    );
}
