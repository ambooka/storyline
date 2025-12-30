"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play,
    Pause,
    Users,
    BookOpen,
    MessageCircle,
    Sparkles,
    Volume2,
} from "lucide-react";
import styles from "./SyncReading.module.css";

interface SyncReadingProps {
    roomId: string;
    isHost: boolean;
    isSynced: boolean;
    hostPosition: number;
    onToggleSync: () => void;
    onFollowHost: () => void;
}

/**
 * Sync Reading Mode
 * Allows a host to control the reading pace for all participants.
 * Participants can choose to follow along or read independently.
 */
export function SyncReading({
    roomId,
    isHost,
    isSynced,
    hostPosition,
    onToggleSync,
    onFollowHost,
}: SyncReadingProps) {
    const [isReading, setIsReading] = useState(false);

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {isHost ? (
                // Host controls
                <div className={styles.hostControls}>
                    <span className={styles.hostLabel}>
                        <BookOpen size={14} />
                        Leading the group
                    </span>
                    <button
                        className={`${styles.syncBtn} ${isReading ? styles.syncBtnActive : ""}`}
                        onClick={() => setIsReading(!isReading)}
                    >
                        {isReading ? <Pause size={18} /> : <Play size={18} />}
                        {isReading ? "Pause" : "Start"} Group Reading
                    </button>
                </div>
            ) : (
                // Participant controls
                <div className={styles.participantControls}>
                    <button
                        className={`${styles.followBtn} ${isSynced ? styles.followBtnActive : ""}`}
                        onClick={onToggleSync}
                    >
                        <Users size={16} />
                        {isSynced ? "Following Host" : "Read Independently"}
                    </button>
                    {!isSynced && (
                        <button className={styles.catchUpBtn} onClick={onFollowHost}>
                            Jump to host position
                        </button>
                    )}
                </div>
            )}

            {/* Progress indicator */}
            <div className={styles.progressBar}>
                <div
                    className={styles.progressFill}
                    style={{ width: `${hostPosition}%` }}
                />
                <span className={styles.progressLabel}>{Math.round(hostPosition)}%</span>
            </div>
        </motion.div>
    );
}
