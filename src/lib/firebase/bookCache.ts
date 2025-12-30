/**
 * Firestore Book Cache Service
 * 
 * Handles caching of book metadata and user's saved books
 * using Firebase Firestore.
 */

import { getFirebaseDB } from "./config";
import { getFirebaseAuth } from "./config";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
    increment,
} from "firebase/firestore";

// ============ Types ============

export interface CachedBookData {
    externalId: string;
    source: string;
    title: string;
    titleNormalized: string;
    author: string | null;
    authorNormalized: string | null;
    authors: string[];
    coverUrl: string | null;
    description: string | null;
    publishedYear: number | null;
    publisher: string | null;
    isbn: string | null;
    language: string;
    subjects: string[];
    hasEpub: boolean;
    hasPdf: boolean;
    hasMobi: boolean;
    downloadCount: number;
    searchHits: number;
    previewUrl: string | null;
    lastVerifiedAt: Timestamp | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface SavedBookData {
    userId: string;
    bookId: string;
    bookData: {
        title: string;
        author: string | null;
        coverUrl: string | null;
        source: string;
    };
    folder: string;
    notes: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface DownloadLinkData {
    bookId: string;
    url: string;
    format: string;
    quality: string;
    status: 'active' | 'broken' | 'checking' | 'unknown';
    fileSize: number | null;
    isDirect: boolean;
    priority: number;
    lastCheckAt: Timestamp | null;
    failCount: number;
    createdAt: Timestamp;
}

// ============ Utility Functions ============

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// ============ Book Cache Functions ============

/**
 * Cache a book in Firestore
 */
export async function cacheBook(book: {
    id: string;
    externalId: string;
    source: string;
    title: string;
    author: string | null;
    authors?: string[];
    coverUrl: string | null;
    description?: string | null;
    publishedYear?: number | null;
    language?: string;
    subjects?: string[];
    hasEpub?: boolean;
    hasPdf?: boolean;
    hasMobi?: boolean;
    downloadCount?: number;
    previewUrl?: string | null;
}): Promise<void> {
    const db = getFirebaseDB();
    if (!db) return;

    const bookRef = doc(db, "bookCache", `${book.source}_${book.externalId}`);

    try {
        const existingDoc = await getDoc(bookRef);

        if (existingDoc.exists()) {
            // Update existing - increment search hits
            await updateDoc(bookRef, {
                searchHits: increment(1),
                lastVerifiedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } else {
            // Create new
            const data: Omit<CachedBookData, 'createdAt' | 'updatedAt' | 'lastVerifiedAt'> & {
                createdAt: ReturnType<typeof serverTimestamp>;
                updatedAt: ReturnType<typeof serverTimestamp>;
                lastVerifiedAt: ReturnType<typeof serverTimestamp>;
            } = {
                externalId: book.externalId,
                source: book.source,
                title: book.title,
                titleNormalized: normalizeText(book.title),
                author: book.author,
                authorNormalized: book.author ? normalizeText(book.author) : null,
                authors: book.authors || (book.author ? [book.author] : []),
                coverUrl: book.coverUrl,
                description: book.description || null,
                publishedYear: book.publishedYear || null,
                publisher: null,
                isbn: null,
                language: book.language || 'en',
                subjects: book.subjects || [],
                hasEpub: book.hasEpub ?? true,
                hasPdf: book.hasPdf ?? false,
                hasMobi: book.hasMobi ?? false,
                downloadCount: book.downloadCount || 0,
                searchHits: 1,
                previewUrl: book.previewUrl || null,
                lastVerifiedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await setDoc(bookRef, data);
        }
    } catch (error) {
        console.error("Failed to cache book:", error);
    }
}

/**
 * Get a cached book by ID
 */
export async function getCachedBook(source: string, externalId: string): Promise<CachedBookData | null> {
    const db = getFirebaseDB();
    if (!db) return null;

    try {
        const bookRef = doc(db, "bookCache", `${source}_${externalId}`);
        const bookDoc = await getDoc(bookRef);

        if (bookDoc.exists()) {
            return bookDoc.data() as CachedBookData;
        }
        return null;
    } catch (error) {
        console.error("Failed to get cached book:", error);
        return null;
    }
}

/**
 * Search cached books (for quick results before live search)
 */
export async function searchCachedBooks(
    searchQuery: string,
    maxResults = 10
): Promise<CachedBookData[]> {
    const db = getFirebaseDB();
    if (!db) return [];

    const normalized = normalizeText(searchQuery);

    try {
        // Search by normalized title prefix (Firestore limitation)
        const q = query(
            collection(db, "bookCache"),
            where("titleNormalized", ">=", normalized),
            where("titleNormalized", "<=", normalized + "\uf8ff"),
            orderBy("titleNormalized"),
            limit(maxResults)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as CachedBookData);
    } catch (error) {
        console.error("Failed to search cached books:", error);
        return [];
    }
}

// ============ Saved Books Functions ============

/**
 * Save a book to user's collection
 */
export async function saveBookToCollection(
    bookId: string,
    bookData: {
        title: string;
        author: string | null;
        coverUrl: string | null;
        source: string;
    },
    folder = "want-to-read"
): Promise<boolean> {
    const db = getFirebaseDB();
    const auth = getFirebaseAuth();

    if (!db || !auth?.currentUser) {
        console.log("Not authenticated or DB not available");
        return false;
    }

    const userId = auth.currentUser.uid;
    const savedBookRef = doc(db, "savedBooks", `${userId}_${bookId}`);

    try {
        await setDoc(savedBookRef, {
            userId,
            bookId,
            bookData,
            folder,
            notes: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return true;
    } catch (error) {
        console.error("Failed to save book:", error);
        return false;
    }
}

/**
 * Remove a book from user's collection
 */
export async function removeBookFromCollection(bookId: string): Promise<boolean> {
    const db = getFirebaseDB();
    const auth = getFirebaseAuth();

    if (!db || !auth?.currentUser) return false;

    const userId = auth.currentUser.uid;
    const savedBookRef = doc(db, "savedBooks", `${userId}_${bookId}`);

    try {
        await deleteDoc(savedBookRef);
        return true;
    } catch (error) {
        console.error("Failed to remove book:", error);
        return false;
    }
}

/**
 * Check if a book is saved
 */
export async function isBookSaved(bookId: string): Promise<boolean> {
    const db = getFirebaseDB();
    const auth = getFirebaseAuth();

    if (!db || !auth?.currentUser) return false;

    const userId = auth.currentUser.uid;
    const savedBookRef = doc(db, "savedBooks", `${userId}_${bookId}`);

    try {
        const docSnap = await getDoc(savedBookRef);
        return docSnap.exists();
    } catch {
        return false;
    }
}

/**
 * Get user's saved books
 */
export async function getSavedBooks(folder?: string): Promise<SavedBookData[]> {
    const db = getFirebaseDB();
    const auth = getFirebaseAuth();

    if (!db || !auth?.currentUser) return [];

    const userId = auth.currentUser.uid;

    try {
        let q;
        if (folder) {
            q = query(
                collection(db, "savedBooks"),
                where("userId", "==", userId),
                where("folder", "==", folder),
                orderBy("createdAt", "desc"),
                limit(50)
            );
        } else {
            q = query(
                collection(db, "savedBooks"),
                where("userId", "==", userId),
                orderBy("createdAt", "desc"),
                limit(50)
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as SavedBookData);
    } catch (error) {
        console.error("Failed to get saved books:", error);
        return [];
    }
}

/**
 * Update saved book folder or notes
 */
export async function updateSavedBook(
    bookId: string,
    updates: { folder?: string; notes?: string }
): Promise<boolean> {
    const db = getFirebaseDB();
    const auth = getFirebaseAuth();

    if (!db || !auth?.currentUser) return false;

    const userId = auth.currentUser.uid;
    const savedBookRef = doc(db, "savedBooks", `${userId}_${bookId}`);

    try {
        await updateDoc(savedBookRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
        return true;
    } catch (error) {
        console.error("Failed to update saved book:", error);
        return false;
    }
}

// ============ Download Link Caching ============

/**
 * Cache a download link
 */
export async function cacheDownloadLink(
    bookId: string,
    url: string,
    format: string,
    options?: {
        quality?: string;
        fileSize?: number;
        isDirect?: boolean;
        priority?: number;
    }
): Promise<void> {
    const db = getFirebaseDB();
    if (!db) return;

    const linkId = `${bookId}_${format}`;
    const linkRef = doc(db, "downloadLinks", linkId);

    try {
        await setDoc(linkRef, {
            bookId,
            url,
            format,
            quality: options?.quality || 'standard',
            status: 'active',
            fileSize: options?.fileSize || null,
            isDirect: options?.isDirect ?? true,
            priority: options?.priority || 100,
            lastCheckAt: serverTimestamp(),
            failCount: 0,
            createdAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error("Failed to cache download link:", error);
    }
}

/**
 * Get cached download link
 */
export async function getCachedDownloadLink(
    bookId: string,
    format: string
): Promise<DownloadLinkData | null> {
    const db = getFirebaseDB();
    if (!db) return null;

    const linkId = `${bookId}_${format}`;
    const linkRef = doc(db, "downloadLinks", linkId);

    try {
        const docSnap = await getDoc(linkRef);
        if (docSnap.exists()) {
            const data = docSnap.data() as DownloadLinkData;
            // Only return if not broken
            if (data.status !== 'broken') {
                return data;
            }
        }
        return null;
    } catch (error) {
        console.error("Failed to get cached link:", error);
        return null;
    }
}

/**
 * Mark a download link as broken
 */
export async function markLinkBroken(bookId: string, format: string): Promise<void> {
    const db = getFirebaseDB();
    if (!db) return;

    const linkId = `${bookId}_${format}`;
    const linkRef = doc(db, "downloadLinks", linkId);

    try {
        await updateDoc(linkRef, {
            status: 'broken',
            failCount: increment(1),
            lastCheckAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Failed to mark link broken:", error);
    }
}
