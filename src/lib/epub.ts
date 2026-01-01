import ePub, { Book, Rendition, Contents } from 'epubjs';
import Dexie, { Table } from 'dexie';

// ========== Database Schema ==========
export interface StoredBook {
    id: string;
    title: string;
    author: string;
    cover?: string;
    file: ArrayBuffer;
    progress: number; // 0-100
    currentCfi?: string; // Current location in book
    lastRead: Date;
    createdAt: Date;
}

export interface Highlight {
    id: string;
    bookId: string;
    cfi: string;
    text: string;
    color: 'yellow' | 'green' | 'blue' | 'purple';
    note?: string;
    createdAt: Date;
}

export interface Bookmark {
    id: string;
    bookId: string;
    cfi: string;
    title: string;
    createdAt: Date;
}

// ========== IndexedDB with Dexie ==========
class StorylineDB extends Dexie {
    books!: Table<StoredBook>;
    highlights!: Table<Highlight>;
    bookmarks!: Table<Bookmark>;

    constructor() {
        super('storyline');
        this.version(1).stores({
            books: 'id, title, author, lastRead',
            highlights: 'id, bookId, cfi',
            bookmarks: 'id, bookId, cfi',
        });
    }
}

export const db = new StorylineDB();

// ========== ePub Parser Class ==========
export class EpubParser {
    private book: Book | null = null;
    private rendition: Rendition | null = null;

    async loadFromFile(file: File): Promise<{
        title: string;
        author: string;
        cover: string | null;
        chapters: { href: string; label: string }[];
    }> {
        const arrayBuffer = await file.arrayBuffer();
        return this.loadFromArrayBuffer(arrayBuffer);
    }

    async loadFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<{
        title: string;
        author: string;
        cover: string | null;
        chapters: { href: string; label: string }[];
    }> {
        // Validate ArrayBuffer
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            throw new Error('Empty or missing file data');
        }

        console.log(`Loading EPUB: ${arrayBuffer.byteLength} bytes`);

        // Check for ZIP signature (EPUB is a ZIP file)
        const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
        const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B;

        if (!isZip) {
            console.error('File is not a valid EPUB (ZIP format)');
            console.error('First 4 bytes:', Array.from(bytes).map(b => b.toString(16)));
            // Check if it's HTML (error page)
            const first100 = new TextDecoder().decode(arrayBuffer.slice(0, 100));
            if (first100.toLowerCase().includes('<!doctype') || first100.toLowerCase().includes('<html')) {
                throw new Error('Received HTML error page instead of EPUB file');
            }
            throw new Error('Invalid EPUB format - not a ZIP file');
        }

        this.book = ePub(arrayBuffer);

        await this.book.ready;

        // Get metadata
        const metadata = await this.book.loaded.metadata;
        const title = metadata.title || 'Untitled';
        const author = metadata.creator || 'Unknown Author';

        console.log(`EPUB loaded: "${title}" by ${author}`);

        // Get cover
        let cover: string | null = null;
        try {
            const coverUrl = await this.book.coverUrl();
            cover = coverUrl || null;
        } catch {
            cover = null;
        }

        // Get table of contents
        const navigation = await this.book.loaded.navigation;
        const chapters = navigation.toc.map((item) => ({
            href: item.href,
            label: item.label,
        }));

        return { title, author, cover, chapters };
    }

    async renderTo(element: HTMLElement, options?: {
        width?: string;
        height?: string;
        flow?: 'paginated' | 'scrolled';
        onError?: (error: Error) => void;
    }): Promise<Rendition> {
        if (!this.book) {
            throw new Error('Book not loaded');
        }

        // Wait for spine to be ready (this can prevent some parsing errors)
        try {
            await this.book.loaded.spine;
        } catch (spineError) {
            console.warn('Spine loading warning:', spineError);
        }

        this.rendition = this.book.renderTo(element, {
            width: options?.width || '100%',
            height: options?.height || '100%',
            flow: options?.flow || 'scrolled',
            spread: 'none',
            allowScriptedContent: true,
            // Allow necessary iframe permissions
            sandbox: ['allow-same-origin', 'allow-scripts'],
        } as Parameters<typeof this.book.renderTo>[1]);

        // Attach error event listener for async errors
        if (options?.onError) {
            this.rendition.on('displayError', (err: unknown) => {
                console.error('EPUB display error event:', err);
                const error = err instanceof Error ? err : new Error(String(err));
                options.onError?.(error);
            });
        }

        // Try to display with error recovery
        try {
            await this.rendition.display();
        } catch (displayError) {
            console.error('Initial display failed, trying with first spine item:', displayError);

            // Try displaying a specific section instead
            try {
                const spine = this.book.spine as { items?: { href: string }[] };
                if (spine?.items && spine.items.length > 0) {
                    // Try first valid spine item
                    for (const item of spine.items) {
                        if (item.href) {
                            try {
                                await this.rendition.display(item.href);
                                console.log('Successfully displayed:', item.href);
                                break;
                            } catch {
                                continue;
                            }
                        }
                    }
                }
            } catch (spineDisplayError) {
                console.error('Spine display also failed:', spineDisplayError);
                // Re-throw original error for caller to handle
                throw new Error(`Unable to display EPUB: ${displayError instanceof Error ? displayError.message : 'Unknown rendering error'}`);
            }
        }

        // Generate locations for percentage-based progress tracking (run in background)
        // This is required for book.locations.percentageFromCfi() to work
        // Don't block book loading - run with timeout in background
        const book = this.book;
        setTimeout(async () => {
            try {
                console.log('Generating book locations for progress tracking...');
                // Race between generation and timeout
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Location generation timed out')), 10000)
                );
                await Promise.race([
                    book.locations.generate(2048), // Larger chunks = faster generation
                    timeoutPromise
                ]);
                console.log('Book locations generated successfully');
            } catch (locError) {
                console.warn('Location generation skipped (progress may use page-based fallback):', locError);
            }
        }, 100); // Start after 100ms to ensure display is ready

        return this.rendition;
    }

    async goTo(cfi: string): Promise<void> {
        if (!this.rendition) {
            throw new Error('Rendition not initialized');
        }
        await this.rendition.display(cfi);
    }

    async nextPage(): Promise<void> {
        if (!this.rendition) return;
        await this.rendition.next();
    }

    async prevPage(): Promise<void> {
        if (!this.rendition) return;
        await this.rendition.prev();
    }

    getCurrentLocation(): string | null {
        if (!this.rendition) return null;
        const location = this.rendition.currentLocation();
        if (location && 'start' in location) {
            return (location as unknown as { start: { cfi: string } }).start.cfi;
        }
        return null;
    }

    getProgress(): number {
        if (!this.book || !this.rendition) return 0;
        const location = this.rendition.currentLocation();
        if (location && 'start' in location) {
            const loc = location as unknown as { start: { percentage: number } };
            return Math.round(loc.start.percentage * 100);
        }
        return 0;
    }

    onRelocated(callback: (location: { cfi: string; progress: number }) => void): void {
        if (!this.rendition) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.rendition.on('relocated', (location: any) => {
            const cfi = location.start?.cfi || location.startCfi || '';

            // Try multiple ways to get percentage (epub.js API varies between versions)
            let percentage = 0;

            // Method 1: location.start.percentage (common)
            if (typeof location.start?.percentage === 'number') {
                percentage = location.start.percentage;
            }
            // Method 2: book.locations.percentageFromCfi (more reliable)
            else if (this.book && cfi && typeof this.book.locations?.percentageFromCfi === 'function') {
                try {
                    percentage = this.book.locations.percentageFromCfi(cfi) || 0;
                } catch {
                    percentage = 0;
                }
            }
            // Method 3: Calculate from displayed page / total pages
            else if (location.start?.displayed) {
                const displayed = location.start.displayed;
                if (displayed.page && displayed.total) {
                    percentage = displayed.page / displayed.total;
                }
            }

            const progress = Math.round(percentage * 100);
            console.log(`Relocated: CFI=${cfi}, raw percentage=${percentage}, progress=${progress}%`);

            callback({
                cfi,
                progress,
            });
        });
    }

    onSelected(callback: (cfi: string, contents: Contents) => void): void {
        if (!this.rendition) return;
        this.rendition.on('selected', (cfi: string, contents: Contents) => {
            callback(cfi, contents);
        });
    }

    applyTheme(theme: {
        body?: Record<string, string>;
        'body *'?: Record<string, string>;
    }): void {
        if (!this.rendition) return;
        this.rendition.themes.default(theme);
    }

    setFontSize(size: string): void {
        if (!this.rendition) return;
        this.rendition.themes.fontSize(size);
    }

    // Inject word wrapping for TTS highlighting
    injectWordWrapping(): void {
        if (!this.rendition) return;

        this.rendition.hooks.content.register((contents: Contents) => {
            const doc = contents.document;
            if (!doc) return;

            // Add highlighting stylesheet
            const style = doc.createElement('style');
            style.textContent = `
                .tts-highlight {
                    background: linear-gradient(120deg, rgba(255, 107, 84, 0.3) 0%, rgba(255, 138, 122, 0.3) 100%);
                    padding: 2px 0;
                    border-radius: 2px;
                    animation: highlightPulse 0.3s ease-in-out;
                    box-shadow: 0 0 0 2px rgba(255, 107, 84, 0.2);
                }
                
                @keyframes highlightPulse {
                    0% { transform: scale(1); opacity: 0.7; }
                    50% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                .tts-word {
                    display: inline;
                }
            `;
            doc.head.appendChild(style);

            let wordIndex = 0;

            const wrapWords = (node: Node): void => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent || '';
                    if (!text.trim()) return;

                    // Split on whitespace while preserving it
                    const parts = text.split(/(\s+)/);
                    const fragment = doc.createDocumentFragment();

                    parts.forEach(part => {
                        if (part.trim()) {
                            const span = doc.createElement('span');
                            span.className = 'tts-word';
                            span.setAttribute('data-word-index', String(wordIndex++));
                            span.textContent = part;
                            fragment.appendChild(span);
                        } else {
                            fragment.appendChild(doc.createTextNode(part));
                        }
                    });

                    node.parentNode?.replaceChild(fragment, node);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as Element;
                    // Skip script, style, and already wrapped elements
                    if (!['SCRIPT', 'STYLE', 'SPAN'].includes(element.tagName) &&
                        !element.classList.contains('tts-word')) {
                        Array.from(node.childNodes).forEach(child => wrapWords(child));
                    }
                }
            };

            // Wrap words in body content
            wrapWords(doc.body);
        });
    }

    destroy(): void {
        if (this.rendition) {
            this.rendition.destroy();
            this.rendition = null;
        }
        if (this.book) {
            this.book.destroy();
            this.book = null;
        }
    }
}

// ========== Book Storage Functions ==========
export async function saveBook(
    input: File | { title: string; author: string; cover?: string; fileData: ArrayBuffer },
    metadata?: { title: string; author: string; cover: string | null }
): Promise<StoredBook> {
    let arrayBuffer: ArrayBuffer;
    let title: string;
    let author: string;
    let cover: string | undefined;

    if (input instanceof File) {
        // Input is a File
        arrayBuffer = await input.arrayBuffer();
        title = metadata?.title || 'Untitled';
        author = metadata?.author || 'Unknown Author';
        cover = metadata?.cover || undefined;
    } else {
        // Input is an object with fileData
        arrayBuffer = input.fileData;
        title = input.title;
        author = input.author;
        cover = input.cover;
    }

    // Check for existing book with same title and author (prevent duplicates)
    const existingBook = await db.books
        .where('title')
        .equals(title)
        .filter(book => book.author === author)
        .first();

    if (existingBook) {
        // Update lastRead and return existing book
        await db.books.update(existingBook.id, {
            lastRead: new Date(),
        });
        return { ...existingBook, lastRead: new Date() };
    }

    // Create new book entry
    const id = crypto.randomUUID();
    const storedBook: StoredBook = {
        id,
        title,
        author,
        cover,
        file: arrayBuffer,
        progress: 0,
        lastRead: new Date(),
        createdAt: new Date(),
    };

    await db.books.add(storedBook);
    return storedBook;
}

export async function getBook(id: string): Promise<StoredBook | undefined> {
    return db.books.get(id);
}

export async function getAllBooks(): Promise<StoredBook[]> {
    return db.books.orderBy('lastRead').reverse().toArray();
}

export async function updateBookProgress(
    id: string,
    progress: number,
    cfi: string
): Promise<void> {
    try {
        console.log(`Saving progress for book ${id}: ${progress}% at ${cfi}`);
        await db.books.update(id, {
            progress,
            currentCfi: cfi,
            lastRead: new Date(),
        });
        console.log(`Progress saved successfully for book ${id}`);
    } catch (error) {
        console.error(`Failed to save progress for book ${id}:`, error);
    }
}

export async function deleteBook(id: string): Promise<void> {
    await db.books.delete(id);
    await db.highlights.where('bookId').equals(id).delete();
    await db.bookmarks.where('bookId').equals(id).delete();
}

// Remove duplicate books, keeping the one with most progress
export async function removeDuplicateBooks(): Promise<number> {
    const allBooks = await db.books.toArray();

    // Normalize title for comparison - remove special chars, extra spaces, and common subtitle separators
    const normalizeTitle = (title: string): string => {
        return title
            .toLowerCase()
            .replace(/[;:,\-–—]/g, ' ') // Replace common separators with space
            .replace(/[\[\]\(\)'"]/g, '') // Remove brackets and quotes
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .slice(0, 40); // Use first 40 chars for matching
    };

    // Group by normalized title + author
    const groups = new Map<string, StoredBook[]>();

    for (const book of allBooks) {
        const normalizedTitle = normalizeTitle(book.title);
        const normalizedAuthor = book.author.toLowerCase().split(',')[0].trim(); // Use first author only
        const key = `${normalizedTitle}|${normalizedAuthor}`;
        const existing = groups.get(key) || [];
        existing.push(book);
        groups.set(key, existing);
    }

    let deletedCount = 0;

    // For each group with more than one book, keep the best one
    for (const [key, books] of groups) {
        if (books.length > 1) {
            console.log(`Found ${books.length} duplicates for: ${key}`);

            // Sort by progress (desc), then by lastRead (desc)
            books.sort((a, b) => {
                if (b.progress !== a.progress) return b.progress - a.progress;
                const aTime = a.lastRead?.getTime() || 0;
                const bTime = b.lastRead?.getTime() || 0;
                return bTime - aTime;
            });

            // Keep the first one (best), delete the rest
            for (let i = 1; i < books.length; i++) {
                console.log(`Deleting duplicate: ${books[i].title}`);
                await deleteBook(books[i].id);
                deletedCount++;
            }
        }
    }

    console.log(`Removed ${deletedCount} duplicate books total`);
    return deletedCount;
}

// ========== Highlights ==========
export async function addHighlight(
    bookId: string,
    cfi: string,
    text: string,
    color: Highlight['color'] = 'yellow'
): Promise<string> {
    const id = crypto.randomUUID();
    await db.highlights.add({
        id,
        bookId,
        cfi,
        text,
        color,
        createdAt: new Date(),
    });
    return id;
}

export async function getHighlights(bookId: string): Promise<Highlight[]> {
    return db.highlights.where('bookId').equals(bookId).toArray();
}

// ========== Bookmarks ==========
export async function addBookmark(
    bookId: string,
    cfi: string,
    title: string
): Promise<string> {
    const id = crypto.randomUUID();
    await db.bookmarks.add({
        id,
        bookId,
        cfi,
        title,
        createdAt: new Date(),
    });
    return id;
}

export async function getBookmarks(bookId: string): Promise<Bookmark[]> {
    return db.bookmarks.where('bookId').equals(bookId).toArray();
}
