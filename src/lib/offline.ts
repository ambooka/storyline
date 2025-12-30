import { getBook, getAllBooks, StoredBook } from '@/lib/epub';
import { db } from '@/lib/epub';

/**
 * Offline Reading Manager
 * Handles caching and syncing of books for offline access
 */

// Cache name for offline content
const OFFLINE_CACHE = 'storyline-offline-v1';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
    return isBrowser ? navigator.onLine : true;
}

/**
 * Add online/offline event listeners
 */
export function onNetworkChange(callback: (online: boolean) => void): () => void {
    if (!isBrowser) return () => { };

    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
}

/**
 * Get all books available offline
 */
export async function getOfflineBooks(): Promise<StoredBook[]> {
    try {
        return await getAllBooks();
    } catch (error) {
        console.error('Failed to get offline books:', error);
        return [];
    }
}

/**
 * Check if a book is available offline
 */
export async function isBookOffline(bookId: string): Promise<boolean> {
    try {
        const book = await getBook(bookId);
        return book !== undefined && book.file !== undefined;
    } catch {
        return false;
    }
}

/**
 * Get offline reading progress for a book
 */
export async function getOfflineProgress(bookId: string): Promise<{
    progress: number;
    currentCfi: string | null;
} | null> {
    try {
        const book = await getBook(bookId);
        if (!book) return null;
        return {
            progress: book.progress,
            currentCfi: book.currentCfi || null,
        };
    } catch {
        return null;
    }
}

/**
 * Queue progress sync for when back online
 */
interface ProgressUpdate {
    bookId: string;
    progress: number;
    currentCfi: string;
    timestamp: number;
}

const SYNC_QUEUE_KEY = 'storyline-sync-queue';

export function queueProgressSync(bookId: string, progress: number, currentCfi: string): void {
    if (!isBrowser) return;

    try {
        const queue: ProgressUpdate[] = JSON.parse(
            localStorage.getItem(SYNC_QUEUE_KEY) || '[]'
        );

        // Update or add entry
        const existingIndex = queue.findIndex(q => q.bookId === bookId);
        const update: ProgressUpdate = {
            bookId,
            progress,
            currentCfi,
            timestamp: Date.now(),
        };

        if (existingIndex >= 0) {
            queue[existingIndex] = update;
        } else {
            queue.push(update);
        }

        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
        console.error('Failed to queue progress sync:', error);
    }
}

/**
 * Process queued syncs when back online
 */
export async function processSyncQueue(
    syncFn: (bookId: string, progress: number, cfi: string) => Promise<void>
): Promise<number> {
    if (!isBrowser || !isOnline()) return 0;

    try {
        const queue: ProgressUpdate[] = JSON.parse(
            localStorage.getItem(SYNC_QUEUE_KEY) || '[]'
        );

        if (queue.length === 0) return 0;

        let synced = 0;
        const failed: ProgressUpdate[] = [];

        for (const update of queue) {
            try {
                await syncFn(update.bookId, update.progress, update.currentCfi);
                synced++;
            } catch {
                failed.push(update);
            }
        }

        // Keep failed items in queue
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(failed));

        return synced;
    } catch (error) {
        console.error('Failed to process sync queue:', error);
        return 0;
    }
}

/**
 * Register service worker for offline support
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!isBrowser || !('serviceWorker' in navigator)) {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration.scope);
        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
}

/**
 * Clear offline cache
 */
export async function clearOfflineCache(): Promise<void> {
    if (!isBrowser || !('caches' in window)) return;

    try {
        await caches.delete(OFFLINE_CACHE);
    } catch (error) {
        console.error('Failed to clear offline cache:', error);
    }
}

/**
 * Get offline storage usage
 */
export async function getStorageUsage(): Promise<{
    used: number;
    quota: number;
    percentage: number;
} | null> {
    if (!isBrowser || !('storage' in navigator && 'estimate' in navigator.storage)) {
        return null;
    }

    try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        return {
            used,
            quota,
            percentage: quota > 0 ? (used / quota) * 100 : 0,
        };
    } catch {
        return null;
    }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
