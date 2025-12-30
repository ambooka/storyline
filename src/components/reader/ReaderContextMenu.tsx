"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Copy,
    Bookmark,
    Share2,
    MessageSquare,
    Highlighter,
    Volume2,
    Search,
    X,
} from "lucide-react";
import styles from "./ReaderContextMenu.module.css";

// Reaction emojis
const REACTIONS = ["🔥", "❤️", "🤯", "💡", "😢"];

interface ReaderContextMenuProps {
    position: { x: number; y: number } | null;
    selectedText: string;
    onClose: () => void;
    onCopy: () => void;
    onHighlight: (color: string) => void;
    onReact: (emoji: string) => void;
    onNote: () => void;
    onSpeak: () => void;
    onSearch: () => void;
    onShare: () => void;
    onBookmark: () => void;
}

export function ReaderContextMenu({
    position,
    selectedText,
    onClose,
    onCopy,
    onHighlight,
    onReact,
    onNote,
    onSpeak,
    onSearch,
    onShare,
    onBookmark,
}: ReaderContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [showColors, setShowColors] = useState(false);

    // Highlight colors
    const COLORS = [
        { name: "Yellow", value: "#FEF08A" },
        { name: "Green", value: "#86EFAC" },
        { name: "Blue", value: "#93C5FD" },
        { name: "Pink", value: "#F9A8D4" },
        { name: "Orange", value: "#FED7AA" },
    ];

    // Close on escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [onClose]);

    if (!position) return null;

    // Adjust position to stay within viewport
    const adjustedPosition = {
        x: Math.min(position.x, window.innerWidth - 280),
        y: Math.min(position.y, window.innerHeight - 300),
    };

    return (
        <motion.div
            ref={menuRef}
            className={styles.menu}
            style={{
                left: adjustedPosition.x,
                top: adjustedPosition.y,
            }}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.15 }}
        >
            {/* Selected text preview */}
            {selectedText && (
                <div className={styles.preview}>
                    <p>"{selectedText.slice(0, 60)}{selectedText.length > 60 ? "..." : ""}"</p>
                </div>
            )}

            {/* Reactions Row */}
            <div className={styles.reactionsRow}>
                {REACTIONS.map((emoji) => (
                    <button
                        key={emoji}
                        className={styles.reactionBtn}
                        onClick={() => {
                            onReact(emoji);
                            onClose();
                        }}
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            {/* Divider */}
            <div className={styles.divider} />

            {/* Actions */}
            <div className={styles.actions}>
                <button className={styles.actionBtn} onClick={() => { onSpeak(); onClose(); }}>
                    <Volume2 size={16} />
                    <span>Read Aloud</span>
                </button>

                <button className={styles.actionBtn} onClick={() => { onCopy(); onClose(); }}>
                    <Copy size={16} />
                    <span>Copy</span>
                </button>

                {/* Highlight with color picker */}
                <div className={styles.highlightWrapper}>
                    <button
                        className={`${styles.actionBtn} ${showColors ? styles.actionBtnActive : ""}`}
                        onClick={() => setShowColors(!showColors)}
                    >
                        <Highlighter size={16} />
                        <span>Highlight</span>
                    </button>

                    <AnimatePresence>
                        {showColors && (
                            <motion.div
                                className={styles.colorPicker}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                            >
                                {COLORS.map((color) => (
                                    <button
                                        key={color.name}
                                        className={styles.colorBtn}
                                        style={{ background: color.value }}
                                        onClick={() => {
                                            onHighlight(color.value);
                                            onClose();
                                        }}
                                        title={color.name}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button className={styles.actionBtn} onClick={() => { onNote(); onClose(); }}>
                    <MessageSquare size={16} />
                    <span>Add Note</span>
                </button>

                <button className={styles.actionBtn} onClick={() => { onBookmark(); onClose(); }}>
                    <Bookmark size={16} />
                    <span>Bookmark</span>
                </button>

                <button className={styles.actionBtn} onClick={() => { onSearch(); onClose(); }}>
                    <Search size={16} />
                    <span>Search</span>
                </button>

                <button className={styles.actionBtn} onClick={() => { onShare(); onClose(); }}>
                    <Share2 size={16} />
                    <span>Share Quote</span>
                </button>
            </div>
        </motion.div>
    );
}
