"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Download, Share2, Palette, Type, Image } from "lucide-react";
import { QuoteCardStyle } from "@/lib/gamification";
import styles from "./QuoteCard.module.css";

interface QuoteCardGeneratorProps {
    quote: string;
    bookTitle: string;
    bookAuthor: string;
    bookCover?: string;
    chapter?: string;
    page?: number;
}

const STYLES: { id: QuoteCardStyle; name: string; colors: string[] }[] = [
    { id: "minimal", name: "Minimal", colors: ["#FFFFFF", "#1A1A1A"] },
    { id: "gradient", name: "Gradient", colors: ["#667eea", "#764ba2"] },
    { id: "paper", name: "Paper", colors: ["#F4ECD8", "#3D3426"] },
    { id: "modern", name: "Modern", colors: ["#0A0F1A", "#E5E7EB"] },
    { id: "dark", name: "Dark", colors: ["#1A1A1A", "#FFFFFF"] },
];

export default function QuoteCardGenerator({
    quote,
    bookTitle,
    bookAuthor,
    bookCover,
    chapter,
    page,
}: QuoteCardGeneratorProps) {
    const [selectedStyle, setSelectedStyle] = useState<QuoteCardStyle>("gradient");
    const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
    const cardRef = useRef<HTMLDivElement>(null);

    const getStyleClasses = () => {
        return `${styles.card} ${styles[`style${selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)}`]} ${styles[`font${fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}`]}`;
    };

    const handleDownload = async () => {
        if (!cardRef.current) return;

        // In production, use html2canvas or similar
        // For now, show alert
        alert("Download feature requires html2canvas. Card would be saved as PNG.");
    };

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({
                title: `Quote from "${bookTitle}"`,
                text: `"${quote}" — ${bookAuthor}, ${bookTitle}`,
            });
        } else {
            navigator.clipboard.writeText(`"${quote}" — ${bookAuthor}, ${bookTitle}`);
            alert("Quote copied to clipboard!");
        }
    };

    return (
        <div className={styles.generator}>
            {/* Preview Card */}
            <div className={styles.preview}>
                <div ref={cardRef} className={getStyleClasses()}>
                    <div className={styles.cardContent}>
                        <div className={styles.quoteMark}>"</div>
                        <p className={styles.quoteText}>{quote}</p>
                        <div className={styles.attribution}>
                            <div className={styles.bookInfo}>
                                <span className={styles.bookTitle}>{bookTitle}</span>
                                <span className={styles.bookAuthor}>by {bookAuthor}</span>
                                {(chapter || page) && (
                                    <span className={styles.location}>
                                        {chapter && `Chapter: ${chapter}`}
                                        {chapter && page && " • "}
                                        {page && `Page ${page}`}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className={styles.branding}>
                            <span className={styles.logo}>📖 Storyline</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className={styles.controls}>
                {/* Style Selector */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        <Palette size={16} />
                        Style
                    </label>
                    <div className={styles.styleOptions}>
                        {STYLES.map((style) => (
                            <button
                                key={style.id}
                                className={`${styles.styleBtn} ${selectedStyle === style.id ? styles.styleBtnActive : ""}`}
                                onClick={() => setSelectedStyle(style.id)}
                                style={{
                                    background: `linear-gradient(135deg, ${style.colors[0]}, ${style.colors[1]})`,
                                }}
                                title={style.name}
                            />
                        ))}
                    </div>
                </div>

                {/* Font Size */}
                <div className={styles.controlGroup}>
                    <label className={styles.controlLabel}>
                        <Type size={16} />
                        Size
                    </label>
                    <div className={styles.sizeOptions}>
                        {(["small", "medium", "large"] as const).map((size) => (
                            <button
                                key={size}
                                className={`${styles.sizeBtn} ${fontSize === size ? styles.sizeBtnActive : ""}`}
                                onClick={() => setFontSize(size)}
                            >
                                {size.charAt(0).toUpperCase() + size.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button className={styles.downloadBtn} onClick={handleDownload}>
                        <Download size={18} />
                        Download
                    </button>
                    <button className={styles.shareBtn} onClick={handleShare}>
                        <Share2 size={18} />
                        Share
                    </button>
                </div>
            </div>
        </div>
    );
}

// Compact Quote Card for display
interface QuoteCardDisplayProps {
    quote: string;
    bookTitle: string;
    bookAuthor: string;
    style?: QuoteCardStyle;
    onClick?: () => void;
}

export function QuoteCardDisplay({
    quote,
    bookTitle,
    bookAuthor,
    style = "gradient",
    onClick,
}: QuoteCardDisplayProps) {
    return (
        <motion.div
            className={`${styles.displayCard} ${styles[`style${style.charAt(0).toUpperCase() + style.slice(1)}`]}`}
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <p className={styles.displayQuote}>"{quote.slice(0, 100)}..."</p>
            <span className={styles.displayAuthor}>— {bookAuthor}</span>
        </motion.div>
    );
}
