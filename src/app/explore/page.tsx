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
import { PageLayout, ThemeProfileControls } from "@/components/ui";
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
    progress?: number; // 0-100 percentage
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

// Fallback popular books with verified working download URLs
const FALLBACK_BOOKS: Book[] = [
    {
        id: 'gutenberg-1342',
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        authors: ['Jane Austen'],
        cover: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
        description: 'A romantic novel following the emotional development of Elizabeth Bennet.',
        subjects: ['Fiction', 'Romance', 'Classic'],
        languages: ['en'],
        downloadUrl: 'https://www.gutenberg.org/cache/epub/1342/pg1342-images.epub',
        formats: [{ mimeType: 'application/epub+zip', url: 'https://www.gutenberg.org/cache/epub/1342/pg1342-images.epub', label: 'EPUB' }],
        source: 'gutenberg',
        downloadCount: 100000,
        publishedYear: 1813,
    },
    {
        id: 'gutenberg-84',
        title: 'Frankenstein',
        author: 'Mary Shelley',
        authors: ['Mary Shelley'],
        cover: 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg',
        description: 'The story of Victor Frankenstein and the monster he created.',
        subjects: ['Fiction', 'Horror', 'Classic'],
        languages: ['en'],
        downloadUrl: 'https://www.gutenberg.org/cache/epub/84/pg84-images.epub',
        formats: [{ mimeType: 'application/epub+zip', url: 'https://www.gutenberg.org/cache/epub/84/pg84-images.epub', label: 'EPUB' }],
        source: 'gutenberg',
        downloadCount: 50000,
        publishedYear: 1818,
    },
    {
        id: 'gutenberg-345',
        title: 'Dracula',
        author: 'Bram Stoker',
        authors: ['Bram Stoker'],
        cover: 'https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg',
        description: 'The classic vampire novel.',
        subjects: ['Fiction', 'Horror', 'Gothic'],
        languages: ['en'],
        downloadUrl: 'https://www.gutenberg.org/cache/epub/345/pg345-images.epub',
        formats: [{ mimeType: 'application/epub+zip', url: 'https://www.gutenberg.org/cache/epub/345/pg345-images.epub', label: 'EPUB' }],
        source: 'gutenberg',
        downloadCount: 45000,
        publishedYear: 1897,
    },
    {
        id: 'gutenberg-2701',
        title: 'Moby Dick',
        author: 'Herman Melville',
        authors: ['Herman Melville'],
        cover: 'https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg',
        description: 'The epic tale of Captain Ahab and the white whale.',
        subjects: ['Fiction', 'Adventure', 'Classic'],
        languages: ['en'],
        downloadUrl: 'https://www.gutenberg.org/cache/epub/2701/pg2701-images.epub',
        formats: [{ mimeType: 'application/epub+zip', url: 'https://www.gutenberg.org/cache/epub/2701/pg2701-images.epub', label: 'EPUB' }],
        source: 'gutenberg',
        downloadCount: 40000,
        publishedYear: 1851,
    },
    {
        id: 'gutenberg-1661',
        title: 'The Adventures of Sherlock Holmes',
        author: 'Arthur Conan Doyle',
        authors: ['Arthur Conan Doyle'],
        cover: 'https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg',
        description: 'A collection of twelve short stories featuring the famous detective.',
        subjects: ['Fiction', 'Mystery', 'Detective'],
        languages: ['en'],
        downloadUrl: 'https://www.gutenberg.org/cache/epub/1661/pg1661-images.epub',
        formats: [{ mimeType: 'application/epub+zip', url: 'https://www.gutenberg.org/cache/epub/1661/pg1661-images.epub', label: 'EPUB' }],
        source: 'gutenberg',
        downloadCount: 60000,
        publishedYear: 1892,
    },
    {
        id: 'gutenberg-11',
        title: "Alice's Adventures in Wonderland",
        author: 'Lewis Carroll',
        authors: ['Lewis Carroll'],
        cover: 'https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg',
        description: "The classic tale of Alice's journey through Wonderland.",
        subjects: ['Fiction', 'Fantasy', 'Children'],
        languages: ['en'],
        downloadUrl: 'https://www.gutenberg.org/cache/epub/11/pg11-images.epub',
        formats: [{ mimeType: 'application/epub+zip', url: 'https://www.gutenberg.org/cache/epub/11/pg11-images.epub', label: 'EPUB' }],
        source: 'gutenberg',
        downloadCount: 55000,
        publishedYear: 1865,
    },
    {
        id: 'gutenberg-1232',
        title: 'The Prince',
        author: 'Niccolò Machiavelli',
        authors: ['Niccolò Machiavelli'],
        cover: 'https://www.gutenberg.org/cache/epub/1232/pg1232.cover.medium.jpg',
        description: 'A political treatise on statecraft and power.',
        subjects: ['Political Science', 'Philosophy', 'Classic'],
        languages: ['en'],
        downloadUrl: 'https://www.gutenberg.org/cache/epub/1232/pg1232-images.epub',
        formats: [{ mimeType: 'application/epub+zip', url: 'https://www.gutenberg.org/cache/epub/1232/pg1232-images.epub', label: 'EPUB' }],
        source: 'gutenberg',
        downloadCount: 35000,
        publishedYear: 1532,
    },
    {
        id: 'gutenberg-174',
        title: 'The Picture of Dorian Gray',
        author: 'Oscar Wilde',
        authors: ['Oscar Wilde'],
        cover: 'https://www.gutenberg.org/cache/epub/174/pg174.cover.medium.jpg',
        description: 'A philosophical novel about beauty, corruption, and moral depravity.',
        subjects: ['Fiction', 'Gothic', 'Classic'],
        languages: ['en'],
        downloadUrl: 'https://www.gutenberg.org/cache/epub/174/pg174-images.epub',
        formats: [{ mimeType: 'application/epub+zip', url: 'https://www.gutenberg.org/cache/epub/174/pg174-images.epub', label: 'EPUB' }],
        source: 'gutenberg',
        downloadCount: 42000,
        publishedYear: 1890,
    },
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
    const [results, setResults] = useState<Book[]>(FALLBACK_BOOKS);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(FALLBACK_BOOKS.length);
    const [hasSearched, setHasSearched] = useState(false);

    // Filter state
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>({});
    const [tempFilters, setTempFilters] = useState<SearchFilters>({});

    // Download states (per book)
    const [downloadStates, setDownloadStates] = useState<Map<string, DownloadState>>(new Map());

    // Saved books
    const [savedBooks, setSavedBooks] = useState<Set<string>>(new Set());

    // Fallback books are already loaded via initial state, no need to fetch on mount

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
            // Show fallback books when no query instead of empty
            setResults(FALLBACK_BOOKS);
            setTotalCount(FALLBACK_BOOKS.length);
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

            if (response.books.length > 0) {
                console.log(`Search returned ${response.books.length} books:`, response.books.map(b => b.title));
                setResults(response.books);
                setTotalCount(response.totalCount);
            } else {
                // No results found, show fallback
                setResults(FALLBACK_BOOKS);
                setTotalCount(FALLBACK_BOOKS.length);
                setError('No books found for that search. Showing popular classics instead.');
            }
        } catch (err) {
            console.error('Search error:', err);
            setError('Search failed. Showing popular classics instead.');
            // Use fallback books on error instead of empty
            setResults(FALLBACK_BOOKS);
            setTotalCount(FALLBACK_BOOKS.length);
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

        // 1. Set downloading state with 0 progress
        updateDownloadState(bookId, { status: 'downloading', progress: 0 });

        try {
            // 2. Check if we have a download URL
            if (!book.downloadUrl) {
                throw new Error('No direct download available');
            }

            console.log(`Downloading: ${book.title} from ${book.downloadUrl}`);

            // 3. Download via proxy with progress tracking
            const proxyUrl = `/api/download?url=${encodeURIComponent(book.downloadUrl)}`;
            const response = await fetch(proxyUrl);

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            // Get content length for progress calculation
            const contentLength = response.headers.get('content-length');
            const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

            if (!response.body) {
                throw new Error('No response body');
            }

            // Use ReadableStream to track progress
            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            let receivedBytes = 0;

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                receivedBytes += value.length;

                // Update progress
                if (totalBytes > 0) {
                    const progress = Math.round((receivedBytes / totalBytes) * 100);
                    updateDownloadState(bookId, { status: 'downloading', progress });
                } else {
                    // Unknown size - show received bytes as "downloading"
                    updateDownloadState(bookId, {
                        status: 'downloading',
                        progress: -1 // Will show as indeterminate with bytes count
                    });
                }
            }

            // Combine chunks into ArrayBuffer
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const arrayBuffer = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                arrayBuffer.set(chunk, offset);
                offset += chunk.length;
            }

            if (arrayBuffer.byteLength < 1000) {
                throw new Error('Invalid file received');
            }

            console.log(`Downloaded ${arrayBuffer.byteLength} bytes`);

            // 4. Save to IndexedDB
            const saved = await saveBook({
                title: book.title,
                author: book.author,
                cover: book.cover || undefined,
                fileData: arrayBuffer.buffer,
            });

            // 5. Success!
            updateDownloadState(bookId, { status: 'success', progress: 100 });

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
                    <div className={styles.headerTop}>
                        <h1 className={styles.pageTitle}>Explore</h1>
                        <ThemeProfileControls />
                    </div>
                    <div className={styles.searchSection}>
                        <form onSubmit={handleSearch} className={styles.searchWrapper}>
                            <div className={styles.searchInputWrapper}>
                                <Search className={styles.searchIcon} size={18} />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search books..."
                                    className={styles.searchInput}
                                    data-testid="search-input"
                                />
                                <div className={styles.searchActions}>
                                    <button
                                        type="button"
                                        className={`${styles.filterBtn} ${showFilters ? styles.active : ''}`}
                                        onClick={() => setShowFilters(!showFilters)}
                                        aria-label="Toggle filters"
                                    >
                                        <Filter size={16} />
                                    </button>
                                    <button
                                        type="submit"
                                        className={styles.searchButton}
                                        disabled={loading || !query.trim()}
                                        aria-label="Search"
                                    >
                                        {loading ? <Loader2 size={16} className={styles.loadingSpinner} /> : <Search size={16} />}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

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
                    {results.length > 0 && (
                        <div className={styles.bookGrid}>
                            {results.map((book) => {
                                const downloadState = downloadStates.get(book.id);
                                const hasDirectDownload = !!book.downloadUrl;

                                return (
                                    <div
                                        key={book.id}
                                        className={styles.bookCard}
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
                                                                <>
                                                                    <Loader2 size={14} className={styles.loadingSpinner} />
                                                                    {downloadState.progress !== undefined && downloadState.progress >= 0
                                                                        ? `${downloadState.progress}%`
                                                                        : '...'}
                                                                </>
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
                                    </div>
                                );
                            })}
                        </div>
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
