"use client";

import React from "react";
import { X } from "lucide-react";
import styles from "./Badge.module.css";

type BadgeSize = "sm" | "md" | "lg";
type BadgeVariant = "solid" | "soft" | "outline";
type BadgeColor = "accent" | "secondary" | "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
    children: React.ReactNode;
    size?: BadgeSize;
    variant?: BadgeVariant;
    color?: BadgeColor;
    dot?: boolean;
    pulse?: boolean;
    onRemove?: () => void;
    className?: string;
}

/**
 * Badge Component
 * For status indicators, tags, and labels
 */
export function Badge({
    children,
    size = "md",
    variant = "solid",
    color = "accent",
    dot = false,
    pulse = false,
    onRemove,
    className = "",
}: BadgeProps) {
    return (
        <span
            className={`
                ${styles.badge}
                ${styles[size]}
                ${styles[variant]}
                ${styles[color]}
                ${pulse ? styles.pulse : ""}
                ${className}
            `}
        >
            {dot && <span className={`${styles.dot} ${styles[color]}`} />}
            {children}
            {onRemove && (
                <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={onRemove}
                    aria-label="Remove"
                >
                    <X size={size === "sm" ? 10 : size === "lg" ? 14 : 12} />
                </button>
            )}
        </span>
    );
}

export default Badge;
