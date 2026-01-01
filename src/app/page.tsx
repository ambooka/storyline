"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  BookOpen,
  Settings,
  Play,
  Plus,
  Heart,
  Download,
  Loader2,
  TrendingUp,
  Trash2,
  Clock,
  CheckCircle,
  Flame,
  X,
  User,
  Target,
  Sparkles,
  BookMarked,
} from "lucide-react";
import ImportModal from "@/components/ImportModal";
import { getAllBooks, StoredBook, saveBook, deleteBook, removeDuplicateBooks } from "@/lib/epub";
import { Book, searchAllProviders, downloadBook } from "@/lib/ebook-providers";
import { useAuth } from "@/contexts/AuthContext";
import { PageLayout, ThemeProfileControls } from "@/components/ui";
import styles from "./page.module.css";

type FilterTab = "all" | "reading" | "finished" | "favorites";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

interface DisplayBook {
  id: string;
  title: string;
  author: string;
  cover: string | null;
  progress: number;
  downloadUrl?: string | null;
  isFromApi?: boolean;
  isFavorite?: boolean;
}

export default function LibraryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [userBooks, setUserBooks] = useState<StoredBook[]>([]);
  const [popularBooks, setPopularBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("storyline_favorites");
    if (stored) {
      setFavorites(new Set(JSON.parse(stored)));
    }
  }, []);

  useEffect(() => {
    async function loadBooks() {
      setLoading(true);
      try {
        // First, clean up any duplicate books
        await removeDuplicateBooks();

        const localBooks = await getAllBooks();
        localBooks.sort((a, b) => {
          const aTime = a.lastRead?.getTime() || 0;
          const bTime = b.lastRead?.getTime() || 0;
          return bTime - aTime;
        });
        setUserBooks(localBooks);

        // Load some popular books for discovery
        const result = await searchAllProviders({ sort: "popular", page: 1 });
        setPopularBooks(result.books.slice(0, 6));
      } catch (error) {
        console.error("Failed to load books:", error);
      } finally {
        setLoading(false);
      }
    }
    loadBooks();
  }, []);

  const handleDownloadAndRead = async (book: Book) => {
    if (!book.downloadUrl) return;
    setDownloadingId(book.id);
    try {
      const fileData = await downloadBook(book);
      if (!fileData) {
        console.error("Failed to download book: no data received");
        return;
      }
      const savedBook = await saveBook({
        title: book.title,
        author: book.author,
        cover: book.cover || undefined,
        fileData,
      });
      router.push(`/read/${savedBook.id}`);
    } catch (error) {
      console.error("Failed to download book:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    setDeletingId(bookId);
    try {
      await deleteBook(bookId);
      setUserBooks(prev => prev.filter(b => b.id !== bookId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete book:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleFavorite = (bookId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(bookId)) {
        newFavorites.delete(bookId);
      } else {
        newFavorites.add(bookId);
      }
      localStorage.setItem("storyline_favorites", JSON.stringify([...newFavorites]));
      return newFavorites;
    });
  };

  // Stats
  const stats = {
    total: userBooks.length,
    reading: userBooks.filter(b => b.progress > 0 && b.progress < 95).length,
    finished: userBooks.filter(b => b.progress >= 95).length,
  };

  // Current book (most recently read with progress)
  const currentBook = userBooks.find(b => b.progress > 0 && b.progress < 100) || userBooks[0];

  // Reading goal (from localStorage or default)
  const [readingGoal] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("storyline_reading_goal");
      return saved ? JSON.parse(saved) : { target: 12, current: stats.finished };
    }
    return { target: 12, current: 0 };
  });

  // Reading streak
  const [streak] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("storyline_streak");
      return saved ? JSON.parse(saved).count || 0 : 0;
    }
    return 0;
  });

  // Filter books
  const displayBooks: DisplayBook[] = userBooks
    .filter(book => {
      if (activeTab === "reading") return book.progress > 0 && book.progress < 95;
      if (activeTab === "finished") return book.progress >= 95;
      if (activeTab === "favorites") return favorites.has(book.id);
      return true;
    })
    .filter(book =>
      searchQuery
        ? book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    )
    .map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      cover: book.cover || null,
      progress: book.progress,
      isFavorite: favorites.has(book.id),
    }));

  const tabCounts = {
    all: userBooks.length,
    reading: stats.reading,
    finished: stats.finished,
    favorites: [...favorites].filter(id => userBooks.some(b => b.id === id)).length,
  };

  const goalProgress = Math.min((stats.finished / readingGoal.target) * 100, 100);

  return (
    <PageLayout>
      <div className={styles.container}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerTop}>
            <h1 className={styles.pageTitle}>My Books</h1>
            <ThemeProfileControls />
          </div>
          <div className={styles.searchRow}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <button className={styles.addBtn} onClick={() => setImportModalOpen(true)}>
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Page-specific actions - Floating FAB for mobile */}
        <button className={styles.fabImport} onClick={() => setImportModalOpen(true)}>
          <Plus size={24} />
        </button>

        {/* Loading State */}
        {loading && (
          <div className={styles.loadingState}>
            <Loader2 size={40} className={styles.spinner} />
            <p>Loading books...</p>
          </div>
        )}

        {/* Main Content */}
        {!loading && (
          <div className={styles.mainContent}>
            {/* Left Panel - Stats & Goals */}
            <aside className={styles.leftPanel}>
              {/* Welcome Card */}
              <motion.div
                className={styles.welcomeCard}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className={styles.welcomeHeader}>
                  <Sparkles size={20} />
                  <span>Welcome Back!</span>
                </div>
                <h2 className={styles.welcomeTitle}>
                  {user?.displayName?.split(' ')[0] || "Reader"}
                </h2>
                <p className={styles.welcomeSubtitle}>
                  {stats.reading > 0
                    ? `You have ${stats.reading} book${stats.reading > 1 ? 's' : ''} in progress`
                    : "Ready to start a new adventure?"}
                </p>
              </motion.div>

              {/* Reading Goal */}
              <motion.div
                className={styles.goalCard}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className={styles.goalHeader}>
                  <Target size={18} />
                  <span>2024 Goal</span>
                </div>
                <div className={styles.goalProgress}>
                  <div className={styles.goalCircle}>
                    <svg viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-surface-raised)" strokeWidth="6" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke="var(--color-accent)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${goalProgress * 2.64} 264`}
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className={styles.goalText}>
                      <span className={styles.goalCurrent}>{stats.finished}</span>
                      <span className={styles.goalDivider}>/</span>
                      <span className={styles.goalTarget}>{readingGoal.target}</span>
                    </div>
                  </div>
                  <div className={styles.goalInfo}>
                    <span className={styles.goalLabel}>books read</span>
                    <span className={styles.goalRemaining}>
                      {readingGoal.target - stats.finished > 0
                        ? `${readingGoal.target - stats.finished} to go!`
                        : "🎉 Complete!"}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                className={styles.statsGrid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className={styles.miniStat}>
                  <BookOpen size={16} />
                  <span className={styles.miniStatValue}>{stats.total}</span>
                  <span className={styles.miniStatLabel}>Total</span>
                </div>
                <div className={styles.miniStat}>
                  <Clock size={16} />
                  <span className={styles.miniStatValue}>{stats.reading}</span>
                  <span className={styles.miniStatLabel}>Reading</span>
                </div>
                <div className={styles.miniStat}>
                  <CheckCircle size={16} />
                  <span className={styles.miniStatValue}>{stats.finished}</span>
                  <span className={styles.miniStatLabel}>Done</span>
                </div>
                <div className={styles.miniStat}>
                  <Flame size={16} />
                  <span className={styles.miniStatValue}>{streak}</span>
                  <span className={styles.miniStatLabel}>Streak</span>
                </div>
              </motion.div>
            </aside>

            {/* Center - Continue Reading */}
            <section className={styles.centerPanel}>
              {currentBook ? (
                <motion.div
                  className={styles.continueCard}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className={styles.continueHeader}>
                    <BookMarked size={18} />
                    <span>Continue Reading</span>
                  </div>

                  <div className={styles.continueContent}>
                    <div className={styles.continueBookCover}>
                      {currentBook.cover ? (
                        <img src={currentBook.cover} alt={currentBook.title} />
                      ) : (
                        <div className={styles.coverPlaceholder}>
                          <BookOpen size={32} />
                        </div>
                      )}
                      <div className={styles.progressRing}>
                        <svg viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                          <circle
                            cx="50" cy="50" r="46" fill="none"
                            stroke="var(--color-accent)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${currentBook.progress * 2.89} 289`}
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                        <span className={styles.progressPercent}>{Math.round(currentBook.progress)}%</span>
                      </div>
                    </div>

                    <div className={styles.continueInfo}>
                      <h3 className={styles.continueTitle}>{currentBook.title}</h3>
                      <p className={styles.continueAuthor}>{currentBook.author}</p>
                      <Link href={`/read/${currentBook.id}`}>
                        <motion.button
                          className={styles.continueBtn}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Play size={18} fill="white" />
                          Continue
                        </motion.button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className={styles.emptyState}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <BookOpen size={48} />
                  <h3>No books yet</h3>
                  <p>Import a book or explore our library</p>
                  <div className={styles.emptyActions}>
                    <button onClick={() => setImportModalOpen(true)} className={styles.primaryBtn}>
                      <Plus size={18} /> Import Book
                    </button>
                    <Link href="/explore" className={styles.secondaryBtn}>
                      Explore Library
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* Discover Section */}
              {popularBooks.length > 0 && (
                <motion.div
                  className={styles.discoverSection}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className={styles.discoverHeader}>
                    <h3>Discover</h3>
                    <Link href="/explore" className={styles.seeAllLink}>See All</Link>
                  </div>
                  <div className={styles.discoverGrid}>
                    {popularBooks.slice(0, 4).map((book) => (
                      <motion.div
                        key={book.id}
                        className={styles.discoverBook}
                        whileHover={{ y: -4 }}
                        onClick={() => handleDownloadAndRead(book)}
                      >
                        {book.cover ? (
                          <img src={book.cover} alt={book.title} />
                        ) : (
                          <div className={styles.discoverPlaceholder}>
                            <BookOpen size={24} />
                          </div>
                        )}
                        {downloadingId === book.id && (
                          <div className={styles.downloadingOverlay}>
                            <Loader2 size={20} className={styles.spinner} />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </section>

            {/* Right Panel - Book List */}
            <aside className={styles.rightPanel}>
              {/* Filter Tabs */}
              <div className={styles.filterTabs}>
                {(["all", "reading", "finished", "favorites"] as FilterTab[]).map(tab => (
                  <button
                    key={tab}
                    className={`${styles.filterTab} ${activeTab === tab ? styles.filterTabActive : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tabCounts[tab] > 0 && <span>{tabCounts[tab]}</span>}
                  </button>
                ))}
              </div>

              <div className={styles.listHeader}>
                <h3>Your Library</h3>
              </div>

              <motion.div
                className={styles.bookList}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {displayBooks.length === 0 ? (
                  <div className={styles.emptyList}>
                    <p>No books found</p>
                  </div>
                ) : (
                  displayBooks.map((book) => (
                    <motion.div
                      key={book.id}
                      className={styles.bookItem}
                      variants={itemVariants}
                    >
                      <div
                        className={styles.bookItemMain}
                        onClick={() => router.push(`/read/${book.id}`)}
                      >
                        {book.cover ? (
                          <img src={book.cover} alt="" className={styles.bookItemCover} />
                        ) : (
                          <div className={styles.bookItemCoverPlaceholder}>
                            <BookOpen size={16} />
                          </div>
                        )}
                        <div className={styles.bookItemInfo}>
                          <span className={styles.bookItemTitle}>{book.title}</span>
                          <span className={styles.bookItemAuthor}>{book.author}</span>
                          {book.progress > 0 && (
                            <div className={styles.bookItemProgress}>
                              <div
                                className={styles.bookItemProgressBar}
                                style={{ width: `${book.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={styles.bookItemActions}>
                        <button
                          className={`${styles.favoriteBtn} ${book.isFavorite ? styles.favoriteBtnActive : ""}`}
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(book.id); }}
                        >
                          <Heart size={14} fill={book.isFavorite ? "currentColor" : "none"} />
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(book.id); }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            </aside>
          </div>
        )}

        {/* Delete Confirmation */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              className={styles.deleteModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className={styles.deleteModalContent}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
              >
                <h4>Delete Book?</h4>
                <p>This will remove the book from your library.</p>
                <div className={styles.deleteModalActions}>
                  <button onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
                  <button
                    className={styles.deleteConfirmBtn}
                    onClick={() => handleDeleteBook(showDeleteConfirm)}
                    disabled={deletingId === showDeleteConfirm}
                  >
                    {deletingId === showDeleteConfirm ? <Loader2 size={16} className={styles.spinner} /> : "Delete"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onBookImported={() => {
            getAllBooks().then(setUserBooks);
          }}
        />
      </div>
    </PageLayout>
  );
}
