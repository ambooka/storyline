"use client";

import { motion, AnimatePresence } from "framer-motion";
import styles from "./ReactionPicker.module.css";

const REACTIONS = [
    { emoji: "🔥", label: "Fire" },
    { emoji: "❤️", label: "Love" },
    { emoji: "🤯", label: "Mind Blown" },
    { emoji: "💡", label: "Insight" },
    { emoji: "😢", label: "Sad" },
] as const;

export type ReactionEmoji = typeof REACTIONS[number]["emoji"];

interface ReactionPickerProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onSelect: (emoji: ReactionEmoji) => void;
    onClose: () => void;
}

export default function ReactionPicker({
    isOpen,
    position,
    onSelect,
    onClose,
}: ReactionPickerProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop to close picker */}
                    <div className={styles.backdrop} onClick={onClose} />

                    {/* Picker */}
                    <motion.div
                        className={styles.picker}
                        style={{
                            left: position.x,
                            top: position.y,
                        }}
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                        {REACTIONS.map((reaction, index) => (
                            <motion.button
                                key={reaction.emoji}
                                className={styles.reactionBtn}
                                onClick={() => {
                                    onSelect(reaction.emoji);
                                    onClose();
                                }}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: index * 0.03 }}
                                whileHover={{ scale: 1.3 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <span className={styles.emoji}>{reaction.emoji}</span>
                            </motion.button>
                        ))}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Reaction Display Component
interface ReactionDisplayProps {
    reactions: { emoji: string; count: number }[];
    onReactionClick?: (emoji: string) => void;
}

export function ReactionDisplay({ reactions, onReactionClick }: ReactionDisplayProps) {
    if (reactions.length === 0) return null;

    return (
        <div className={styles.reactionDisplay}>
            {reactions.map((r) => (
                <motion.button
                    key={r.emoji}
                    className={styles.reactionBadge}
                    onClick={() => onReactionClick?.(r.emoji)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <span>{r.emoji}</span>
                    <span className={styles.reactionCount}>{r.count}</span>
                </motion.button>
            ))}
        </div>
    );
}
