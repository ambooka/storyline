"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, Share2, Copy, Check, Palette } from "lucide-react";
import html2canvas from "html2canvas";
import styles from "./QuoteCard.module.css";

interface QuoteCardProps {
    quote: string;
    bookTitle: string;
    author: string;
    onClose: () => void;
}

const THEMES = [
    { id: "dark", bg: "#0A0F1A", text: "#FFFFFF", accent: "#FF6B54" },
    { id: "light", bg: "#FDF8F3", text: "#1A1A1A", accent: "#FF6B54" },
    { id: "sepia", bg: "#F4ECD8", text: "#5B4636", accent: "#D4A574" },
    { id: "gradient1", bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", text: "#FFFFFF", accent: "#FFFFFF" },
    { id: "gradient2", bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", text: "#FFFFFF", accent: "#FFFFFF" },
    { id: "gradient3", bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", text: "#FFFFFF", accent: "#FFFFFF" },
];

export function QuoteCard({ quote, bookTitle, author, onClose }: QuoteCardProps) {
    const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(`"${quote}" — ${author}, ${bookTitle}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [quote, author, bookTitle]);

    const handleDownload = useCallback(async () => {
        if (!cardRef.current) return;

        setDownloading(true);
        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                backgroundColor: null,
                logging: false,
            });

            const link = document.createElement("a");
            link.download = `quote-${bookTitle.slice(0, 20)}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (error) {
            console.error("Failed to download:", error);
        } finally {
            setDownloading(false);
        }
    }, [bookTitle]);

    const handleShare = useCallback(async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Quote from Storyline",
                    text: `"${quote}" — ${author}, ${bookTitle}`,
                });
            } catch {
                handleCopy();
            }
        } else {
            handleCopy();
        }
    }, [quote, author, bookTitle, handleCopy]);

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className={styles.container}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Quote Card Preview */}
                <div
                    ref={cardRef}
                    className={styles.card}
                    style={{
                        background: selectedTheme.bg,
                        color: selectedTheme.text,
                    }}
                >
                    <div className={styles.quoteIcon} style={{ color: selectedTheme.accent }}>
                        "
                    </div>
                    <p className={styles.quoteText}>{quote}</p>
                    <div className={styles.attribution}>
                        <span className={styles.author}>— {author}</span>
                        <span className={styles.book}>{bookTitle}</span>
                    </div>
                    <div className={styles.branding} style={{ color: selectedTheme.accent }}>
                        Storyline
                    </div>
                </div>

                {/* Theme Selector */}
                <div className={styles.themeSelector}>
                    <Palette size={16} />
                    <span>Theme</span>
                    <div className={styles.themeOptions}>
                        {THEMES.map((theme) => (
                            <button
                                key={theme.id}
                                className={`${styles.themeButton} ${selectedTheme.id === theme.id ? styles.themeButtonActive : ""}`}
                                style={{ background: theme.bg }}
                                onClick={() => setSelectedTheme(theme)}
                            />
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button className={styles.actionButton} onClick={handleCopy}>
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                        {copied ? "Copied!" : "Copy"}
                    </button>
                    <button className={styles.actionButton} onClick={handleShare}>
                        <Share2 size={18} />
                        Share
                    </button>
                    <button
                        className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
                        onClick={handleDownload}
                        disabled={downloading}
                    >
                        <Download size={18} />
                        {downloading ? "Saving..." : "Download"}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
