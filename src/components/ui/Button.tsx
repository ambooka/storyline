"use client";

import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { motion, MotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "neumorphic" | "ghost" | "outline" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
}

/**
 * Reusable Button Component
 * Consistent styling across the app with variants and loading state.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = "primary",
            size = "md",
            isLoading = false,
            leftIcon,
            rightIcon,
            fullWidth = false,
            disabled,
            className = "",
            ...props
        },
        ref
    ) => {
        return (
            <motion.button
                ref={ref}
                className={`${styles.button} ${styles[variant]} ${styles[size]} ${fullWidth ? styles.fullWidth : ""} ${className}`}
                disabled={disabled || isLoading}
                whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
                whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
                {...(props as any)}
            >
                {isLoading ? (
                    <Loader2 size={size === "sm" ? 14 : size === "lg" ? 20 : 16} className={styles.spinner} />
                ) : leftIcon ? (
                    <span className={styles.icon}>{leftIcon}</span>
                ) : null}
                {children}
                {!isLoading && rightIcon && <span className={styles.icon}>{rightIcon}</span>}
            </motion.button>
        );
    }
);

Button.displayName = "Button";
