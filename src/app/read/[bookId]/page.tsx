"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    ArrowLeft,
    BookOpen,
    Loader2,
    MessageCircle,
} from "lucide-react";
import { useReaderStore, ThemeMode, FontFamily } from "@/stores/readerStore";
import { getBook, StoredBook, EpubParser, updateBookProgress } from "@/lib/epub";
import { getBookFromCache } from "@/lib/cache";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { ReaderContextMenu } from "@/components/reader/ReaderContextMenu";
import { CollaborativeReader } from "@/components/collaborative";
import { CommentsPanel } from "@/components/reader/CommentsPanel";
import { useAITextToSpeech } from "@/lib/ai-tts";
import styles from "./page.module.css";

export default function ReaderPage() {
    const params = useParams();
    const router = useRouter();
    const bookId = params.bookId as string;
    const viewerRef = useRef<HTMLDivElement>(null);
    const parserRef = useRef<EpubParser | null>(null);

    // Reader settings from store
    const {
        theme,
        fontFamily,
        fontSize,
        lineHeight,
        setTheme,
        setFontSize,
        setLineHeight,
    } = useReaderStore();

    // Local state
    const [book, setBook] = useState<StoredBook | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [currentChapter, setCurrentChapter] = useState("Loading...");
    const [currentCfi, setCurrentCfi] = useState("");
    const [pageText, setPageText] = useState("");
    const [isBookmarked, setIsBookmarked] = useState(false);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number; } | null;
        selectedText: string;
    }>({
        isOpen: false,
        position: null,
        selectedText: "",
    });

    // Reactions storage
    const [reactions, setReactions] = useState<Array<{
        cfi: string;
        emoji: string;
        text: string;
        timestamp: number;
    }>>([]);

    // TTS hook with word tracking
    const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
    const [autoPageTurn, setAutoPageTurn] = useState(true);
    const [showCommentsPanel, setShowCommentsPanel] = useState(false);

    const tts = useAITextToSpeech({
        onWordChange: (wordIndex, word) => {
            setHighlightedWordIndex(wordIndex);
            highlightWordInIframe(wordIndex);
        },
        onEnd: () => {
            // Auto-turn page if enabled and more content exists
            if (autoPageTurn && parserRef.current) {
                handleNextPage();
                // Continue reading on new page after short delay
                setTimeout(() => {
                    extractPageText();
                }, 300);
            }
        }
    });

    // Highlight word in iframe and scroll to it
    const highlightWordInIframe = useCallback((index: number) => {
        const iframe = viewerRef.current?.querySelector('iframe');
        if (!iframe?.contentDocument) return;

        // Remove previous highlight
        const prevHighlight = iframe.contentDocument.querySelector('.tts-highlight');
        prevHighlight?.classList.remove('tts-highlight');

        // Add highlight to current word
        const wordEl = iframe.contentDocument.querySelector(`[data-word-index="${index}"]`);
        if (wordEl) {
            wordEl.classList.add('tts-highlight');
            wordEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, []);

    // Sync highlight state with iframe (backup method)
    useEffect(() => {
        if (highlightedWordIndex >= 0) {
            highlightWordInIframe(highlightedWordIndex);
        }
    }, [highlightedWordIndex, highlightWordInIframe]);

    // Clear highlights when not playing
    useEffect(() => {
        if (!tts.isPlaying && highlightedWordIndex >= 0) {
            const iframe = viewerRef.current?.querySelector('iframe');
            if (iframe?.contentDocument) {
                const prevHighlight = iframe.contentDocument.querySelector('.tts-highlight');
                prevHighlight?.classList.remove('tts-highlight');
            }
            setHighlightedWordIndex(-1);
        }
    }, [tts.isPlaying, highlightedWordIndex]);

    // Load reactions from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(`reactions_${bookId}`);
        if (stored) {
            setReactions(JSON.parse(stored));
        }
    }, [bookId]);

    // Save reactions to localStorage
    const saveReaction = useCallback((emoji: string, text: string) => {
        const newReaction = {
            cfi: currentCfi,
            emoji,
            text: text.slice(0, 100),
            timestamp: Date.now(),
        };
        const updated = [...reactions, newReaction];
        setReactions(updated);
        localStorage.setItem(`reactions_${bookId}`, JSON.stringify(updated));
    }, [bookId, currentCfi, reactions]);

    // Delete reaction
    const deleteReaction = useCallback((index: number) => {
        const updated = reactions.filter((_, i) => i !== index);
        setReactions(updated);
        localStorage.setItem(`reactions_${bookId}`, JSON.stringify(updated));
    }, [bookId, reactions]);

    // Comments management  
    const [comments, setComments] = useState<Array<{
        id: string;
        cfi: string;
        text: string;
        note?: string;
        timestamp: number;
    }>>([]);

    // Load comments from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(`comments_${bookId}`);
        if (stored) {
            setComments(JSON.parse(stored));
        }
    }, [bookId]);

    const addComment = useCallback((text: string, note?: string) => {
        const newComment = {
            id: crypto.randomUUID(),
            cfi: currentCfi,
            text: text.slice(0, 200),
            note,
            timestamp: Date.now(),
        };
        const updated = [...comments, newComment];
        setComments(updated);
        localStorage.setItem(`comments_${bookId}`, JSON.stringify(updated));
    }, [bookId, currentCfi, comments]);

    const deleteComment = useCallback((id: string) => {
        const updated = comments.filter(c => c.id !== id);
        setComments(updated);
        localStorage.setItem(`comments_${bookId}`, JSON.stringify(updated));
    }, [bookId, comments]);

    // Load book from IndexedDB
    useEffect(() => {
        async function loadBook() {
            setLoading(true);
            setError(null);

            try {
                const cachedBook = await getBookFromCache(bookId);
                const storedBook = cachedBook || await getBook(bookId);

                if (!storedBook) {
                    setError("Book not found. Please go back and try again.");
                    setLoading(false);
                    return;
                }

                setBook(storedBook);
                setProgress(storedBook.progress || 0);

                if (viewerRef.current && storedBook.file) {
                    const parser = new EpubParser();
                    parserRef.current = parser;

                    try {
                        const bookInfo = await parser.loadFromArrayBuffer(storedBook.file);
                        setCurrentChapter(bookInfo.chapters?.[0]?.label || storedBook.title);

                        // Add a global error handler for uncaught epub.js errors
                        const epubErrorHandler = (event: ErrorEvent) => {
                            if (event.message.includes('indexOf') ||
                                event.message.includes('undefined') ||
                                event.filename?.includes('epub') ||
                                event.filename?.includes('path.js') ||
                                event.filename?.includes('archive.js')) {
                                console.error('Caught unhandled EPUB error:', event.message);
                                event.preventDefault();
                                setError("This EPUB file has an incompatible format and cannot be displayed. Try a different version or source.");
                            }
                        };
                        window.addEventListener('error', epubErrorHandler);

                        await parser.renderTo(viewerRef.current, {
                            width: "100%",
                            height: "100%",
                            flow: "scrolled",
                            onError: (err) => {
                                console.error('EPUB async error:', err);
                                setError(`EPUB rendering failed: ${err.message}`);
                            },
                        });

                        // Remove the handler after successful render
                        window.removeEventListener('error', epubErrorHandler);

                        applyTheme(theme);

                        // Inject word wrapping for TTS highlighting
                        parser.injectWordWrapping();

                        if (storedBook.currentCfi) {
                            console.log(`Restoring progress: ${storedBook.progress}% at CFI: ${storedBook.currentCfi}`);
                            await parser.goTo(storedBook.currentCfi);
                            setCurrentCfi(storedBook.currentCfi);
                        } else {
                            console.log('No saved progress found, starting from beginning');
                        }

                        parser.onRelocated((location) => {
                            setProgress(location.progress);
                            setCurrentCfi(location.cfi);
                            updateBookProgress(bookId, location.progress, location.cfi);
                            // Extract page text after slight delay
                            setTimeout(extractPageText, 100);
                        });

                        // Initial text extraction after render
                        setTimeout(extractPageText, 500);

                    } catch (parseError) {
                        console.error("Failed to parse ePub:", parseError);
                        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);

                        // Detect common epub.js errors
                        if (errorMessage.includes('indexOf') || errorMessage.includes('undefined')) {
                            setError("This book has an unsupported format. The EPUB file structure is incompatible with our reader. Please try downloading the book directly from the source website.");
                        } else if (errorMessage.includes('corrupted') || errorMessage.includes('zip')) {
                            setError("The book file appears to be corrupted or incomplete. Please try re-downloading.");
                        } else {
                            setError("Failed to load book content. This EPUB format may not be supported.");
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load book:", err);
                setError("Failed to load book from storage.");
            } finally {
                setLoading(false);
            }
        }

        loadBook();

        return () => {
            if (parserRef.current) {
                parserRef.current.destroy();
            }
        };
    }, [bookId]);

    // Extract visible text for TTS - improved method
    const extractPageText = useCallback(() => {
        if (!viewerRef.current) return;

        // Try multiple methods to get text
        let text = "";

        // Method 1: Direct text content
        text = viewerRef.current.innerText || viewerRef.current.textContent || "";

        // Method 2: Look for iframe content (epub.js uses iframes)
        if (!text || text.trim().length < 50) {
            const iframe = viewerRef.current.querySelector("iframe");
            if (iframe?.contentDocument?.body) {
                text = iframe.contentDocument.body.innerText || iframe.contentDocument.body.textContent || "";
            }
        }

        // Method 3: Look for any text containers
        if (!text || text.trim().length < 50) {
            const containers = viewerRef.current.querySelectorAll("p, div, span");
            const texts: string[] = [];
            containers.forEach(el => {
                if (el.textContent) texts.push(el.textContent);
            });
            text = texts.join(" ");
        }

        // Clean up the text
        const cleanText = text
            .replace(/\s+/g, " ")
            .replace(/([.!?])\s*/g, "$1 ")
            .trim()
            .slice(0, 5000);

        setPageText(cleanText);
    }, []);

    // Apply theme to ePub renderer
    const applyTheme = useCallback((t: ThemeMode) => {
        if (!parserRef.current) return;

        const themes: Record<ThemeMode, { body: Record<string, string> }> = {
            light: { body: { background: "#E4E9F0", color: "#2D3748" } },
            dark: { body: { background: "#1A1D24", color: "#E2E8F0" } },
            sepia: { body: { background: "#F4ECD8", color: "#5B4636" } },
            amoled: { body: { background: "#000000", color: "#ffffff" } },
        };

        parserRef.current.applyTheme(themes[t]);
    }, []);

    useEffect(() => {
        applyTheme(theme);
    }, [theme, applyTheme]);

    useEffect(() => {
        if (parserRef.current) {
            parserRef.current.setFontSize(`${fontSize}px`);
        }
    }, [fontSize]);

    // Navigation
    const handlePrevPage = useCallback(async () => {
        if (parserRef.current) {
            await parserRef.current.prevPage();
            setTimeout(extractPageText, 100);
        }
    }, [extractPageText]);

    const handleNextPage = useCallback(async () => {
        if (parserRef.current) {
            await parserRef.current.nextPage();
            setTimeout(extractPageText, 100);
        }
    }, [extractPageText]);

    const handleToggleBookmark = useCallback(() => {
        setIsBookmarked(!isBookmarked);
        // In production, save to IndexedDB
    }, [isBookmarked]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") handlePrevPage();
            if (e.key === "ArrowRight") handleNextPage();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handlePrevPage, handleNextPage]);

    // Context menu handlers
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();

        const selection = window.getSelection();
        const selectedText = selection?.toString().trim() || "";

        // Also check iframe selection
        let iframeText = "";
        const iframe = viewerRef.current?.querySelector("iframe");
        if (iframe?.contentWindow) {
            const iframeSelection = iframe.contentWindow.getSelection();
            iframeText = iframeSelection?.toString().trim() || "";
        }

        const finalText = selectedText || iframeText;

        setContextMenu({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
            selectedText: finalText,
        });
    }, []);

    // Attach context menu to iframe after it loads
    useEffect(() => {
        if (loading) return;

        const attachIframeContextMenu = () => {
            const iframe = viewerRef.current?.querySelector("iframe");
            if (iframe?.contentDocument) {
                // Attach context menu to iframe
                iframe.contentDocument.addEventListener("contextmenu", (e: MouseEvent) => {
                    e.preventDefault();

                    // Get selected text from iframe
                    const selection = iframe.contentWindow?.getSelection();
                    const selectedText = selection?.toString().trim() || "";

                    // Get position relative to viewport
                    const rect = iframe.getBoundingClientRect();
                    const x = e.clientX + rect.left;
                    const y = e.clientY + rect.top;

                    setContextMenu({
                        isOpen: true,
                        position: { x, y },
                        selectedText,
                    });
                });

                // Also handle mouseup for text selection
                iframe.contentDocument.addEventListener("mouseup", () => {
                    const selection = iframe.contentWindow?.getSelection();
                    if (selection && selection.toString().trim()) {
                        // Text is selected, ready for context menu
                    }
                });
            }
        };

        // Try to attach immediately and also with delay (for async iframe loading)
        attachIframeContextMenu();
        const timer = setTimeout(attachIframeContextMenu, 1000);
        const timer2 = setTimeout(attachIframeContextMenu, 2000);

        return () => {
            clearTimeout(timer);
            clearTimeout(timer2);
        };
    }, [loading, book]);

    // Context menu action handlers
    const handleCopy = useCallback(() => {
        if (contextMenu.selectedText) {
            navigator.clipboard.writeText(contextMenu.selectedText);
        }
    }, [contextMenu.selectedText]);

    const handleSpeak = useCallback(() => {
        const textToSpeak = contextMenu.selectedText || pageText;
        if (textToSpeak) {
            tts.speak(textToSpeak);
        }
    }, [contextMenu.selectedText, pageText, tts]);

    const handleHighlight = useCallback((color: string) => {
        // In production, save highlight to storage
        console.log("Highlight:", color, contextMenu.selectedText);
    }, [contextMenu.selectedText]);

    const handleNote = useCallback(() => {
        // In production, open note modal
        console.log("Add note:", contextMenu.selectedText);
    }, [contextMenu.selectedText]);

    const handleReact = useCallback((emoji: string) => {
        saveReaction(emoji, contextMenu.selectedText);
    }, [contextMenu.selectedText, saveReaction]);

    const handleSearch = useCallback(() => {
        if (contextMenu.selectedText) {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(contextMenu.selectedText)}`, "_blank");
        }
    }, [contextMenu.selectedText]);

    const handleShare = useCallback(() => {
        if (contextMenu.selectedText && book) {
            const quote = `"${contextMenu.selectedText}" — ${book.title}`;
            if (navigator.share) {
                navigator.share({ text: quote });
            } else {
                navigator.clipboard.writeText(quote);
            }
        }
    }, [contextMenu.selectedText, book]);

    // Get font family CSS
    const getFontFamilyCSS = (font: FontFamily) => {
        switch (font) {
            case "literata": return "'Literata', Georgia, serif";
            case "inter": return "'Inter', system-ui, sans-serif";
            case "opendyslexic": return "'OpenDyslexic', sans-serif";
            case "system": return "system-ui, -apple-system, sans-serif";
            default: return "'Literata', Georgia, serif";
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className={`${styles.loadingPage} ${styles[`theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={styles.loadingContent}
                >
                    <div className={styles.loadingBook}>
                        <BookOpen size={48} />
                    </div>
                    <Loader2 size={24} className={styles.spinner} />
                    <p>Opening your book...</p>
                </motion.div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`${styles.errorPage} ${styles[`theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.errorContent}
                >
                    <BookOpen size={64} className={styles.errorIcon} />
                    <h2>Unable to Load Book</h2>
                    <p>{error}</p>
                    <button onClick={() => router.push("/")} className={styles.backButton}>
                        <ArrowLeft size={18} />
                        Go Back to Library
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div
            className={`${styles.readerPage} ${styles[`theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}
            onContextMenu={handleContextMenu}
        >
            {/* Reading Progress Bar */}
            <div className={styles.readingProgressBar}>
                <div
                    className={styles.readingProgressFill}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Minimal Back Button */}
            <div className={styles.minimalHeader}>
                <button
                    className={styles.backBtn}
                    onClick={() => router.push("/")}
                >
                    <ChevronLeft size={20} />
                </button>

                {book && (
                    <div className={styles.headerMeta}>
                        <span className={styles.bookTitle}>{book.title}</span>
                        <span className={styles.chapterLabel}>{currentChapter}</span>
                    </div>
                )}

                {/* Floating Comments/Reactions Button */}
                <button
                    className={`${styles.backBtn} ${showCommentsPanel ? styles.backBtnActive : ""}`}
                    onClick={() => setShowCommentsPanel(!showCommentsPanel)}
                    style={{ marginLeft: "auto" }}
                >
                    <MessageCircle size={20} />
                    {(reactions.length + comments.length) > 0 && (
                        <span className={styles.badge}>{reactions.length + comments.length}</span>
                    )}
                </button>
            </div> {/* ePub Content */}
            <main className={styles.content}>
                <div
                    ref={viewerRef}
                    className={styles.epubViewer}
                    style={{
                        fontFamily: getFontFamilyCSS(fontFamily),
                        lineHeight: lineHeight,
                    }}
                />
            </main>

            {/* Touch Zones */}
            <div className={styles.touchZoneLeft} onClick={handlePrevPage} />
            <div className={styles.touchZoneRight} onClick={handleNextPage} />

            {/* Floating Toolbar */}
            <ReaderToolbar
                pageText={pageText}
                theme={theme}
                onThemeChange={setTheme}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                lineHeight={lineHeight}
                onLineHeightChange={setLineHeight}
                isBookmarked={isBookmarked}
                onToggleBookmark={handleToggleBookmark}
                progress={progress}
                currentChapter={currentChapter}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
                autoPageTurn={autoPageTurn}
                onAutoPageTurnChange={setAutoPageTurn}
            />

            {/* Custom Context Menu */}
            <ReaderContextMenu
                position={contextMenu.isOpen ? contextMenu.position : null}
                selectedText={contextMenu.selectedText}
                onSpeak={() => {
                    if (contextMenu.selectedText) {
                        tts.speak(contextMenu.selectedText);
                    }
                    setContextMenu(prev => ({ ...prev, isOpen: false, position: null }));
                }}
                onHighlight={(color) => {
                    handleHighlight(color);
                    setContextMenu(prev => ({ ...prev, isOpen: false, position: null }));
                }}
                onReact={(emoji: string) => {
                    if (contextMenu.selectedText) {
                        saveReaction(emoji, contextMenu.selectedText);
                    }
                    setContextMenu(prev => ({ ...prev, isOpen: false, position: null }));
                }}
                onNote={() => {
                    // Show comments panel when note is clicked
                    if (contextMenu.selectedText) {
                        addComment(contextMenu.selectedText);
                        setShowCommentsPanel(true);
                    }
                    setContextMenu(prev => ({ ...prev, isOpen: false, position: null }));
                }}
                onCopy={handleCopy}
                onSearch={handleSearch}
                onShare={handleShare}
                onBookmark={handleToggleBookmark}
                onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false, position: null }))}
            />

            {/* Collaborative Reading */}
            {book && (
                <CollaborativeReader
                    bookId={bookId}
                    bookTitle={book.title}
                    bookCover={book.cover || undefined}
                    currentPosition={progress}
                    currentCfi={currentCfi}
                    selectedText={contextMenu.selectedText}
                />
            )}

            {/* Comments Panel */}
            <AnimatePresence>
                {showCommentsPanel && (
                    <CommentsPanel
                        bookId={bookId}
                        comments={comments}
                        reactions={reactions}
                        onAddComment={addComment}
                        onDeleteComment={deleteComment}
                        onDeleteReaction={deleteReaction}
                        onClose={() => setShowCommentsPanel(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
