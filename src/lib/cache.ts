import { db, StoredBook, getBook, getAllBooks } from '@/lib/epub';

/**
 * Book Cache Manager
 * Handles intelligent caching to prevent re-downloads
 */

// Cache status
export interface CacheStatus {
    isAvailable: boolean;
    lastAccessed?: Date;
    fileSize?: number;
}

/**
 * Check if a book is cached locally
 */
export async function isBookCached(bookId: string): Promise<CacheStatus> {
    try {
        const book = await getBook(bookId);
        if (book && book.file) {
            return {
                isAvailable: true,
                lastAccessed: book.lastRead,
                fileSize: book.file.byteLength,
            };
        }
        return { isAvailable: false };
    } catch {
        return { isAvailable: false };
    }
}

/**
 * Get book from cache - returns null if not cached
 */
export async function getBookFromCache(bookId: string): Promise<StoredBook | null> {
    try {
        const book = await getBook(bookId);
        if (book && book.file) {
            // Update last accessed time
            await db.books.update(bookId, { lastRead: new Date() });
            return book;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Get all cached books with their sizes
 */
export async function getCachedBooks(): Promise<{
    books: StoredBook[];
    totalSize: number;
}> {
    try {
        const books = await getAllBooks();
        const cachedBooks = books.filter((b) => b.file);
        const totalSize = cachedBooks.reduce(
            (sum, book) => sum + (book.file?.byteLength || 0),
            0
        );
        return { books: cachedBooks, totalSize };
    } catch {
        return { books: [], totalSize: 0 };
    }
}

/**
 * Clear old cached books to free up space
 * Keeps the most recently read books
 */
export async function clearOldCache(
    keepCount: number = 10,
    maxAge?: number
): Promise<number> {
    try {
        const books = await getAllBooks();
        const cachedBooks = books
            .filter((b) => b.file)
            .sort((a, b) =>
                new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime()
            );

        let cleared = 0;
        const now = Date.now();

        for (let i = keepCount; i < cachedBooks.length; i++) {
            const book = cachedBooks[i];
            const age = now - new Date(book.lastRead).getTime();

            // Clear if beyond max age or beyond keep count
            if (!maxAge || age > maxAge) {
                // Keep metadata but remove file
                await db.books.update(book.id, { file: undefined });
                cleared++;
            }
        }

        return cleared;
    } catch {
        return 0;
    }
}

/**
 * Pre-cache a book for offline reading
 */
export async function precacheBook(
    bookId: string,
    downloadFn: () => Promise<ArrayBuffer>
): Promise<boolean> {
    try {
        const existing = await getBook(bookId);
        if (existing?.file) {
            return true; // Already cached
        }

        const file = await downloadFn();
        if (file) {
            await db.books.update(bookId, { file, lastRead: new Date() });
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Format bytes to human readable
 */
export function formatCacheSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get storage quota info
 */
export async function getStorageInfo(): Promise<{
    used: number;
    quota: number;
    available: number;
    percentUsed: number;
} | null> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
        return null;
    }

    try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        return {
            used,
            quota,
            available: quota - used,
            percentUsed: quota > 0 ? (used / quota) * 100 : 0,
        };
    } catch {
        return null;
    }
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
        return false;
    }

    try {
        return await navigator.storage.persist();
    } catch {
        return false;
    }
}
