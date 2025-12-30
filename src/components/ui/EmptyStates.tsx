"use client";

import { motion } from "framer-motion";
import { BookOpen, Users, Search, Plus, Wifi, WifiOff, Upload, RefreshCw } from "lucide-react";
import styles from "./EmptyStates.module.css";

type EmptyStateType = "books" | "clubs" | "search" | "rooms" | "offline" | "error";

interface EmptyStateProps {
    type: EmptyStateType;
    title?: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const DEFAULT_CONFIG: Record<EmptyStateType, { icon: typeof BookOpen; title: string; description: string }> = {
    books: {
        icon: BookOpen,
        title: "No books yet",
        description: "Import your first book to start reading",
    },
    clubs: {
        icon: Users,
        title: "No clubs joined",
        description: "Join or create a club to read with friends",
    },
    search: {
        icon: Search,
        title: "No results found",
        description: "Try adjusting your search or filters",
    },
    rooms: {
        icon: Users,
        title: "No active rooms",
        description: "Create a reading room to read together",
    },
    offline: {
        icon: WifiOff,
        title: "You're offline",
        description: "Your books are still available for reading",
    },
    error: {
        icon: RefreshCw,
        title: "Failed to load",
        description: "Something went wrong. Please try again.",
    },
};

/**
 * Empty State Component
 * Shows friendly messages when there's no content to display.
 */
export function EmptyState({ type, title, description, action }: EmptyStateProps) {
    const config = DEFAULT_CONFIG[type];
    const Icon = config.icon;

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className={`${styles.iconWrapper} ${styles[type]}`}>
                <Icon size={32} />
            </div>
            <h3>{title || config.title}</h3>
            <p>{description || config.description}</p>
            {action && (
                <button className={styles.actionBtn} onClick={action.onClick}>
                    {type === "books" && <Upload size={16} />}
                    {type === "clubs" && <Plus size={16} />}
                    {type === "rooms" && <Plus size={16} />}
                    {type === "error" && <RefreshCw size={16} />}
                    {action.label}
                </button>
            )}
        </motion.div>
    );
}

/**
 * Offline Banner
 * Shows when the user is offline.
 */
export function OfflineBanner({ isOnline }: { isOnline: boolean }) {
    if (isOnline) return null;

    return (
        <motion.div
            className={styles.offlineBanner}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
        >
            <WifiOff size={16} />
            <span>You're offline. Some features may be unavailable.</span>
        </motion.div>
    );
}

/**
 * Connection Status Indicator
 */
export function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
    return (
        <div className={`${styles.connectionStatus} ${isConnected ? styles.connected : styles.disconnected}`}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isConnected ? "Connected" : "Reconnecting..."}</span>
        </div>
    );
}
