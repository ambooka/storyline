"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Heart, Zap, Lightbulb, Frown, MessageCircle, X } from "lucide-react";
import { db } from "@/lib/epub";
import styles from "./ReactionSystem.module.css";

// Reaction types
export type ReactionEmoji = "🔥" | "❤️" | "🤯" | "💡" | "😢";

export interface Reaction {
  id: string;
  bookId: string;
  cfi: string;
  emoji: ReactionEmoji;
  note?: string;
  createdAt: Date;
}

const REACTIONS: { emoji: ReactionEmoji; icon: typeof Flame; label: string; color: string }[] = [
  { emoji: "🔥", icon: Flame, label: "Fire", color: "#FF6B54" },
  { emoji: "❤️", icon: Heart, label: "Love", color: "#EC4899" },
  { emoji: "🤯", icon: Zap, label: "Mind Blown", color: "#8B5CF6" },
  { emoji: "💡", icon: Lightbulb, label: "Insight", color: "#F59E0B" },
  { emoji: "😢", icon: Frown, label: "Sad", color: "#3B82F6" },
];

// Initialize reactions table in IndexedDB
async function initReactionsTable() {
  // Check if reactions table exists, if not we need to upgrade schema
  if (!db.tables.some(t => t.name === 'reactions')) {
    // Table will be created on first use
  }
}

// Reactions store in IndexedDB
async function addReaction(reaction: Omit<Reaction, "id" | "createdAt">): Promise<string> {
  const id = crypto.randomUUID();
  // Store in localStorage for now (simple persistence)
  const reactions = getStoredReactions();
  const newReaction: Reaction = {
    ...reaction,
    id,
    createdAt: new Date(),
  };
  reactions.push(newReaction);
  localStorage.setItem("storyline-reactions", JSON.stringify(reactions));
  return id;
}

function getStoredReactions(): Reaction[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("storyline-reactions");
  if (!stored) return [];
  try {
    return JSON.parse(stored).map((r: Reaction) => ({
      ...r,
      createdAt: new Date(r.createdAt),
    }));
  } catch {
    return [];
  }
}

async function getReactionsForBook(bookId: string): Promise<Reaction[]> {
  return getStoredReactions().filter((r) => r.bookId === bookId);
}

async function getReactionsAtPosition(bookId: string, cfi: string): Promise<Reaction[]> {
  return getStoredReactions().filter((r) => r.bookId === bookId && r.cfi === cfi);
}

async function deleteReaction(id: string): Promise<void> {
  const reactions = getStoredReactions().filter((r) => r.id !== id);
  localStorage.setItem("storyline-reactions", JSON.stringify(reactions));
}

// Hook for managing reactions
export function useReactions(bookId: string) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReactions() {
      setLoading(true);
      const loaded = await getReactionsForBook(bookId);
      setReactions(loaded);
      setLoading(false);
    }
    loadReactions();
  }, [bookId]);

  const addReactionAtPosition = useCallback(async (cfi: string, emoji: ReactionEmoji, note?: string) => {
    const id = await addReaction({ bookId, cfi, emoji, note });
    const newReaction: Reaction = {
      id,
      bookId,
      cfi,
      emoji,
      note,
      createdAt: new Date(),
    };
    setReactions((prev) => [...prev, newReaction]);
    return id;
  }, [bookId]);

  const removeReaction = useCallback(async (id: string) => {
    await deleteReaction(id);
    setReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const getReactionsAt = useCallback((cfi: string) => {
    return reactions.filter((r) => r.cfi === cfi);
  }, [reactions]);

  const reactionCounts = useMemo(() => {
    const counts: Record<ReactionEmoji, number> = {
      "🔥": 0,
      "❤️": 0,
      "🤯": 0,
      "💡": 0,
      "😢": 0,
    };
    reactions.forEach((r) => {
      counts[r.emoji]++;
    });
    return counts;
  }, [reactions]);

  return {
    reactions,
    loading,
    addReactionAtPosition,
    removeReaction,
    getReactionsAt,
    reactionCounts,
  };
}

// Reaction button bar component
interface ReactionBarProps {
  bookId: string;
  currentCfi: string;
  onAddReaction: (emoji: ReactionEmoji) => void;
  existingReactions: Reaction[];
}

export function ReactionBar({ bookId, currentCfi, onAddReaction, existingReactions }: ReactionBarProps) {
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<ReactionEmoji | null>(null);

  const handleReactionClick = (emoji: ReactionEmoji) => {
    setSelectedEmoji(emoji);
    setShowNote(true);
  };

  const handleSubmit = () => {
    if (selectedEmoji) {
      onAddReaction(selectedEmoji);
      setShowNote(false);
      setNoteText("");
      setSelectedEmoji(null);
    }
  };

  const handleQuickReaction = (emoji: ReactionEmoji) => {
    onAddReaction(emoji);
  };

  return (
    <div className={styles.reactionBar}>
      <div className={styles.reactionButtons}>
        {REACTIONS.map((reaction) => {
          const count = existingReactions.filter((r) => r.emoji === reaction.emoji).length;
          return (
            <motion.button
              key={reaction.emoji}
              className={styles.reactionBtn}
              onClick={() => handleQuickReaction(reaction.emoji)}
              onDoubleClick={() => handleReactionClick(reaction.emoji)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title={`${reaction.label} (double-click to add note)`}
            >
              <span className={styles.emoji}>{reaction.emoji}</span>
              {count > 0 && <span className={styles.count}>{count}</span>}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {showNote && (
          <motion.div
            className={styles.noteOverlay}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className={styles.noteHeader}>
              <span>{selectedEmoji} Add a note</span>
              <button onClick={() => setShowNote(false)}>
                <X size={16} />
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Why did this resonate with you?"
              autoFocus
            />
            <button className={styles.submitBtn} onClick={handleSubmit}>
              Add Reaction
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Reactions summary component
interface ReactionsSummaryProps {
  reactions: Reaction[];
  onDeleteReaction: (id: string) => void;
}

export function ReactionsSummary({ reactions, onDeleteReaction }: ReactionsSummaryProps) {
  const [showAll, setShowAll] = useState(false);

  const recentReactions = showAll ? reactions : reactions.slice(0, 5);

  if (reactions.length === 0) {
    return (
      <div className={styles.emptySummary}>
        <MessageCircle size={32} />
        <p>No reactions yet</p>
        <span>React to passages that move you</span>
      </div>
    );
  }

  return (
    <div className={styles.summary}>
      <div className={styles.summaryHeader}>
        <span>Your Reactions ({reactions.length})</span>
      </div>

      <div className={styles.reactionsList}>
        {recentReactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            className={styles.reactionItem}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className={styles.itemEmoji}>{reaction.emoji}</span>
            <div className={styles.itemInfo}>
              {reaction.note && <p className={styles.itemNote}>{reaction.note}</p>}
              <span className={styles.itemDate}>
                {new Date(reaction.createdAt).toLocaleDateString()}
              </span>
            </div>
            <button
              className={styles.deleteBtn}
              onClick={() => onDeleteReaction(reaction.id)}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </div>

      {reactions.length > 5 && (
        <button
          className={styles.showMoreBtn}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show less" : `Show ${reactions.length - 5} more`}
        </button>
      )}
    </div>
  );
}
