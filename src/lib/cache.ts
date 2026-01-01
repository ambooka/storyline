/**
 * Book Cache Utilities
 * 
 * Provides unified access to cached books from various sources
 * (IndexedDB local storage, Firebase cache, etc.)
 */

import { getBook, StoredBook } from './epub';

/**
 * Get a book from the cache by its ID
 * 
 * This function attempts to retrieve a book from available caches:
 * 1. First tries the local IndexedDB storage
 * 2. Could be extended to check Firebase cache in the future
 * 
 * @param bookId - The unique identifier of the book
 * @returns The stored book if found, null otherwise
 */
export async function getBookFromCache(bookId: string): Promise<StoredBook | null> {
    try {
        // Try to get from local IndexedDB first
        const localBook = await getBook(bookId);
        if (localBook) {
            return localBook;
        }

        // Book not found in any cache
        return null;
    } catch (error) {
        console.error('Error getting book from cache:', error);
        return null;
    }
}

/**
 * Check if a book exists in the cache
 * 
 * @param bookId - The unique identifier of the book
 * @returns true if the book exists in cache, false otherwise
 */
export async function isBookInCache(bookId: string): Promise<boolean> {
    const book = await getBookFromCache(bookId);
    return book !== null;
}
