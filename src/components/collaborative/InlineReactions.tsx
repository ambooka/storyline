"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./InlineReactions.module.css";

interface WordReaction {
    id: string;
    userId: string;
    userName: string;
    emoji: string;
    word: string;
    position: number; // Word index in passage
    timestamp: number;
}

interface InlineReactionsProps {
    reactions: WordReaction[];
    onAddReaction: (word: string, position: number, emoji: string) => void;
}

const QUICK_REACTIONS = ["❤️", "😮", "🤔", "😂", "🔥"];

/**
 * Inline Reactions
 * Click any word to add an emoji reaction that others can see.
 */
export function InlineReactions({ reactions, onAddReaction }: InlineReactionsProps) {
    const [selectedWord, setSelectedWord] = useState<{ word: string; position: number } | null>(null);
    const [pickerPosition, setPickerPosition] = useState<{ x: number; y: number } | null>(null);

    const handleWordClick = useCallback((e: React.MouseEvent, word: string, position: number) => {
        e.stopPropagation();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setPickerPosition({ x: rect.left, y: rect.top - 50 });
        setSelectedWord({ word, position });
    }, []);

    const handleReact = useCallback((emoji: string) => {
        if (selectedWord) {
            onAddReaction(selectedWord.word, selectedWord.position, emoji);
            setSelectedWord(null);
            setPickerPosition(null);
        }
    }, [selectedWord, onAddReaction]);

    const handleClose = useCallback(() => {
        setSelectedWord(null);
        setPickerPosition(null);
    }, []);

    // Get reactions for a specific word position
    const getWordReactions = (position: number) =>
        reactions.filter((r) => r.position === position);

    return (
        <>
            {/* Reaction picker */}
            <AnimatePresence>
                {pickerPosition && (
                    <motion.div
                        className={styles.picker}
                        style={{ left: pickerPosition.x, top: pickerPosition.y }}
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    >
                        <div className={styles.pickerContent}>
                            {QUICK_REACTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    className={styles.emojiBtn}
                                    onClick={() => handleReact(emoji)}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        <div className={styles.pickerArrow} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backdrop to close picker */}
            {pickerPosition && (
                <div className={styles.backdrop} onClick={handleClose} />
            )}
        </>
    );
}

/**
 * Helper component to wrap text with clickable words
 */
export function ReactableText({
    text,
    reactions,
    onWordClick,
}: {
    text: string;
    reactions: WordReaction[];
    onWordClick: (e: React.MouseEvent, word: string, position: number) => void;
}) {
    const words = text.split(/(\s+)/);

    return (
        <span className={styles.reactableText}>
            {words.map((word, index) => {
                if (word.match(/^\s+$/)) return word;

                const wordReactions = reactions.filter((r) => r.position === Math.floor(index / 2));

                return (
                    <span
                        key={index}
                        className={`${styles.word} ${wordReactions.length > 0 ? styles.hasReactions : ""}`}
                        onClick={(e) => onWordClick(e, word, Math.floor(index / 2))}
                    >
                        {word}
                        {wordReactions.length > 0 && (
                            <span className={styles.wordReactions}>
                                {wordReactions.slice(0, 3).map((r) => (
                                    <span key={r.id} className={styles.miniReaction} title={r.userName}>
                                        {r.emoji}
                                    </span>
                                ))}
                                {wordReactions.length > 3 && (
                                    <span className={styles.moreReactions}>+{wordReactions.length - 3}</span>
                                )}
                            </span>
                        )}
                    </span>
                );
            })}
        </span>
    );
}
