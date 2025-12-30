"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageCircle, RefreshCw, ThumbsUp, Loader2 } from "lucide-react";
import styles from "./AIDiscussionPrompts.module.css";

interface AIDiscussionPromptsProps {
    bookTitle: string;
    currentPassage: string;
    onSendToChat: (prompt: string) => void;
}

// Pre-defined prompts for when AI is not available
const FALLBACK_PROMPTS = [
    "What do you think the author meant by this passage?",
    "How does this scene relate to the main theme?",
    "What emotions does this passage evoke for you?",
    "Can you relate this to something in your own life?",
    "What do you predict will happen next?",
    "Who is your favorite character so far and why?",
    "What symbolism do you notice in this section?",
    "How would you feel if you were in the character's position?",
];

/**
 * AI-Powered Discussion Prompts
 * Generates thoughtful discussion questions based on the current passage.
 * Falls back to pre-defined prompts if AI is not available.
 */
export function AIDiscussionPrompts({
    bookTitle,
    currentPassage,
    onSendToChat,
}: AIDiscussionPromptsProps) {
    const [prompts, setPrompts] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // Generate prompts using AI or fallback
    const generatePrompts = useCallback(async () => {
        setLoading(true);

        try {
            // Try to use Gemini API
            const response = await fetch("/api/ai/discussion-prompts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookTitle, passage: currentPassage }),
            });

            if (response.ok) {
                const data = await response.json();
                setPrompts(data.prompts || FALLBACK_PROMPTS.slice(0, 3));
            } else {
                // Fallback to random pre-defined prompts
                const shuffled = [...FALLBACK_PROMPTS].sort(() => Math.random() - 0.5);
                setPrompts(shuffled.slice(0, 3));
            }
        } catch (error) {
            // Use fallback prompts
            const shuffled = [...FALLBACK_PROMPTS].sort(() => Math.random() - 0.5);
            setPrompts(shuffled.slice(0, 3));
        } finally {
            setLoading(false);
        }
    }, [bookTitle, currentPassage]);

    // Generate on first expand
    useEffect(() => {
        if (expanded && prompts.length === 0) {
            generatePrompts();
        }
    }, [expanded, prompts.length, generatePrompts]);

    return (
        <div className={styles.container}>
            <button
                className={`${styles.toggleBtn} ${expanded ? styles.toggleBtnActive : ""}`}
                onClick={() => setExpanded(!expanded)}
            >
                <Sparkles size={16} />
                Discussion Ideas
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        className={styles.promptsPanel}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className={styles.promptsHeader}>
                            <h4>💡 Discussion Starters</h4>
                            <button
                                className={styles.refreshBtn}
                                onClick={generatePrompts}
                                disabled={loading}
                            >
                                <RefreshCw size={14} className={loading ? styles.spinning : ""} />
                            </button>
                        </div>

                        {loading ? (
                            <div className={styles.loading}>
                                <Loader2 size={20} className={styles.spinning} />
                                <span>Generating prompts...</span>
                            </div>
                        ) : (
                            <ul className={styles.promptsList}>
                                {prompts.map((prompt, index) => (
                                    <motion.li
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <p>{prompt}</p>
                                        <button
                                            className={styles.sendBtn}
                                            onClick={() => onSendToChat(prompt)}
                                            title="Send to chat"
                                        >
                                            <MessageCircle size={14} />
                                        </button>
                                    </motion.li>
                                ))}
                            </ul>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
