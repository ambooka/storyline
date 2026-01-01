"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Heart, Bookmark, X, Trash2 } from "lucide-react";
import { useState, useCallback } from "react";
import styles from "./CommentsPanel.module.css";

interface Comment {
    id: string;
    cfi: string;
    text: string;
    note?: string;
    timestamp: number;
}

interface Reaction {
    cfi: string;
    emoji: string;
    text: string;
    timestamp: number;
}

interface CommentsPanelProps {
    bookId: string;
    comments: Comment[];
    reactions: Reaction[];
    onAddComment: (text: string, note?: string) => void;
    onDeleteComment: (id: string) => void;
    onDeleteReaction: (index: number) => void;
    onClose: () => void;
}

export function CommentsPanel({
    bookId,
    comments,
    reactions,
    onAddComment,
    onDeleteComment,
    onDeleteReaction,
    onClose,
}: CommentsPanelProps) {
    const [activeTab, setActiveTab] = useState<"comments" | "reactions">("reactions");

    return (
        <motion.div
            className={styles.panel}
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
        >
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === "reactions" ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab("reactions")}
                    >
                        <Heart size={16} />
                        <span>Reactions</span>
                        {reactions.length > 0 && (
                            <span className={styles.badge}>{reactions.length}</span>
                        )}
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "comments" ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab("comments")}
                    >
                        <MessageCircle size={16} />
                        <span>Comments</span>
                        {comments.length > 0 && (
                            <span className={styles.badge}>{comments.length}</span>
                        )}
                    </button>
                </div>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={18} />
                </button>
            </div>

            {/* Content */}
            <div className={styles.content}>
                <AnimatePresence mode="wait">
                    {activeTab === "reactions" ? (
                        <motion.div
                            key="reactions"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={styles.list}
                        >
                            {reactions.length === 0 ? (
                                <div className={styles.empty}>
                                    <Heart size={48} className={styles.emptyIcon} />
                                    <p>No reactions yet</p>
                                    <span>Select text and react to it</span>
                                </div>
                            ) : (
                                reactions.map((reaction, index) => (
                                    <div key={index} className={styles.reactionItem}>
                                        <span className={styles.reactionEmoji}>{reaction.emoji}</span>
                                        <div className={styles.reactionContent}>
                                            <p className={styles.reactionText}>&quot;{reaction.text}&quot;</p>
                                            <span className={styles.reactionTime}>
                                                {new Date(reaction.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => onDeleteReaction(index)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="comments"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={styles.list}
                        >
                            {comments.length === 0 ? (
                                <div className={styles.empty}>
                                    <MessageCircle size={48} className={styles.emptyIcon} />
                                    <p>No comments yet</p>
                                    <span>Select text and add a note</span>
                                </div>
                            ) : (
                                comments.map((comment) => (
                                    <div key={comment.id} className={styles.commentItem}>
                                        <Bookmark size={16} className={styles.commentIcon} />
                                        <div className={styles.commentContent}>
                                            <p className={styles.commentText}>&quot;{comment.text}&quot;</p>
                                            {comment.note && (
                                                <p className={styles.commentNote}>{comment.note}</p>
                                            )}
                                            <span className={styles.commentTime}>
                                                {new Date(comment.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => onDeleteComment(comment.id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
