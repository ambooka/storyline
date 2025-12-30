"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    BookOpen,
    Loader2,
} from "lucide-react";
import { useReaderStore, ThemeMode, FontFamily } from "@/stores/readerStore";
import { getBook, StoredBook, EpubParser, updateBookProgress } from "@/lib/epub";
import { getBookFromCache } from "@/lib/cache";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { ReaderContextMenu } from "@/components/reader/ReaderContextMenu";
import { CollaborativeReader } from "@/components/collaborative";
import { useTextToSpeech } from "@/lib/audio";
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
        position: { x: number; y: number } | null;
        selectedText: string;
    }>({ position: null, selectedText: "" });

    // Reactions storage
    const [reactions, setReactions] = useState<Array<{
        cfi: string;
        emoji: string;
        text: string;
        timestamp: number;
    }>>([]);

    // TTS hook
    const tts = useTextToSpeech();

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

                        if (storedBook.currentCfi) {
                            await parser.goTo(storedBook.currentCfi);
                            setCurrentCfi(storedBook.currentCfi);
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
            {/* Minimal Header */}
            <header className={styles.minimalHeader}>
                <button className={styles.backBtn} onClick={() => router.push("/")}>
                    <ArrowLeft size={18} />
                </button>
                <div className={styles.headerMeta}>
                    <h1 className={styles.bookTitle}>{book?.title || "Untitled"}</h1>
                    <span className={styles.chapterLabel}>{currentChapter}</span>
                </div>
            </header>

            {/* ePub Content */}
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
            />

            {/* Custom Context Menu */}
            <AnimatePresence>
                {contextMenu.position && (
                    <ReaderContextMenu
                        position={contextMenu.position}
                        selectedText={contextMenu.selectedText}
                        onClose={() => setContextMenu({ position: null, selectedText: "" })}
                        onCopy={handleCopy}
                        onHighlight={handleHighlight}
                        onReact={handleReact}
                        onNote={handleNote}
                        onSpeak={handleSpeak}
                        onSearch={handleSearch}
                        onShare={handleShare}
                        onBookmark={handleToggleBookmark}
                    />
                )}
            </AnimatePresence>

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
        </div>
    );
}
