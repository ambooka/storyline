"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Filter,
    Loader2,
    BookOpen,
    Download,
    Bookmark,
    BookmarkCheck,
    ExternalLink,
    XCircle,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    AlertCircle,
} from "lucide-react";
import { PageLayout } from "@/components/ui";
import { saveBook } from "@/lib/epub";
import {
    Book,
    searchAllProviders,
    downloadBook,
    SearchResult as ProviderSearchResult,
} from "@/lib/ebook-providers";
import styles from "./page.module.css";

// ============ Types ============

interface DownloadState {
    status: 'idle' | 'downloading' | 'success' | 'error';
    error?: string;
}

interface SearchFilters {
    language?: string;
    source?: string;
}

// ============ Constants ============

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
];

const SOURCES = [
    { id: 'all', name: 'All Sources', emoji: '📚' },
    { id: 'gutenberg', name: 'Gutenberg', emoji: '📖' },
    { id: 'openlibrary', name: 'Open Library', emoji: '📗' },
    { id: 'internetarchive', name: 'Archive.org', emoji: '🏛️' },
];

const SUGGESTIONS = [
    "Pride and Prejudice",
    "1984",
    "The Great Gatsby",
    "Moby Dick",
    "Frankenstein",
    "Dracula",
];

// ============ Animation Variants ============

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring" as const, stiffness: 100, damping: 15 },
    },
};

// ============ Main Component ============

export default function ExplorePage() {
    const router = useRouter();

    // Search state
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Book[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [hasSearched, setHasSearched] = useState(false);

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>({});
    const [tempFilters, setTempFilters] = useState<SearchFilters>({});

    // Download states (per book)
    const [downloadStates, setDownloadStates] = useState<Map<string, DownloadState>>(new Map());

    // Saved books
    const [savedBooks, setSavedBooks] = useState<Set<string>>(new Set());

    // Count active filters
    const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all').length;

    // Update download state helper
    const updateDownloadState = useCallback((bookId: string, state: DownloadState) => {
        setDownloadStates(prev => {
            const updated = new Map(prev);
            updated.set(bookId, state);
            return updated;
        });
    }, []);

    // ============ Search ============

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        setLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const response: ProviderSearchResult = await searchAllProviders({
                query: searchQuery.trim(),
                language: filters.language,
                source: filters.source === 'all' ? undefined : filters.source as 'gutenberg' | 'openlibrary' | 'internetarchive',
            });

            setResults(response.books);
            setTotalCount(response.totalCount);
        } catch (err) {
            console.error('Search error:', err);
            setError('Search failed. Please try again.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const handleSearch = (e?: React.FormEvent) => {
        e?.preventDefault();
        performSearch(query);
    };

    const handleSuggestion = (suggestion: string) => {
        setQuery(suggestion);
        performSearch(suggestion);
    };

    // ============ Filters ============

    const applyFilters = () => {
        setFilters(tempFilters);
        setShowFilters(false);
        if (query.trim()) {
            performSearch(query);
        }
    };

    const clearFilters = () => {
        setTempFilters({});
        setFilters({});
        if (query.trim()) {
            performSearch(query);
        }
    };

    useEffect(() => {
        if (showFilters) {
            setTempFilters(filters);
        }
    }, [showFilters, filters]);

    // ============ Download ============

    const handleDownload = async (book: Book) => {
        const bookId = book.id;

        // Already downloading?
        if (downloadStates.get(bookId)?.status === 'downloading') {
            return;
        }

        // 1. Set downloading state
        updateDownloadState(bookId, { status: 'downloading' });

        try {
            // 2. Check if we have a download URL
            if (!book.downloadUrl) {
                throw new Error('No direct download available');
            }

            // 3. Download via existing proxy
            console.log(`Downloading: ${book.title} from ${book.downloadUrl}`);
            const arrayBuffer = await downloadBook(book);

            if (!arrayBuffer || arrayBuffer.byteLength < 1000) {
                throw new Error('Invalid file received');
            }

            console.log(`Downloaded ${arrayBuffer.byteLength} bytes`);

            // 4. Save to IndexedDB
            const saved = await saveBook({
                title: book.title,
                author: book.author,
                cover: book.cover || undefined,
                fileData: arrayBuffer,
            });

            // 5. Success!
            updateDownloadState(bookId, { status: 'success' });

            // Navigate to reader after brief delay
            setTimeout(() => {
                router.push(`/read/${saved.id}`);
            }, 500);

        } catch (error) {
            console.error('Download failed:', error);

            const errorMessage = error instanceof Error ? error.message : 'Download failed';
            updateDownloadState(bookId, {
                status: 'error',
                error: errorMessage
            });

            // If no download URL, offer preview
            if (book.previewUrl && errorMessage.includes('No direct download')) {
                // Will show "Open External" button in UI
            }
        }
    };

    // Retry download
    const retryDownload = (book: Book) => {
        updateDownloadState(book.id, { status: 'idle' });
        handleDownload(book);
    };

    // ============ Save/Unsave ============

    const toggleSaveBook = async (book: Book) => {
        const newSaved = new Set(savedBooks);
        if (newSaved.has(book.id)) {
            newSaved.delete(book.id);
        } else {
            newSaved.add(book.id);
        }
        setSavedBooks(newSaved);
    };

    // ============ Render ============

    return (
        <PageLayout>
            <div className={styles.container}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.searchSection}>
                        <h1 className={styles.title}>📚 Explore Books</h1>
                        <p className={styles.subtitle}>
                            Search free ebooks from Project Gutenberg, Open Library & Archive.org
                        </p>

                        <form onSubmit={handleSearch} className={styles.searchWrapper}>
                            <div className={styles.searchInputWrapper}>
                                <Search className={styles.searchIcon} size={20} />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search by title or author..."
                                    className={styles.searchInput}
                                    data-testid="search-input"
                                />
                            </div>

                            <button
                                type="button"
                                className={`${styles.filterToggle} ${showFilters ? styles.active : ''}`}
                                onClick={() => setShowFilters(!showFilters)}
                                aria-label="Toggle filters"
                            >
                                <Filter size={18} />
                                {activeFilterCount > 0 && (
                                    <span className={styles.filterCount}>{activeFilterCount}</span>
                                )}
                            </button>

                            <button
                                type="submit"
                                className={styles.searchButton}
                                disabled={loading || !query.trim()}
                            >
                                {loading ? <Loader2 size={18} className={styles.loadingSpinner} /> : 'Search'}
                            </button>
                        </form>

                        {/* Suggestions */}
                        {!hasSearched && (
                            <div className={styles.suggestions}>
                                <span className={styles.suggestionsLabel}>Try searching for:</span>
                                <div className={styles.suggestionChips}>
                                    {SUGGESTIONS.map(s => (
                                        <button
                                            key={s}
                                            className={styles.suggestionChip}
                                            onClick={() => handleSuggestion(s)}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Filter Panel */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className={styles.filterPanel}
                                >
                                    <div className={styles.filterSection}>
                                        <div className={styles.filterLabel}>Language</div>
                                        <div className={styles.filterOptions}>
                                            {LANGUAGES.map(lang => (
                                                <button
                                                    key={lang.code}
                                                    className={`${styles.filterChip} ${tempFilters.language === lang.code ? styles.active : ''}`}
                                                    onClick={() => setTempFilters(f => ({
                                                        ...f,
                                                        language: f.language === lang.code ? undefined : lang.code
                                                    }))}
                                                >
                                                    {lang.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.filterSection}>
                                        <div className={styles.filterLabel}>Source</div>
                                        <div className={styles.filterOptions}>
                                            {SOURCES.map(source => (
                                                <button
                                                    key={source.id}
                                                    className={`${styles.filterChip} ${tempFilters.source === source.id ? styles.active : ''}`}
                                                    onClick={() => setTempFilters(f => ({
                                                        ...f,
                                                        source: f.source === source.id ? undefined : source.id
                                                    }))}
                                                >
                                                    {source.emoji} {source.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.filterActions}>
                                        <button className={styles.clearFiltersBtn} onClick={clearFilters}>
                                            <XCircle size={14} /> Clear
                                        </button>
                                        <button className={styles.applyFiltersBtn} onClick={applyFilters}>
                                            Apply Filters
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </header>

                {/* Results */}
                <section className={styles.resultsSection} data-testid="search-results">
                    {/* Results Header */}
                    {results.length > 0 && (
                        <div className={styles.resultsHeader}>
                            <div className={styles.resultsCount}>
                                <strong>{totalCount}</strong> books found
                            </div>
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className={styles.loadingContainer}>
                            <Loader2 size={40} className={styles.loadingSpinner} />
                            <p className={styles.loadingText}>Searching...</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && !loading && (
                        <div className={styles.emptyState}>
                            <XCircle size={48} className={styles.emptyIcon} />
                            <h3 className={styles.emptyTitle}>{error}</h3>
                            <button className={styles.tryAgainBtn} onClick={handleSearch}>
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* No Results */}
                    {!loading && !error && hasSearched && results.length === 0 && (
                        <div className={styles.emptyState}>
                            <BookOpen size={48} className={styles.emptyIcon} />
                            <h3 className={styles.emptyTitle}>No books found</h3>
                            <p className={styles.emptySubtitle}>
                                Try a different search term or check external sources below
                            </p>
                        </div>
                    )}

                    {/* Results Grid */}
                    {!loading && results.length > 0 && (
                        <motion.div
                            className={styles.bookGrid}
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {results.map((book) => {
                                const downloadState = downloadStates.get(book.id);
                                const hasDirectDownload = !!book.downloadUrl;

                                return (
                                    <motion.div
                                        key={book.id}
                                        className={styles.bookCard}
                                        variants={itemVariants}
                                    >
                                        <div className={styles.bookCover}>
                                            {book.cover ? (
                                                <img
                                                    src={book.cover}
                                                    alt={book.title}
                                                    className={styles.coverImage}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className={styles.coverPlaceholder}>
                                                    <BookOpen className={styles.placeholderIcon} size={32} />
                                                    <span className={styles.placeholderTitle}>
                                                        {book.title}
                                                    </span>
                                                </div>
                                            )}

                                            <div className={styles.bookOverlay}>
                                                <div className={styles.formatTags}>
                                                    {book.formats?.some(f => f.mimeType.includes('epub')) && (
                                                        <span className={`${styles.formatTag} ${styles.epub}`}>EPUB</span>
                                                    )}
                                                    {book.formats?.some(f => f.mimeType.includes('pdf')) && (
                                                        <span className={`${styles.formatTag} ${styles.pdf}`}>PDF</span>
                                                    )}
                                                </div>

                                                <div className={styles.overlayActions}>
                                                    {/* Download Button */}
                                                    {hasDirectDownload && (
                                                        <button
                                                            className={`${styles.actionBtn} ${styles.downloadBtn} ${downloadState?.status === 'success' ? styles.success : ''} ${downloadState?.status === 'error' ? styles.error : ''}`}
                                                            onClick={() => downloadState?.status === 'error' ? retryDownload(book) : handleDownload(book)}
                                                            disabled={downloadState?.status === 'downloading'}
                                                            aria-label={`Download ${book.title}`}
                                                            data-testid="download-button"
                                                        >
                                                            {downloadState?.status === 'downloading' ? (
                                                                <><Loader2 size={14} className={styles.loadingSpinner} /></>
                                                            ) : downloadState?.status === 'success' ? (
                                                                <><CheckCircle size={14} /> Done</>
                                                            ) : downloadState?.status === 'error' ? (
                                                                <><AlertCircle size={14} /> Retry</>
                                                            ) : (
                                                                <><Download size={14} /> Download</>
                                                            )}
                                                        </button>
                                                    )}

                                                    {/* External Link (fallback) */}
                                                    {(!hasDirectDownload || downloadState?.status === 'error') && book.previewUrl && (
                                                        <a
                                                            href={book.previewUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`${styles.actionBtn} ${styles.previewBtn}`}
                                                        >
                                                            <ExternalLink size={14} /> Open
                                                        </a>
                                                    )}

                                                    {/* Save Button */}
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.saveBtn} ${savedBooks.has(book.id) ? styles.saved : ''}`}
                                                        onClick={() => toggleSaveBook(book)}
                                                        aria-label={savedBooks.has(book.id) ? 'Remove from saved' : 'Save book'}
                                                    >
                                                        {savedBooks.has(book.id) ? (
                                                            <BookmarkCheck size={14} />
                                                        ) : (
                                                            <Bookmark size={14} />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.bookInfo}>
                                            <h3 className={styles.bookTitle}>{book.title}</h3>
                                            <p className={styles.bookAuthor}>{book.author || 'Unknown Author'}</p>

                                            <div className={styles.bookMeta}>
                                                <span className={styles.sourceBadge}>
                                                    {book.source === 'gutenberg' && '📖 Gutenberg'}
                                                    {book.source === 'openlibrary' && '📗 OpenLibrary'}
                                                    {book.source === 'internetarchive' && '🏛️ Archive'}
                                                </span>

                                                {book.downloadCount && book.downloadCount > 0 && (
                                                    <span className={styles.downloadCount}>
                                                        {book.downloadCount.toLocaleString()} downloads
                                                    </span>
                                                )}
                                            </div>

                                            {/* Error message */}
                                            {downloadState?.status === 'error' && (
                                                <div className={styles.errorBanner} role="alert">
                                                    <AlertCircle size={12} />
                                                    <span>{downloadState.error}</span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}

                    {/* External Fallback Section */}
                    {hasSearched && query.trim() && (
                        <section className={styles.externalFallback}>
                            <h3>Not finding what you need? Try these sources:</h3>
                            <div className={styles.externalLinks}>
                                <a
                                    href={`https://www.google.com/search?q="${encodeURIComponent(query)}"+epub+OR+pdf+filetype:epub`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Search size={16} /> Google Books
                                </a>
                                <a
                                    href={`https://archive.org/search?query=${encodeURIComponent(query)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink size={16} /> Internet Archive
                                </a>
                                <a
                                    href={`https://www.goodreads.com/search?q=${encodeURIComponent(query)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <BookOpen size={16} /> Goodreads
                                </a>
                            </div>
                        </section>
                    )}
                </section>
            </div>
        </PageLayout>
    );
}
