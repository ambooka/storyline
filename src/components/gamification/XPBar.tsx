"use client";

import { motion } from "framer-motion";
import { useGamificationStore } from "@/stores/gamificationStore";
import styles from "./XPBar.module.css";

export function XPBar() {
    const { xp, level, xpToNextLevel } = useGamificationStore();

    // Calculate progress percentage
    const currentLevelXP = level * level * 100;
    const previousLevelXP = (level - 1) * (level - 1) * 100;
    const xpInCurrentLevel = xp - previousLevelXP;
    const xpNeededForLevel = currentLevelXP - previousLevelXP;
    const progressPercent = (xpInCurrentLevel / xpNeededForLevel) * 100;

    return (
        <div className={styles.xpBar}>
            <div className={styles.levelBadge}>
                <span className={styles.levelNumber}>{level}</span>
            </div>

            <div className={styles.progressContainer}>
                <div className={styles.progressTrack}>
                    <motion.div
                        className={styles.progressFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </div>
                <div className={styles.xpText}>
                    <span>{xp.toLocaleString()} XP</span>
                    <span className={styles.xpToNext}>
                        {xpToNextLevel.toLocaleString()} to Level {level + 1}
                    </span>
                </div>
            </div>
        </div>
    );
}
