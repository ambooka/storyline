"use client";

import { motion } from "framer-motion";
import styles from "./LoadingStates.module.css";

/**
 * Skeleton Loader - Book Card
 */
export function BookCardSkeleton() {
    return (
        <div className={styles.bookCard}>
            <div className={`${styles.skeleton} ${styles.cover}`} />
            <div className={styles.info}>
                <div className={`${styles.skeleton} ${styles.title}`} />
                <div className={`${styles.skeleton} ${styles.author}`} />
            </div>
        </div>
    );
}

/**
 * Skeleton Loader - Reading Room Card
 */
export function RoomCardSkeleton() {
    return (
        <div className={styles.roomCard}>
            <div className={`${styles.skeleton} ${styles.roomHeader}`} />
            <div className={styles.roomContent}>
                <div className={`${styles.skeleton} ${styles.roomTitle}`} />
                <div className={`${styles.skeleton} ${styles.roomMeta}`} />
            </div>
            <div className={`${styles.skeleton} ${styles.roomAvatars}`} />
        </div>
    );
}

/**
 * Skeleton Grid - Multiple items
 */
export function SkeletonGrid({ count = 6, type = "book" }: { count?: number; type?: "book" | "room" }) {
    const Skeleton = type === "book" ? BookCardSkeleton : RoomCardSkeleton;
    return (
        <div className={type === "book" ? styles.bookGrid : styles.roomGrid}>
            {Array(count).fill(0).map((_, i) => (
                <Skeleton key={i} />
            ))}
        </div>
    );
}

/**
 * Full Page Loader
 */
export function PageLoader({ message = "Loading..." }: { message?: string }) {
    return (
        <div className={styles.pageLoader}>
            <motion.div
                className={styles.loaderRing}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p>{message}</p>
        </div>
    );
}

/**
 * Inline Spinner
 */
export function Spinner({ size = 20 }: { size?: number }) {
    return (
        <motion.div
            className={styles.spinner}
            style={{ width: size, height: size }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
    );
}

/**
 * Shimmer effect component
 */
export function Shimmer({ width = "100%", height = 20 }: { width?: string | number; height?: number }) {
    return (
        <div
            className={`${styles.skeleton} ${styles.shimmer}`}
            style={{ width, height }}
        />
    );
}
