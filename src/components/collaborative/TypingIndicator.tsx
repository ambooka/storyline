"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./TypingIndicator.module.css";

interface TypingUser {
    id: string;
    name: string;
}

interface TypingIndicatorProps {
    typingUsers: TypingUser[];
}

/**
 * Typing Indicator
 * Shows animated dots when other users are typing in chat.
 */
export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
    if (typingUsers.length === 0) return null;

    const getTypingText = () => {
        if (typingUsers.length === 1) {
            return `${typingUsers[0].name} is typing`;
        } else if (typingUsers.length === 2) {
            return `${typingUsers[0].name} and ${typingUsers[1].name} are typing`;
        } else {
            return `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing`;
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                className={styles.container}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
            >
                <div className={styles.dots}>
                    <span className={styles.dot} style={{ animationDelay: "0ms" }} />
                    <span className={styles.dot} style={{ animationDelay: "150ms" }} />
                    <span className={styles.dot} style={{ animationDelay: "300ms" }} />
                </div>
                <span className={styles.text}>{getTypingText()}</span>
            </motion.div>
        </AnimatePresence>
    );
}
