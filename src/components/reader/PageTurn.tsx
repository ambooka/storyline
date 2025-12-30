"use client";

import { useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import styles from "./PageTurn.module.css";

interface PageTurnProps {
    children: ReactNode;
    onPrevious: () => void;
    onNext: () => void;
    animationStyle?: "slide" | "flip" | "fade" | "curl";
}

export function PageTurn({
    children,
    onPrevious,
    onNext,
    animationStyle = "slide"
}: PageTurnProps) {
    const [direction, setDirection] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleDragEnd = useCallback((
        _event: MouseEvent | TouchEvent | PointerEvent,
        info: PanInfo
    ) => {
        if (isAnimating) return;

        const threshold = 100;
        const velocity = info.velocity.x;
        const offset = info.offset.x;

        if (offset > threshold || velocity > 500) {
            setDirection(-1);
            setIsAnimating(true);
            setTimeout(() => {
                onPrevious();
                setIsAnimating(false);
            }, 300);
        } else if (offset < -threshold || velocity < -500) {
            setDirection(1);
            setIsAnimating(true);
            setTimeout(() => {
                onNext();
                setIsAnimating(false);
            }, 300);
        }
    }, [onPrevious, onNext, isAnimating]);

    // Animation variants based on style
    const variants = {
        slide: {
            enter: (dir: number) => ({
                x: dir > 0 ? "100%" : "-100%",
                opacity: 0,
            }),
            center: {
                x: 0,
                opacity: 1,
            },
            exit: (dir: number) => ({
                x: dir > 0 ? "-100%" : "100%",
                opacity: 0,
            }),
        },
        flip: {
            enter: (dir: number) => ({
                rotateY: dir > 0 ? 90 : -90,
                opacity: 0,
            }),
            center: {
                rotateY: 0,
                opacity: 1,
            },
            exit: (dir: number) => ({
                rotateY: dir > 0 ? -90 : 90,
                opacity: 0,
            }),
        },
        fade: {
            enter: {
                opacity: 0,
                scale: 0.98,
            },
            center: {
                opacity: 1,
                scale: 1,
            },
            exit: {
                opacity: 0,
                scale: 0.98,
            },
        },
        curl: {
            enter: (dir: number) => ({
                x: dir > 0 ? "50%" : "-50%",
                rotateY: dir > 0 ? 45 : -45,
                opacity: 0,
                transformOrigin: dir > 0 ? "left center" : "right center",
            }),
            center: {
                x: 0,
                rotateY: 0,
                opacity: 1,
            },
            exit: (dir: number) => ({
                x: dir > 0 ? "-50%" : "50%",
                rotateY: dir > 0 ? -45 : 45,
                opacity: 0,
                transformOrigin: dir > 0 ? "right center" : "left center",
            }),
        },
    };

    const selectedVariants = variants[animationStyle];

    return (
        <div className={styles.container}>
            <motion.div
                className={styles.page}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                custom={direction}
                variants={selectedVariants}
                initial="center"
                animate="center"
                exit="exit"
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8,
                }}
                style={{
                    perspective: animationStyle === "flip" || animationStyle === "curl" ? 1000 : undefined,
                }}
            >
                {children}
            </motion.div>

            {/* Page curl shadow effect */}
            {animationStyle === "curl" && isAnimating && (
                <div
                    className={styles.curlShadow}
                    style={{
                        left: direction > 0 ? "auto" : 0,
                        right: direction > 0 ? 0 : "auto",
                    }}
                />
            )}
        </div>
    );
}

// Simpler hook for page transitions
export function usePageAnimation() {
    const [pageKey, setPageKey] = useState(0);
    const [direction, setDirection] = useState(0);

    const goNext = useCallback(() => {
        setDirection(1);
        setPageKey((prev) => prev + 1);
    }, []);

    const goPrev = useCallback(() => {
        setDirection(-1);
        setPageKey((prev) => prev - 1);
    }, []);

    return { pageKey, direction, goNext, goPrev };
}
