"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, BookOpen, MessageCircle, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import styles from "./ActivityFeed.module.css";

type ActivityType = "reading" | "reaction" | "comment" | "challenge" | "joined";

interface FeedItem {
    id: string;
    type: ActivityType;
    userId: string;
    userName: string;
    userAvatar?: string;
    message: string;
    timestamp: Date;
    bookTitle?: string;
    emoji?: string;
}

interface ActivityFeedProps {
    items: FeedItem[];
    limit?: number;
}

/**
 * Activity Feed
 * Shows what friends and group members are doing.
 */
export function ActivityFeed({ items, limit = 10 }: ActivityFeedProps) {
    const [expanded, setExpanded] = useState(false);

    const getActivityIcon = (type: ActivityType) => {
        switch (type) {
            case "reading": return BookOpen;
            case "reaction": return Activity;
            case "comment": return MessageCircle;
            case "challenge": return Trophy;
            default: return Activity;
        }
    };

    const getTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return "just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const displayItems = items.slice(0, limit);

    return (
        <div className={styles.container}>
            <button
                className={`${styles.toggleBtn} ${expanded ? styles.toggleBtnActive : ""}`}
                onClick={() => setExpanded(!expanded)}
            >
                <Activity size={16} />
                Activity
                {items.length > 0 && <span className={styles.badge}>{items.length}</span>}
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        className={styles.feed}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {displayItems.length === 0 ? (
                            <p className={styles.empty}>No recent activity</p>
                        ) : (
                            <div className={styles.feedList}>
                                {displayItems.map((item) => {
                                    const Icon = getActivityIcon(item.type);
                                    return (
                                        <motion.div
                                            key={item.id}
                                            className={styles.feedItem}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                        >
                                            <div className={styles.avatar}>
                                                {item.userAvatar ? (
                                                    <img src={item.userAvatar} alt="" />
                                                ) : (
                                                    <span>{item.userName.charAt(0)}</span>
                                                )}
                                                <div className={styles.iconBadge}>
                                                    {item.emoji ? (
                                                        <span>{item.emoji}</span>
                                                    ) : (
                                                        <Icon size={10} />
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.itemContent}>
                                                <p>
                                                    <strong>{item.userName}</strong> {item.message}
                                                    {item.bookTitle && (
                                                        <span className={styles.bookTitle}> "{item.bookTitle}"</span>
                                                    )}
                                                </p>
                                                <span className={styles.timestamp}>{getTimeAgo(item.timestamp)}</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
