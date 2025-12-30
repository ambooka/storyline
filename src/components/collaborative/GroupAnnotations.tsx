"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Highlighter,
    MessageSquare,
    X,
    Send,
    Users,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import styles from "./GroupAnnotations.module.css";

interface Annotation {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    cfi: string;
    selectedText: string;
    note: string;
    color: string;
    timestamp: number;
    replies: Reply[];
}

interface Reply {
    id: string;
    userId: string;
    userName: string;
    message: string;
    timestamp: number;
}

interface GroupAnnotationsProps {
    roomId: string;
    annotations: Annotation[];
    currentCfi: string;
    selectedText?: string;
    onAddAnnotation: (text: string, note: string, color: string, cfi: string) => void;
    onAddReply: (annotationId: string, message: string) => void;
}

const HIGHLIGHT_COLORS = [
    { name: "Yellow", value: "#FEF08A" },
    { name: "Green", value: "#BBF7D0" },
    { name: "Blue", value: "#BFDBFE" },
    { name: "Pink", value: "#FBCFE8" },
    { name: "Purple", value: "#DDD6FE" },
];

/**
 * Group Annotations
 * Allows participants to create shared highlights and notes that everyone can see.
 * Other participants can reply to annotations to create threaded discussions.
 */
export function GroupAnnotations({
    roomId,
    annotations,
    currentCfi,
    selectedText,
    onAddAnnotation,
    onAddReply,
}: GroupAnnotationsProps) {
    const [showPanel, setShowPanel] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [noteText, setNoteText] = useState("");
    const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
    const [expandedAnnotation, setExpandedAnnotation] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");

    // Filter annotations near current position
    const nearbyAnnotations = annotations.filter((a) => {
        // Simple proximity check - in production, compare CFIs properly
        return true;
    });

    const handleAddAnnotation = () => {
        if (!selectedText || !noteText.trim()) return;
        onAddAnnotation(selectedText, noteText.trim(), selectedColor, currentCfi);
        setNoteText("");
        setShowAddForm(false);
    };

    const handleAddReply = (annotationId: string) => {
        if (!replyText.trim()) return;
        onAddReply(annotationId, replyText.trim());
        setReplyText("");
    };

    return (
        <div className={styles.container}>
            {/* Toggle button */}
            <button
                className={`${styles.toggleBtn} ${showPanel ? styles.toggleBtnActive : ""}`}
                onClick={() => setShowPanel(!showPanel)}
            >
                <Highlighter size={16} />
                Group Notes
                {annotations.length > 0 && (
                    <span className={styles.badge}>{annotations.length}</span>
                )}
            </button>

            {/* Selected text quick action */}
            {selectedText && !showPanel && (
                <motion.div
                    className={styles.quickAdd}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <button onClick={() => { setShowPanel(true); setShowAddForm(true); }}>
                        <Highlighter size={14} />
                        Add Group Note
                    </button>
                </motion.div>
            )}

            {/* Annotations panel */}
            <AnimatePresence>
                {showPanel && (
                    <motion.div
                        className={styles.panel}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className={styles.panelHeader}>
                            <h4>
                                <Users size={14} />
                                Group Annotations
                            </h4>
                            <button onClick={() => setShowPanel(false)}>
                                <X size={16} />
                            </button>
                        </div>

                        {/* Add new annotation */}
                        {showAddForm && selectedText && (
                            <div className={styles.addForm}>
                                <p className={styles.selectedText}>"{selectedText.slice(0, 100)}..."</p>
                                <div className={styles.colorPicker}>
                                    {HIGHLIGHT_COLORS.map((color) => (
                                        <button
                                            key={color.name}
                                            className={`${styles.colorBtn} ${selectedColor === color.value ? styles.colorBtnActive : ""}`}
                                            style={{ backgroundColor: color.value }}
                                            onClick={() => setSelectedColor(color.value)}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                                <textarea
                                    placeholder="Add a note for the group..."
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    className={styles.noteInput}
                                />
                                <div className={styles.formActions}>
                                    <button className={styles.cancelBtn} onClick={() => setShowAddForm(false)}>
                                        Cancel
                                    </button>
                                    <button className={styles.submitBtn} onClick={handleAddAnnotation}>
                                        <Send size={14} />
                                        Share Note
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Annotations list */}
                        <div className={styles.annotationsList}>
                            {nearbyAnnotations.length === 0 ? (
                                <p className={styles.emptyState}>
                                    No group annotations yet. Select text and add a note!
                                </p>
                            ) : (
                                nearbyAnnotations.map((annotation) => (
                                    <div
                                        key={annotation.id}
                                        className={styles.annotationItem}
                                        style={{ borderLeftColor: annotation.color }}
                                    >
                                        <div className={styles.annotationHeader}>
                                            <div className={styles.annotationUser}>
                                                {annotation.userAvatar ? (
                                                    <img src={annotation.userAvatar} alt="" />
                                                ) : (
                                                    <span>{annotation.userName.charAt(0)}</span>
                                                )}
                                                <strong>{annotation.userName}</strong>
                                            </div>
                                            <button
                                                className={styles.expandBtn}
                                                onClick={() => setExpandedAnnotation(
                                                    expandedAnnotation === annotation.id ? null : annotation.id
                                                )}
                                            >
                                                {expandedAnnotation === annotation.id ? (
                                                    <ChevronUp size={14} />
                                                ) : (
                                                    <ChevronDown size={14} />
                                                )}
                                            </button>
                                        </div>

                                        <p className={styles.annotationQuote}>"{annotation.selectedText.slice(0, 50)}..."</p>
                                        <p className={styles.annotationNote}>{annotation.note}</p>

                                        {/* Replies */}
                                        <AnimatePresence>
                                            {expandedAnnotation === annotation.id && (
                                                <motion.div
                                                    className={styles.repliesSection}
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                >
                                                    {annotation.replies.map((reply) => (
                                                        <div key={reply.id} className={styles.reply}>
                                                            <strong>{reply.userName}</strong>
                                                            <p>{reply.message}</p>
                                                        </div>
                                                    ))}

                                                    <div className={styles.replyInput}>
                                                        <input
                                                            type="text"
                                                            placeholder="Add a reply..."
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                            onKeyPress={(e) => e.key === "Enter" && handleAddReply(annotation.id)}
                                                        />
                                                        <button onClick={() => handleAddReply(annotation.id)}>
                                                            <Send size={14} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
