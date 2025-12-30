"use client";

import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import styles from "./IconButton.module.css";

type IconButtonSize = "sm" | "md" | "lg";
type IconButtonVariant = "ghost" | "neumorphic" | "solid" | "outline";
type IconButtonShape = "circle" | "square";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: ReactNode;
    size?: IconButtonSize;
    variant?: IconButtonVariant;
    shape?: IconButtonShape;
    isLoading?: boolean;
    badge?: number | string;
    "aria-label": string;
}

/**
 * IconButton Component
 * Compact button for icon-only actions
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    (
        {
            icon,
            size = "md",
            variant = "ghost",
            shape = "circle",
            isLoading = false,
            badge,
            disabled,
            className = "",
            ...props
        },
        ref
    ) => {
        const iconSize = size === "sm" ? 16 : size === "lg" ? 24 : 20;

        return (
            <motion.button
                ref={ref}
                className={`
                    ${styles.iconButton}
                    ${styles[size]}
                    ${styles[variant]}
                    ${styles[shape]}
                    ${className}
                `}
                disabled={disabled || isLoading}
                whileHover={!disabled && !isLoading ? { scale: 1.05 } : undefined}
                whileTap={!disabled && !isLoading ? { scale: 0.95 } : undefined}
                {...(props as any)}
            >
                {isLoading ? (
                    <Loader2 size={iconSize} className={styles.spinner} />
                ) : (
                    icon
                )}

                {badge !== undefined && (
                    <span className={styles.badge}>
                        {typeof badge === "number" && badge > 99 ? "99+" : badge}
                    </span>
                )}
            </motion.button>
        );
    }
);

IconButton.displayName = "IconButton";

export default IconButton;
