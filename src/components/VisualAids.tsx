"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    useAccessibilityStore,
    useScreenRuler,
    getColorFilterCSS,
} from "@/lib/accessibility";
import styles from "./VisualAids.module.css";

// ========== Screen Ruler Component ==========
export function ScreenRuler() {
    const { enabled, position, height } = useScreenRuler();

    if (!enabled) return null;

    return (
        <div className={styles.screenRuler}>
            {/* Top dim overlay */}
            <div
                className={styles.rulerDim}
                style={{
                    top: 0,
                    height: position.y - height / 2,
                }}
            />
            {/* Visible strip */}
            <div
                className={styles.rulerStrip}
                style={{
                    top: position.y - height / 2,
                    height: height,
                }}
            />
            {/* Bottom dim overlay */}
            <div
                className={styles.rulerDim}
                style={{
                    top: position.y + height / 2,
                    bottom: 0,
                }}
            />
        </div>
    );
}

// ========== Line Focus Component ==========
interface LineFocusProps {
    activeLineTop: number;
    activeLineHeight: number;
}

export function LineFocus({ activeLineTop, activeLineHeight }: LineFocusProps) {
    const { lineFocusEnabled, lineFocusDimAmount } = useAccessibilityStore();

    if (!lineFocusEnabled) return null;

    return (
        <div className={styles.lineFocus}>
            {/* Top dim overlay */}
            <div
                className={styles.lineFocusDim}
                style={{
                    top: 0,
                    height: activeLineTop,
                    opacity: lineFocusDimAmount,
                }}
            />
            {/* Bottom dim overlay */}
            <div
                className={styles.lineFocusDim}
                style={{
                    top: activeLineTop + activeLineHeight,
                    bottom: 0,
                    opacity: lineFocusDimAmount,
                }}
            />
        </div>
    );
}

// ========== Color Filter Overlay ==========
export function ColorFilterOverlay() {
    const { colorFilter } = useAccessibilityStore();

    if (colorFilter === "none") return null;

    return (
        <div
            className={styles.colorFilter}
            style={{
                filter: getColorFilterCSS(colorFilter),
            }}
        />
    );
}

// ========== TTS Word Highlight Component ==========
interface TTSHighlightProps {
    text: string;
    currentWordIndex: number;
    className?: string;
}

export function TTSHighlight({ text, currentWordIndex, className }: TTSHighlightProps) {
    const [highlightPosition, setHighlightPosition] = useState<{
        start: number;
        end: number;
    } | null>(null);

    useEffect(() => {
        if (currentWordIndex < 0) {
            setHighlightPosition(null);
            return;
        }

        // Find word boundaries
        let wordStart = currentWordIndex;
        let wordEnd = currentWordIndex;

        // Find start of word
        while (wordStart > 0 && text[wordStart - 1] !== " ") {
            wordStart--;
        }

        // Find end of word
        while (wordEnd < text.length && text[wordEnd] !== " ") {
            wordEnd++;
        }

        setHighlightPosition({ start: wordStart, end: wordEnd });
    }, [currentWordIndex, text]);

    if (!highlightPosition) {
        return <span className={className}>{text}</span>;
    }

    const before = text.slice(0, highlightPosition.start);
    const highlighted = text.slice(highlightPosition.start, highlightPosition.end);
    const after = text.slice(highlightPosition.end);

    return (
        <span className={className}>
            {before}
            <motion.span
                className={styles.ttsHighlight}
                initial={{ backgroundColor: "rgba(212, 165, 116, 0)" }}
                animate={{ backgroundColor: "rgba(212, 165, 116, 0.4)" }}
                transition={{ duration: 0.1 }}
            >
                {highlighted}
            </motion.span>
            {after}
        </span>
    );
}

// ========== Focus Indicator for Keyboard Navigation ==========
interface FocusIndicatorProps {
    element: HTMLElement | null;
}

export function FocusIndicator({ element }: FocusIndicatorProps) {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (!element) {
            setRect(null);
            return;
        }

        const updateRect = () => {
            setRect(element.getBoundingClientRect());
        };

        updateRect();
        window.addEventListener("resize", updateRect);
        window.addEventListener("scroll", updateRect);

        return () => {
            window.removeEventListener("resize", updateRect);
            window.removeEventListener("scroll", updateRect);
        };
    }, [element]);

    if (!rect) return null;

    return (
        <motion.div
            className={styles.focusIndicator}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
                position: "fixed",
                left: rect.left - 4,
                top: rect.top - 4,
                width: rect.width + 8,
                height: rect.height + 8,
            }}
        />
    );
}

// ========== Accessibility Status Bar ==========
export function AccessibilityStatusBar() {
    const {
        ttsEnabled,
        screenRulerEnabled,
        lineFocusEnabled,
        colorFilter,
        useDyslexicFont,
    } = useAccessibilityStore();

    const activeFeatures = [
        ttsEnabled && "TTS",
        screenRulerEnabled && "Ruler",
        lineFocusEnabled && "Line Focus",
        colorFilter !== "none" && colorFilter,
        useDyslexicFont && "Dyslexic Font",
    ].filter(Boolean);

    if (activeFeatures.length === 0) return null;

    return (
        <motion.div
            className={styles.statusBar}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <span className={styles.statusIcon}>♿</span>
            <span className={styles.statusText}>
                Active: {activeFeatures.join(", ")}
            </span>
        </motion.div>
    );
}
