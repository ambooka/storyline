"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    BookOpen,
    Download,
    Bookmark,
    BookmarkCheck,
    ExternalLink,
    Loader2,
    CheckCircle,
    AlertCircle,
} from "lucide-react";
import styles from "./BookCard.module.css";

// ============ Types ============

export interface BookCardProps {
    id: string;
    title: string;
    author?: string | null;
    cover?: string | null;
    source?: string;
    formats?: { mimeType: string }[];
    downloadUrl?: string | null;
    previewUrl?: string | null;
    downloadCount?: number;
    progress?: number;

    // State
    downloadState?: 'idle' | 'downloading' | 'success' | 'error';
    isSaved?: boolean;

    // Callbacks
    onDownload?: () => void;
    onSave?: () => void;
    onClick?: () => void;

    // Variants
    variant?: 'default' | 'compact' | 'horizontal';
    showActions?: boolean;
}

// ============ Component ============

export function BookCard({
    id,
    title,
    author,
    cover,
    source,
    formats = [],
    downloadUrl,
    previewUrl,
    downloadCount,
    progress,
    downloadState = 'idle',
    isSaved = false,
    onDownload,
    onSave,
    onClick,
    variant = 'default',
    showActions = true,
}: BookCardProps) {
    const hasEpub = formats.some(f => f.mimeType?.includes('epub'));
    const hasPdf = formats.some(f => f.mimeType?.includes('pdf'));
    const hasDirectDownload = !!downloadUrl;

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDownload?.();
    };

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSave?.();
    };

    const getSourceLabel = (src?: string) => {
        switch (src) {
            case 'gutenberg': return '📖 Gutenberg';
            case 'openlibrary': return '📗 OpenLib';
            case 'internetarchive': return '🏛️ Archive';
            case 'standardebooks': return '📚 Standard';
            default: return src;
        }
    };

    return (
        <motion.article
            className={`${styles.card} ${variant !== 'default' ? styles[variant] : ''}`}
            onClick={onClick}
            whileTap={{ scale: 0.98 }}
            data-testid={`book-card-${id}`}
        >
            {/* Cover */}
            <div className={styles.coverWrapper}>
                {cover ? (
                    <img
                        src={cover}
                        alt={title}
                        className={styles.cover}
                        loading="lazy"
                    />
                ) : (
                    <div className={styles.placeholder}>
                        <BookOpen className={styles.placeholderIcon} size={32} />
                        <span className={styles.placeholderTitle}>{title}</span>
                    </div>
                )}

                {/* Badges */}
                <div className={styles.badges}>
                    {source && (
                        <span className={styles.sourceBadge}>
                            {getSourceLabel(source)}
                        </span>
                    )}
                    <div className={styles.formatBadges}>
                        {hasEpub && <span className={`${styles.formatBadge} ${styles.epub}`}>EPUB</span>}
                        {hasPdf && <span className={`${styles.formatBadge} ${styles.pdf}`}>PDF</span>}
                    </div>
                </div>

                {/* Actions Overlay */}
                {showActions && (
                    <div className={styles.overlay}>
                        <div className={styles.actions}>
                            {hasDirectDownload && (
                                <button
                                    className={`${styles.actionBtn} ${styles.downloadBtn} ${downloadState === 'success' ? styles.success : ''} ${downloadState === 'error' ? styles.error : ''}`}
                                    onClick={handleDownload}
                                    disabled={downloadState === 'downloading'}
                                    aria-label={`Download ${title}`}
                                >
                                    {downloadState === 'downloading' ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : downloadState === 'success' ? (
                                        <><CheckCircle size={14} /> Done</>
                                    ) : downloadState === 'error' ? (
                                        <><AlertCircle size={14} /> Retry</>
                                    ) : (
                                        <><Download size={14} /> Get</>
                                    )}
                                </button>
                            )}

                            {previewUrl && (
                                <a
                                    href={previewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${styles.actionBtn} ${styles.previewBtn}`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink size={14} /> View
                                </a>
                            )}

                            {onSave && (
                                <button
                                    className={`${styles.actionBtn} ${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
                                    onClick={handleSave}
                                    aria-label={isSaved ? 'Remove from saved' : 'Save book'}
                                >
                                    {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className={styles.info}>
                <h3 className={styles.title}>{title}</h3>
                {author && <p className={styles.author}>{author}</p>}

                <div className={styles.meta}>
                    {typeof progress === 'number' && progress > 0 && (
                        <div className={styles.progress}>
                            <div
                                className={styles.progressBar}
                                style={{ width: `${Math.min(progress * 100, 100)}%` }}
                            />
                        </div>
                    )}

                    {downloadCount && downloadCount > 0 && (
                        <span className={styles.downloads}>
                            {downloadCount.toLocaleString()} downloads
                        </span>
                    )}
                </div>
            </div>
        </motion.article>
    );
}

// ============ Skeleton ============

export function BookCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
    return (
        <div className={`${styles.card} ${variant !== 'default' ? styles[variant] : ''}`}>
            <div className={`${styles.coverWrapper} ${styles.skeleton}`} />
            <div className={styles.info}>
                <div className={`${styles.skeleton}`} style={{ height: 16, width: '80%', borderRadius: 4 }} />
                <div className={`${styles.skeleton}`} style={{ height: 12, width: '60%', borderRadius: 4, marginTop: 4 }} />
            </div>
        </div>
    );
}

export default BookCard;
