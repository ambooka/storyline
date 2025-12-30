"use client";

import { ReactNode, HTMLAttributes } from "react";
import { motion } from "framer-motion";
import styles from "./Card.module.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    variant?: "flat" | "raised" | "outlined" | "glass";
    padding?: "none" | "sm" | "md" | "lg";
    hover?: boolean;
    clickable?: boolean;
}

/**
 * Reusable Card Component
 * Consistent card styling with variants.
 */
export function Card({
    children,
    variant = "flat",
    padding = "md",
    hover = false,
    clickable = false,
    className = "",
    ...props
}: CardProps) {
    const Component = hover || clickable ? motion.div : "div";

    return (
        <Component
            className={`${styles.card} ${styles[variant]} ${styles[`padding-${padding}`]} ${hover ? styles.hover : ""} ${clickable ? styles.clickable : ""} ${className}`}
            whileHover={hover || clickable ? { y: -4 } : undefined}
            whileTap={clickable ? { scale: 0.98 } : undefined}
            {...(props as any)}
        >
            {children}
        </Component>
    );
}

/**
 * Card Header
 */
export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
    return <div className={`${styles.header} ${className}`}>{children}</div>;
}

/**
 * Card Body
 */
export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
    return <div className={`${styles.body} ${className}`}>{children}</div>;
}

/**
 * Card Footer
 */
export function CardFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
    return <div className={`${styles.footer} ${className}`}>{children}</div>;
}
