"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Highlighter,
    Trash2,
    MessageSquare,
    Share2,
    ChevronDown
} from "lucide-react";
import styles from "./HighlightManager.module.css";

export interface Highlight {
    id: string;
    cfi: string;
    text: string;
    note: string;
    color: "yellow" | "green" | "blue" | "purple";
    createdAt: Date;
    isPublic: boolean;
}

interface HighlightManagerProps {
    bookId: string;
    highlights: Highlight[];
    onAddHighlight: (highlight: Omit<Highlight, "id" | "createdAt">) => void;
    onDeleteHighlight: (id: string) => void;
    onUpdateHighlight: (id: string, updates: Partial<Highlight>) => void;
    onGoToHighlight: (cfi: string) => void;
}

const COLORS: { value: Highlight["color"]; label: string; hex: string }[] = [
    { value: "yellow", label: "Yellow", hex: "#FEF08A" },
    { value: "green", label: "Green", hex: "#86EFAC" },
    { value: "blue", label: "Blue", hex: "#93C5FD" },
    { value: "purple", label: "Purple", hex: "#C4B5FD" },
];

export function HighlightManager({
    bookId,
    highlights,
    onDeleteHighlight,
    onUpdateHighlight,
    onGoToHighlight,
}: HighlightManagerProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingNote, setEditingNote] = useState<string | null>(null);
    const [noteText, setNoteText] = useState("");

    const handleSaveNote = (id: string) => {
        onUpdateHighlight(id, { note: noteText });
        setEditingNote(null);
        setNoteText("");
    };

    if (highlights.length === 0) {
        return (
            <div className={styles.emptyState}>
                <Highlighter size={40} />
                <p>No highlights yet</p>
                <span>Select text while reading to highlight</span>
            </div>
        );
    }

    return (
        <div className={styles.highlightList}>
            {highlights.map((highlight) => (
                <motion.div
                    key={highlight.id}
                    className={`${styles.highlightCard} ${selectedId === highlight.id ? styles.highlighted : ""}`}
                    layout
                    onClick={() => setSelectedId(selectedId === highlight.id ? null : highlight.id)}
                >
                    <div
                        className={styles.colorBar}
                        style={{ backgroundColor: COLORS.find(c => c.value === highlight.color)?.hex }}
                    />

                    <div className={styles.highlightContent}>
                        <p
                            className={styles.highlightText}
                            onClick={(e) => {
                                e.stopPropagation();
                                onGoToHighlight(highlight.cfi);
                            }}
                        >
                            "{highlight.text}"
                        </p>

                        {highlight.note && (
                            <p className={styles.noteText}>{highlight.note}</p>
                        )}

                        <AnimatePresence>
                            {selectedId === highlight.id && (
                                <motion.div
                                    className={styles.highlightActions}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    {editingNote === highlight.id ? (
                                        <div className={styles.noteEditor}>
                                            <textarea
                                                value={noteText}
                                                onChange={(e) => setNoteText(e.target.value)}
                                                placeholder="Add a note..."
                                                className={styles.noteInput}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className={styles.noteButtons}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingNote(null);
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className={styles.saveBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSaveNote(highlight.id);
                                                    }}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.actionButtons}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingNote(highlight.id);
                                                    setNoteText(highlight.note || "");
                                                }}
                                            >
                                                <MessageSquare size={16} />
                                                Note
                                            </button>
                                            <button>
                                                <Share2 size={16} />
                                                Share
                                            </button>
                                            <div className={styles.colorPicker}>
                                                {COLORS.map((color) => (
                                                    <button
                                                        key={color.value}
                                                        className={`${styles.colorDot} ${highlight.color === color.value ? styles.colorDotActive : ""}`}
                                                        style={{ backgroundColor: color.hex }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUpdateHighlight(highlight.id, { color: color.value });
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteHighlight(highlight.id);
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <ChevronDown
                        size={16}
                        className={`${styles.expandIcon} ${selectedId === highlight.id ? styles.expandIconRotated : ""}`}
                    />
                </motion.div>
            ))}
        </div>
    );
}

// Highlight selection toolbar that appears when text is selected
interface SelectionToolbarProps {
    position: { x: number; y: number };
    onHighlight: (color: Highlight["color"]) => void;
    onReact: (emoji: string) => void;
    onClose: () => void;
}

export function SelectionToolbar({ position, onHighlight, onReact, onClose }: SelectionToolbarProps) {
    const toolbarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    return (
        <motion.div
            ref={toolbarRef}
            className={styles.selectionToolbar}
            style={{
                left: position.x,
                top: position.y,
            }}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
        >
            <div className={styles.highlightColors}>
                {COLORS.map((color) => (
                    <button
                        key={color.value}
                        className={styles.colorButton}
                        style={{ backgroundColor: color.hex }}
                        onClick={() => onHighlight(color.value)}
                        title={`Highlight ${color.label}`}
                    >
                        <Highlighter size={14} />
                    </button>
                ))}
            </div>
            <div className={styles.toolbarDivider} />
            <div className={styles.reactionButtons}>
                {["🔥", "❤️", "🤯", "💡", "😢"].map((emoji) => (
                    <button
                        key={emoji}
                        className={styles.reactionButton}
                        onClick={() => onReact(emoji)}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </motion.div>
    );
}
