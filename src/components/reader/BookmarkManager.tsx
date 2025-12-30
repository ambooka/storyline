"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bookmark,
    BookmarkPlus,
    Trash2,
    Clock,
    ChevronRight,
    Search,
    X
} from "lucide-react";
import {
    addBookmark as addBookmarkToDB,
    getBookmarks,
    Bookmark as BookmarkType,
    db
} from "@/lib/epub";
import styles from "./BookmarkManager.module.css";

interface BookmarkManagerProps {
    bookId: string;
    currentCfi: string;
    currentChapter: string;
    onGoToBookmark: (cfi: string) => void;
}

export function BookmarkManager({
    bookId,
    currentCfi,
    currentChapter,
    onGoToBookmark,
}: BookmarkManagerProps) {
    const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    // Load bookmarks
    useEffect(() => {
        async function loadBookmarks() {
            setLoading(true);
            try {
                const loadedBookmarks = await getBookmarks(bookId);
                setBookmarks(loadedBookmarks.sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ));
            } catch (error) {
                console.error("Failed to load bookmarks:", error);
            } finally {
                setLoading(false);
            }
        }
        loadBookmarks();
    }, [bookId]);

    const handleAddBookmark = useCallback(async () => {
        if (!newTitle.trim()) return;

        try {
            const id = await addBookmarkToDB(bookId, currentCfi, newTitle);
            const newBookmark: BookmarkType = {
                id,
                bookId,
                cfi: currentCfi,
                title: newTitle,
                createdAt: new Date(),
            };
            setBookmarks((prev) => [newBookmark, ...prev]);
            setNewTitle("");
            setIsAdding(false);
        } catch (error) {
            console.error("Failed to add bookmark:", error);
        }
    }, [bookId, currentCfi, newTitle]);

    const handleDeleteBookmark = useCallback(async (id: string) => {
        try {
            await db.bookmarks.delete(id);
            setBookmarks((prev) => prev.filter((b) => b.id !== id));
        } catch (error) {
            console.error("Failed to delete bookmark:", error);
        }
    }, []);

    const handleQuickBookmark = useCallback(async () => {
        const title = currentChapter || `Page at ${new Date().toLocaleTimeString()}`;
        try {
            const id = await addBookmarkToDB(bookId, currentCfi, title);
            const newBookmark: BookmarkType = {
                id,
                bookId,
                cfi: currentCfi,
                title,
                createdAt: new Date(),
            };
            setBookmarks((prev) => [newBookmark, ...prev]);
        } catch (error) {
            console.error("Failed to add quick bookmark:", error);
        }
    }, [bookId, currentCfi, currentChapter]);

    // Filter bookmarks by search
    const filteredBookmarks = bookmarks.filter((b) =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Check if current position is bookmarked
    const isCurrentBookmarked = bookmarks.some((b) => b.cfi === currentCfi);

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <Bookmark size={18} />
                <span>Bookmarks ({bookmarks.length})</span>
                <button
                    className={`${styles.quickAddBtn} ${isCurrentBookmarked ? styles.bookmarked : ""}`}
                    onClick={handleQuickBookmark}
                    disabled={isCurrentBookmarked}
                    title={isCurrentBookmarked ? "Already bookmarked" : "Bookmark current page"}
                >
                    <BookmarkPlus size={18} />
                </button>
            </div>

            {/* Search */}
            {bookmarks.length > 3 && (
                <div className={styles.searchBox}>
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Search bookmarks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")}>
                            <X size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* Add new bookmark form */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        className={styles.addForm}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <input
                            type="text"
                            placeholder="Bookmark title..."
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && handleAddBookmark()}
                        />
                        <div className={styles.addFormButtons}>
                            <button onClick={() => setIsAdding(false)}>Cancel</button>
                            <button
                                className={styles.saveBtn}
                                onClick={handleAddBookmark}
                                disabled={!newTitle.trim()}
                            >
                                Save
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add with custom title button */}
            {!isAdding && (
                <button className={styles.addCustomBtn} onClick={() => setIsAdding(true)}>
                    <BookmarkPlus size={16} />
                    Add with custom title
                </button>
            )}

            {/* Bookmarks list */}
            <div className={styles.list}>
                {loading ? (
                    <div className={styles.loading}>Loading bookmarks...</div>
                ) : filteredBookmarks.length === 0 ? (
                    <div className={styles.empty}>
                        <Bookmark size={32} />
                        <p>{searchQuery ? "No bookmarks found" : "No bookmarks yet"}</p>
                        <span>Tap the bookmark icon to save your place</span>
                    </div>
                ) : (
                    filteredBookmarks.map((bookmark) => (
                        <motion.div
                            key={bookmark.id}
                            className={`${styles.bookmarkItem} ${bookmark.cfi === currentCfi ? styles.current : ""}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            onClick={() => onGoToBookmark(bookmark.cfi)}
                        >
                            <div className={styles.bookmarkIcon}>
                                <Bookmark size={16} />
                            </div>
                            <div className={styles.bookmarkInfo}>
                                <span className={styles.bookmarkTitle}>{bookmark.title}</span>
                                <span className={styles.bookmarkDate}>
                                    <Clock size={12} />
                                    {new Date(bookmark.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <button
                                className={styles.deleteBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBookmark(bookmark.id);
                                }}
                            >
                                <Trash2 size={14} />
                            </button>
                            <ChevronRight size={16} className={styles.chevron} />
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
