"use client";

import React from "react";
import styles from "./Avatar.module.css";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
type StatusType = "online" | "offline" | "busy" | "away";

interface AvatarProps {
    src?: string | null;
    alt?: string;
    name?: string;
    size?: AvatarSize;
    status?: StatusType;
    ring?: boolean;
    ringColor?: "accent" | "secondary";
    onClick?: () => void;
    className?: string;
}

/**
 * Get initials from a name
 */
function getInitials(name?: string): string {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0);
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0));
}

/**
 * Avatar Component
 * Displays user profile picture with fallback initials
 */
export function Avatar({
    src,
    alt,
    name,
    size = "md",
    status,
    ring = false,
    ringColor = "accent",
    onClick,
    className = "",
}: AvatarProps) {
    const [imageError, setImageError] = React.useState(false);

    const showFallback = !src || imageError;

    return (
        <div
            className={`
                ${styles.avatar} 
                ${styles[size]} 
                ${ring ? (ringColor === "secondary" ? styles.ringSecondary : styles.ring) : ""}
                ${onClick ? styles.clickable : ""}
                ${className}
            `}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {showFallback ? (
                <span className={styles.fallback}>
                    {getInitials(name)}
                </span>
            ) : (
                <img
                    src={src}
                    alt={alt || name || "Avatar"}
                    className={styles.image}
                    onError={() => setImageError(true)}
                />
            )}

            {status && (
                <span className={`${styles.status} ${styles[status]}`} />
            )}
        </div>
    );
}

/**
 * Avatar Group - Stack multiple avatars
 */
interface AvatarGroupProps {
    children: React.ReactNode;
    max?: number;
    size?: AvatarSize;
}

export function AvatarGroup({ children, max, size = "md" }: AvatarGroupProps) {
    const avatars = React.Children.toArray(children);
    const displayAvatars = max ? avatars.slice(0, max) : avatars;
    const remaining = max ? avatars.length - max : 0;

    return (
        <div className={styles.group}>
            {displayAvatars}
            {remaining > 0 && (
                <div className={`${styles.avatar} ${styles[size]} ${styles.groupCount}`}>
                    +{remaining}
                </div>
            )}
        </div>
    );
}

export default Avatar;
