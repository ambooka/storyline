"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, RefreshCw, BookOpen } from "lucide-react";
import styles from "./AISummary.module.css";

interface AISummaryProps {
    bookTitle: string;
    bookId: string;
    groupProgress: number;
    passages: string[];
    onRequestSummary?: () => void;
}

/**
 * AI Summary for Latecomers
 * Generates a quick catch-up summary of what the group has read.
 */
export function AISummary({
    bookTitle,
    bookId,
    groupProgress,
    passages,
}: AISummaryProps) {
    const [summary, setSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showSummary, setShowSummary] = useState(false);

    const generateSummary = useCallback(async () => {
        setLoading(true);
        setShowSummary(true);

        try {
            const response = await fetch("/api/ai/summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookTitle,
                    passages: passages.slice(-5), // Last 5 passages
                    progress: groupProgress,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setSummary(data.summary);
            } else {
                setSummary(getFallbackSummary(groupProgress));
            }
        } catch (error) {
            setSummary(getFallbackSummary(groupProgress));
        } finally {
            setLoading(false);
        }
    }, [bookTitle, passages, groupProgress]);

    const getFallbackSummary = (progress: number) => {
        return `The group has read ${progress}% of "${bookTitle}". Join them to continue the story together!`;
    };

    return (
        <div className={styles.container}>
            <button
                className={styles.catchUpBtn}
                onClick={generateSummary}
            >
                <Sparkles size={16} />
                Catch Up with AI
            </button>

            <AnimatePresence>
                {showSummary && (
                    <motion.div
                        className={styles.summaryPanel}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                    >
                        <div className={styles.summaryHeader}>
                            <div className={styles.headerLeft}>
                                <BookOpen size={16} />
                                <h4>Quick Catch-Up</h4>
                            </div>
                            <button
                                className={styles.refreshBtn}
                                onClick={generateSummary}
                                disabled={loading}
                            >
                                <RefreshCw size={14} className={loading ? styles.spinning : ""} />
                            </button>
                        </div>

                        <div className={styles.progressInfo}>
                            <span>Group Progress</span>
                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${groupProgress}%` }}
                                />
                            </div>
                            <span>{groupProgress}%</span>
                        </div>

                        {loading ? (
                            <div className={styles.loading}>
                                <Loader2 size={24} className={styles.spinning} />
                                <p>Generating summary...</p>
                            </div>
                        ) : summary ? (
                            <div className={styles.summaryContent}>
                                <p>{summary}</p>
                            </div>
                        ) : null}

                        <button
                            className={styles.closeBtn}
                            onClick={() => setShowSummary(false)}
                        >
                            Close
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
