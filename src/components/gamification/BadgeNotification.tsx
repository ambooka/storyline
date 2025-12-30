"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Award } from "lucide-react";
import { useGamificationStore, Badge } from "@/stores/gamificationStore";
import styles from "./BadgeNotification.module.css";

export function BadgeNotification() {
    const { recentlyUnlocked, dismissBadgeNotification } = useGamificationStore();

    return (
        <AnimatePresence>
            {recentlyUnlocked && (
                <motion.div
                    className={styles.notification}
                    initial={{ opacity: 0, y: 100, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                    <div className={styles.glow} />

                    <button
                        className={styles.closeBtn}
                        onClick={dismissBadgeNotification}
                    >
                        <X size={16} />
                    </button>

                    <div className={styles.header}>
                        <Award size={20} />
                        <span>Badge Unlocked!</span>
                    </div>

                    <motion.div
                        className={styles.badgeIcon}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                    >
                        {recentlyUnlocked.icon}
                    </motion.div>

                    <h3 className={styles.badgeName}>{recentlyUnlocked.name}</h3>
                    <p className={styles.badgeDescription}>
                        {recentlyUnlocked.description}
                    </p>

                    <div className={styles.xpReward}>+25 XP</div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

interface BadgeCardProps {
    badge: Badge;
    locked?: boolean;
}

export function BadgeCard({ badge, locked = false }: BadgeCardProps) {
    return (
        <div className={`${styles.badgeCard} ${locked ? styles.badgeCardLocked : ""}`}>
            <div className={styles.badgeCardIcon}>
                {badge.icon}
            </div>
            <div className={styles.badgeCardInfo}>
                <h4>{badge.name}</h4>
                <p>{badge.description}</p>
            </div>
            {badge.unlockedAt && (
                <span className={styles.unlockedDate}>
                    {new Date(badge.unlockedAt).toLocaleDateString()}
                </span>
            )}
        </div>
    );
}
