// Free Ebook Providers Integration
// Supports: Project Gutenberg, Open Library, Standard Ebooks, Internet Archive, and Google Books

export interface Book {
    id: string;
    title: string;
    author: string;
    authors: string[];
    cover: string | null;
    description?: string;
    subjects: string[];
    languages: string[];
    downloadUrl: string | null;
    formats: BookFormat[];
    source: 'gutenberg' | 'openlibrary' | 'standardebooks' | 'internetarchive' | 'oceanpdf' | 'allepub' | 'pdfdrive' | 'libgen';
    downloadCount?: number;
    publishedYear?: number;
    previewUrl?: string;
}

export interface BookFormat {
    mimeType: string;
    url: string;
    label: string;
}

export interface SearchOptions {
    query?: string;
    topic?: string;
    author?: string;
    language?: string;
    page?: number;
    sort?: 'popular' | 'ascending' | 'descending';
    source?: 'all' | 'gutenberg' | 'openlibrary' | 'internetarchive' | 'oceanpdf' | 'allepub' | 'pdfdrive' | 'libgen';
}

export interface SearchResult {
    books: Book[];
    totalCount: number;
    hasNext: boolean;
    hasPrevious: boolean;
    currentPage: number;
    googleDorkUrls?: {
        epub: string;
        pdf: string;
        any: string;
    };
}

// ========== Gutendex API (Project Gutenberg) ==========
const GUTENDEX_BASE = 'https://gutendex.com';

interface GutendexBook {
    id: number;
    title: string;
    authors: { name: string; birth_year: number | null; death_year: number | null }[];
    subjects: string[];
    bookshelves: string[];
    languages: string[];
    copyright: boolean;
    media_type: string;
    formats: Record<string, string>;
    download_count: number;
}

interface GutendexResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: GutendexBook[];
}

function parseGutendexBook(book: GutendexBook): Book {
    const epubUrl = book.formats['application/epub+zip'] || null;
    const coverUrl = book.formats['image/jpeg'] || null;

    const formats: BookFormat[] = Object.entries(book.formats)
        .filter(([mime]) =>
            mime.includes('epub') ||
            mime.includes('pdf') ||
            mime.includes('text/plain') ||
            mime.includes('text/html')
        )
        .map(([mimeType, url]) => ({
            mimeType,
            url,
            label: mimeType.includes('epub') ? 'EPUB' :
                mimeType.includes('pdf') ? 'PDF' :
                    mimeType.includes('html') ? 'HTML' : 'Text',
        }));

    return {
        id: `gutenberg-${book.id}`,
        title: book.title,
        author: book.authors.map(a => a.name).join(', ') || 'Unknown Author',
        authors: book.authors.map(a => a.name),
        cover: coverUrl,
        subjects: [...book.subjects, ...book.bookshelves],
        languages: book.languages,
        downloadUrl: epubUrl,
        formats,
        source: 'gutenberg',
        downloadCount: book.download_count,
    };
}

export async function searchGutenberg(options: SearchOptions = {}): Promise<SearchResult> {
    const params = new URLSearchParams();

    if (options.query) params.set('search', options.query);
    if (options.topic) params.set('topic', options.topic);
    if (options.author) params.set('author', options.author);
    if (options.language) params.set('languages', options.language);
    if (options.page) params.set('page', options.page.toString());
    if (options.sort === 'popular') params.set('sort', 'popular');

    params.set('mime_type', 'application/epub+zip');

    const url = `${GUTENDEX_BASE}/books?${params.toString()}`;
    console.log('Gutenberg search URL:', url);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Failed to fetch from Gutendex');

        const data: GutendexResponse = await response.json();
        console.log(`Gutenberg found: ${data.count} books, returning ${data.results.length}`);

        return {
            books: data.results.map(parseGutendexBook),
            totalCount: data.count,
            hasNext: !!data.next,
            hasPrevious: !!data.previous,
            currentPage: options.page || 1,
        };
    } catch (error) {
        console.error('Gutendex search error:', error);
        return { books: [], totalCount: 0, hasNext: false, hasPrevious: false, currentPage: 1 };
    }
}

export async function getGutenbergBook(id: number): Promise<Book | null> {
    try {
        const response = await fetch(`${GUTENDEX_BASE}/books/${id}`);
        if (!response.ok) return null;

        const data: GutendexBook = await response.json();
        return parseGutendexBook(data);
    } catch (error) {
        console.error('Gutendex book fetch error:', error);
        return null;
    }
}

// ========== Open Library API ==========
const OPENLIBRARY_BASE = 'https://openlibrary.org';
const OPENLIBRARY_COVERS = 'https://covers.openlibrary.org';

interface OpenLibraryDoc {
    key: string;
    title: string;
    author_name?: string[];
    first_publish_year?: number;
    subject?: string[];
    language?: string[];
    cover_i?: number;
    ia?: string[];
    ebook_count_i?: number;
    has_fulltext?: boolean;
}

interface OpenLibraryResponse {
    numFound: number;
    start: number;
    docs: OpenLibraryDoc[];
}

function parseOpenLibraryBook(doc: OpenLibraryDoc): Book {
    const coverId = doc.cover_i;
    const coverUrl = coverId
        ? `${OPENLIBRARY_COVERS}/b/id/${coverId}-L.jpg`
        : null;

    const iaId = doc.ia?.[0];
    const downloadUrl = iaId
        ? `https://archive.org/download/${iaId}/${iaId}.epub`
        : null;

    const formats: BookFormat[] = [];
    if (iaId) {
        formats.push(
            { mimeType: 'application/epub+zip', url: `https://archive.org/download/${iaId}/${iaId}.epub`, label: 'EPUB' },
            { mimeType: 'application/pdf', url: `https://archive.org/download/${iaId}/${iaId}.pdf`, label: 'PDF' }
        );
    }

    return {
        id: `openlibrary-${doc.key.replace('/works/', '')}`,
        title: doc.title,
        author: doc.author_name?.join(', ') || 'Unknown Author',
        authors: doc.author_name || [],
        cover: coverUrl,
        subjects: doc.subject?.slice(0, 10) || [],
        languages: doc.language || ['en'],
        downloadUrl,
        formats,
        source: 'openlibrary',
        publishedYear: doc.first_publish_year,
    };
}

export async function searchOpenLibrary(options: SearchOptions = {}): Promise<SearchResult> {
    const params = new URLSearchParams();

    if (options.query) params.set('q', options.query);
    if (options.author) params.set('author', options.author);
    if (options.language) params.set('language', options.language);

    params.set('has_fulltext', 'true');
    params.set('limit', '20');
    params.set('offset', ((options.page || 1) - 1) * 20 + '');

    const url = `${OPENLIBRARY_BASE}/search.json?${params.toString()}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Failed to fetch from Open Library');

        const data: OpenLibraryResponse = await response.json();

        return {
            books: data.docs.filter(d => d.ia && d.ia.length > 0).map(parseOpenLibraryBook),
            totalCount: data.numFound,
            hasNext: data.start + data.docs.length < data.numFound,
            hasPrevious: data.start > 0,
            currentPage: options.page || 1,
        };
    } catch (error) {
        console.error('Open Library search error:', error);
        return { books: [], totalCount: 0, hasNext: false, hasPrevious: false, currentPage: 1 };
    }
}

// ========== Internet Archive API ==========
const ARCHIVE_BASE = 'https://archive.org';

interface ArchiveDoc {
    identifier: string;
    title: string;
    creator?: string | string[];
    date?: string;
    subject?: string | string[];
    language?: string;
    downloads?: number;
    mediatype: string;
}

interface ArchiveResponse {
    response: {
        numFound: number;
        start: number;
        docs: ArchiveDoc[];
    };
}

function parseArchiveBook(doc: ArchiveDoc): Book {
    const creators = Array.isArray(doc.creator) ? doc.creator : doc.creator ? [doc.creator] : [];
    const subjects = Array.isArray(doc.subject) ? doc.subject : doc.subject ? [doc.subject] : [];

    // Preview URL for fallback
    const previewUrl = `${ARCHIVE_BASE}/details/${doc.identifier}`;

    // Use placeholder download URL - actual EPUB URL fetched dynamically via /api/archive/epub
    // This enables the "Read" button to show (vs "Preview")
    const downloadUrl = `${ARCHIVE_BASE}/download/${doc.identifier}`;

    return {
        id: `archive-${doc.identifier}`,
        title: doc.title,
        author: creators.join(', ') || 'Unknown Author',
        authors: creators,
        cover: `${ARCHIVE_BASE}/services/img/${doc.identifier}`,
        subjects: subjects.slice(0, 10),
        languages: doc.language ? [doc.language] : ['en'],
        downloadUrl, // Placeholder - real URL fetched via /api/archive/epub
        previewUrl,
        formats: [],
        source: 'internetarchive',
        downloadCount: doc.downloads,
        publishedYear: doc.date ? parseInt(doc.date.slice(0, 4)) : undefined,
    };
}

export async function searchInternetArchive(options: SearchOptions = {}): Promise<SearchResult> {
    const page = options.page || 1;
    const rows = 20;

    // Build search query - prioritize title/creator search
    // Don't use language filter for search queries (too restrictive on Archive.org)
    let queryParts: string[] = ['mediatype:texts'];

    if (options.query) {
        // Search in title OR creator for better matching
        const searchTerm = options.query.replace(/['"]/g, '');
        queryParts.unshift(`(title:(${searchTerm}) OR creator:(${searchTerm}))`);
    }
    if (options.author) {
        queryParts.unshift(`creator:(${options.author})`);
    }
    if (options.topic) {
        queryParts.unshift(`subject:(${options.topic})`);
    }
    // Note: Removed language filter - Archive.org language tagging is inconsistent
    // and causes many books to be excluded incorrectly

    const query = queryParts.join(' AND ');

    const params = new URLSearchParams({
        q: query,
        fl: 'identifier,title,creator,date,subject,language,downloads,mediatype',
        rows: rows.toString(),
        page: page.toString(),
        output: 'json',
        sort: options.sort === 'popular' ? 'downloads desc' : 'date desc',
    });

    const url = `${ARCHIVE_BASE}/advancedsearch.php?${params.toString()}`;
    console.log('Internet Archive search URL:', url);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Failed to fetch from Internet Archive');

        const data: ArchiveResponse = await response.json();
        console.log(`Internet Archive found: ${data.response.numFound} books, returning ${data.response.docs.length}`);

        return {
            books: data.response.docs.map(parseArchiveBook),
            totalCount: data.response.numFound,
            hasNext: (data.response.start + data.response.docs.length) < data.response.numFound,
            hasPrevious: page > 1,
            currentPage: page,
        };
    } catch (error) {
        console.error('Internet Archive search error:', error);
        return { books: [], totalCount: 0, hasNext: false, hasPrevious: false, currentPage: 1 };
    }
}

// ========== Google Books API (Fallback) ==========
const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1';

interface GoogleBook {
    id: string;
    volumeInfo: {
        title: string;
        authors?: string[];
        description?: string;
        categories?: string[];
        language?: string;
        publishedDate?: string;
        imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
        };
        previewLink?: string;
    };
    accessInfo?: {
        epub?: {
            isAvailable: boolean;
            downloadLink?: string;
            acsTokenLink?: string;
        };
        pdf?: {
            isAvailable: boolean;
            downloadLink?: string;
        };
        webReaderLink?: string;
    };
}

interface GoogleBooksResponse {
    totalItems: number;
    items?: GoogleBook[];
}

function parseGoogleBook(item: GoogleBook): Book {
    const info = item.volumeInfo;
    const access = item.accessInfo;

    // Get cover - prefer larger images
    let coverUrl = null;
    if (info.imageLinks) {
        coverUrl = info.imageLinks.thumbnail || info.imageLinks.smallThumbnail || null;
        // Remove zoom parameter for higher quality
        if (coverUrl) {
            coverUrl = coverUrl.replace('zoom=1', 'zoom=2');
        }
    }

    // Google Books download links usually require authentication
    // Only use preview URL instead
    const previewUrl = access?.webReaderLink || info.previewLink || `https://books.google.com/books?id=${item.id}`;

    return {
        id: `google-${item.id}`,
        title: info.title,
        author: info.authors?.join(', ') || 'Unknown Author',
        authors: info.authors || [],
        cover: coverUrl,
        description: info.description,
        subjects: info.categories || [],
        languages: info.language ? [info.language] : ['en'],
        downloadUrl: null, // Google Books downloads require auth - use preview instead
        formats: [],
        source: 'openlibrary' as const, // Legacy - Google Books removed
        publishedYear: info.publishedDate ? parseInt(info.publishedDate.slice(0, 4)) : undefined,
        previewUrl,
    };
}

export async function searchGoogleBooks(options: SearchOptions = {}): Promise<SearchResult> {
    const page = options.page || 1;
    const maxResults = 20;
    const startIndex = (page - 1) * maxResults;

    let query = options.query || '';

    if (options.author) {
        query += ` inauthor:${options.author}`;
    }
    if (options.topic) {
        query += ` subject:${options.topic}`;
    }

    // Focus on free ebooks
    const params = new URLSearchParams({
        q: query.trim() || 'classic literature',
        filter: 'free-ebooks',
        maxResults: maxResults.toString(),
        startIndex: startIndex.toString(),
        printType: 'books',
        orderBy: options.sort === 'popular' ? 'relevance' : 'newest',
    });

    if (options.language) {
        params.set('langRestrict', options.language);
    }

    const url = `${GOOGLE_BOOKS_BASE}/volumes?${params.toString()}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Failed to fetch from Google Books');

        const data: GoogleBooksResponse = await response.json();
        const books = (data.items || []).map(parseGoogleBook);

        return {
            books,
            totalCount: data.totalItems,
            hasNext: startIndex + books.length < data.totalItems,
            hasPrevious: page > 1,
            currentPage: page,
        };
    } catch (error) {
        console.error('Google Books search error:', error);
        return { books: [], totalCount: 0, hasNext: false, hasPrevious: false, currentPage: 1 };
    }
}

// ========== Standard Ebooks (Curated high-quality editions) ==========
const STANDARD_EBOOKS_BASE = 'https://standardebooks.org';

const STANDARD_EBOOKS_CATALOG: Book[] = [
    {
        id: 'standard-pride-prejudice',
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        authors: ['Jane Austen'],
        cover: `${STANDARD_EBOOKS_BASE}/images/covers/jane-austen_pride-and-prejudice.jpg`,
        subjects: ['Romance', 'Classic', 'Fiction'],
        languages: ['en'],
        downloadUrl: `${STANDARD_EBOOKS_BASE}/ebooks/jane-austen/pride-and-prejudice/downloads/jane-austen_pride-and-prejudice.epub`,
        formats: [{ mimeType: 'application/epub+zip', url: `${STANDARD_EBOOKS_BASE}/ebooks/jane-austen/pride-and-prejudice/downloads/jane-austen_pride-and-prejudice.epub`, label: 'EPUB' }],
        source: 'standardebooks',
    },
    {
        id: 'standard-frankenstein',
        title: 'Frankenstein',
        author: 'Mary Shelley',
        authors: ['Mary Shelley'],
        cover: `${STANDARD_EBOOKS_BASE}/images/covers/mary-shelley_frankenstein.jpg`,
        subjects: ['Horror', 'Science Fiction', 'Classic'],
        languages: ['en'],
        downloadUrl: `${STANDARD_EBOOKS_BASE}/ebooks/mary-shelley/frankenstein/downloads/mary-shelley_frankenstein.epub`,
        formats: [{ mimeType: 'application/epub+zip', url: `${STANDARD_EBOOKS_BASE}/ebooks/mary-shelley/frankenstein/downloads/mary-shelley_frankenstein.epub`, label: 'EPUB' }],
        source: 'standardebooks',
    },
    {
        id: 'standard-dracula',
        title: 'Dracula',
        author: 'Bram Stoker',
        authors: ['Bram Stoker'],
        cover: `${STANDARD_EBOOKS_BASE}/images/covers/bram-stoker_dracula.jpg`,
        subjects: ['Horror', 'Gothic', 'Classic'],
        languages: ['en'],
        downloadUrl: `${STANDARD_EBOOKS_BASE}/ebooks/bram-stoker/dracula/downloads/bram-stoker_dracula.epub`,
        formats: [{ mimeType: 'application/epub+zip', url: `${STANDARD_EBOOKS_BASE}/ebooks/bram-stoker/dracula/downloads/bram-stoker_dracula.epub`, label: 'EPUB' }],
        source: 'standardebooks',
    },
    {
        id: 'standard-moby-dick',
        title: 'Moby Dick',
        author: 'Herman Melville',
        authors: ['Herman Melville'],
        cover: `${STANDARD_EBOOKS_BASE}/images/covers/herman-melville_moby-dick.jpg`,
        subjects: ['Adventure', 'Classic', 'Sea Stories'],
        languages: ['en'],
        downloadUrl: `${STANDARD_EBOOKS_BASE}/ebooks/herman-melville/moby-dick/downloads/herman-melville_moby-dick.epub`,
        formats: [{ mimeType: 'application/epub+zip', url: `${STANDARD_EBOOKS_BASE}/ebooks/herman-melville/moby-dick/downloads/herman-melville_moby-dick.epub`, label: 'EPUB' }],
        source: 'standardebooks',
    },
    {
        id: 'standard-alice',
        title: 'Alice\'s Adventures in Wonderland',
        author: 'Lewis Carroll',
        authors: ['Lewis Carroll'],
        cover: `${STANDARD_EBOOKS_BASE}/images/covers/lewis-carroll_alices-adventures-in-wonderland.jpg`,
        subjects: ['Fantasy', 'Children', 'Classic'],
        languages: ['en'],
        downloadUrl: `${STANDARD_EBOOKS_BASE}/ebooks/lewis-carroll/alices-adventures-in-wonderland/downloads/lewis-carroll_alices-adventures-in-wonderland.epub`,
        formats: [{ mimeType: 'application/epub+zip', url: `${STANDARD_EBOOKS_BASE}/ebooks/lewis-carroll/alices-adventures-in-wonderland/downloads/lewis-carroll_alices-adventures-in-wonderland.epub`, label: 'EPUB' }],
        source: 'standardebooks',
    },
    {
        id: 'standard-sherlock',
        title: 'The Adventures of Sherlock Holmes',
        author: 'Arthur Conan Doyle',
        authors: ['Arthur Conan Doyle'],
        cover: `${STANDARD_EBOOKS_BASE}/images/covers/arthur-conan-doyle_the-adventures-of-sherlock-holmes.jpg`,
        subjects: ['Mystery', 'Detective', 'Classic'],
        languages: ['en'],
        downloadUrl: `${STANDARD_EBOOKS_BASE}/ebooks/arthur-conan-doyle/the-adventures-of-sherlock-holmes/downloads/arthur-conan-doyle_the-adventures-of-sherlock-holmes.epub`,
        formats: [{ mimeType: 'application/epub+zip', url: `${STANDARD_EBOOKS_BASE}/ebooks/arthur-conan-doyle/the-adventures-of-sherlock-holmes/downloads/arthur-conan-doyle_the-adventures-of-sherlock-holmes.epub`, label: 'EPUB' }],
        source: 'standardebooks',
    },
];

export function getStandardEbooks(): Book[] {
    return STANDARD_EBOOKS_CATALOG;
}

export function searchStandardEbooks(query: string): Book[] {
    const lowerQuery = query.toLowerCase();
    return STANDARD_EBOOKS_CATALOG.filter(book =>
        book.title.toLowerCase().includes(lowerQuery) ||
        book.author.toLowerCase().includes(lowerQuery) ||
        book.subjects.some(s => s.toLowerCase().includes(lowerQuery))
    );
}

// ========== OceanPDF Search (via scraping API) ==========
export async function searchOceanPDF(options: SearchOptions = {}): Promise<SearchResult> {
    const page = options.page || 1;
    const query = options.query || options.topic || options.author || '';

    if (!query) {
        return {
            books: [],
            totalCount: 0,
            hasNext: false,
            hasPrevious: page > 1,
            currentPage: page,
        };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`/api/oceanpdf?q=${encodeURIComponent(query)}&page=${page}`, {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`OceanPDF API returned ${response.status}`);
        }

        const data = await response.json();

        // Transform OceanPDF results to Book format
        const books: Book[] = (data.books || []).map((item: {
            id: string;
            title: string;
            author: string;
            cover: string | null;
            downloadUrl: string | null;
            previewUrl: string;
            description?: string;
        }) => ({
            id: item.id,
            title: item.title,
            author: item.author,
            authors: [item.author],
            cover: item.cover,
            description: item.description,
            subjects: [],
            languages: ['en'],
            downloadUrl: item.downloadUrl,
            previewUrl: item.previewUrl,
            formats: item.downloadUrl ? [{ mimeType: 'application/epub+zip', url: item.downloadUrl, label: 'EPUB' }] : [],
            source: 'oceanpdf' as const,
        }));

        return {
            books,
            totalCount: books.length * 10, // Estimate
            hasNext: data.hasNext || books.length >= 10,
            hasPrevious: page > 1,
            currentPage: page,
        };
    } catch (error) {
        console.error('OceanPDF search error:', error);
        return {
            books: [],
            totalCount: 0,
            hasNext: false,
            hasPrevious: page > 1,
            currentPage: page,
        };
    }
}

// ========== Unified Multi-Provider Search (ALL SOURCES) ==========
export async function searchAllProviders(options: SearchOptions = {}): Promise<SearchResult> {
    const source = options.source || 'all';

    // If specific source requested
    if (source === 'gutenberg') {
        return searchGutenberg(options);
    }
    if (source === 'openlibrary') {
        return searchOpenLibrary(options);
    }
    if (source === 'internetarchive') {
        return searchInternetArchive(options);
    }
    // Scraped sources - use dedicated search
    if (source === 'oceanpdf' || source === 'allepub' || source === 'pdfdrive' || source === 'libgen') {
        return searchScrapedSource(source, options);
    }

    // Search ALL providers in parallel with timeout
    console.log('Searching all providers for:', options.query || 'popular books');

    // Search free ebook APIs
    const [gutenbergResults, openLibraryResults, archiveResults] = await Promise.allSettled([
        searchGutenberg(options),
        searchOpenLibrary(options),
        searchInternetArchive(options),
    ]);

    const allBooks: Book[] = [];
    let totalCount = 0;

    // Collect results from API-based providers
    if (gutenbergResults.status === 'fulfilled' && gutenbergResults.value.books.length > 0) {
        console.log(`Gutenberg: ${gutenbergResults.value.books.length} books`);
        allBooks.push(...gutenbergResults.value.books);
        totalCount += gutenbergResults.value.totalCount;
    }

    if (openLibraryResults.status === 'fulfilled' && openLibraryResults.value.books.length > 0) {
        console.log(`Open Library: ${openLibraryResults.value.books.length} books`);
        allBooks.push(...openLibraryResults.value.books);
        totalCount += openLibraryResults.value.totalCount;
    }

    if (archiveResults.status === 'fulfilled' && archiveResults.value.books.length > 0) {
        console.log(`Internet Archive: ${archiveResults.value.books.length} books`);
        allBooks.push(...archiveResults.value.books);
        totalCount += archiveResults.value.totalCount;
    }

    // Add matching Standard Ebooks
    if (options.query) {
        const standardMatches = searchStandardEbooks(options.query);
        if (standardMatches.length > 0) {
            console.log(`Standard Ebooks: ${standardMatches.length} books`);
            allBooks.push(...standardMatches);
            totalCount += standardMatches.length;
        }
    }

    // If we have a query, also search scraped sources (AllEpub is most reliable)
    if (options.query && allBooks.length < 20) {
        try {
            console.log('Also searching scraped sources...');
            const scrapedResults = await Promise.allSettled([
                searchScrapedSource('allepub', options),
                searchScrapedSource('libgen', options),
            ]);

            for (const result of scrapedResults) {
                if (result.status === 'fulfilled' && result.value.books.length > 0) {
                    console.log(`Scraped source: ${result.value.books.length} books`);
                    allBooks.push(...result.value.books);
                    totalCount += result.value.books.length;
                }
            }
        } catch (e) {
            console.log('Scraped sources failed, continuing with API results');
        }
    }

    // Remove duplicates based on title similarity
    const seen = new Set<string>();
    const uniqueBooks = allBooks.filter(book => {
        const key = book.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 25);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Sort: prioritize books with covers and download URLs
    uniqueBooks.sort((a, b) => {
        const scoreA = (a.cover ? 2 : 0) + (a.downloadUrl ? 3 : 0) + (a.downloadCount || 0) / 10000;
        const scoreB = (b.cover ? 2 : 0) + (b.downloadUrl ? 3 : 0) + (b.downloadCount || 0) / 10000;
        return scoreB - scoreA;
    });

    console.log(`Total unique books: ${uniqueBooks.length}`);

    // Generate Google Dork URLs for fallback search
    const searchTerm = options.query || options.topic || '';
    const googleDorkUrls = searchTerm ? {
        epub: `https://www.google.com/search?q=${encodeURIComponent(`"${searchTerm}" filetype:epub`)}`,
        pdf: `https://www.google.com/search?q=${encodeURIComponent(`"${searchTerm}" filetype:pdf`)}`,
        any: `https://www.google.com/search?q=${encodeURIComponent(`"${searchTerm}" free ebook download epub OR pdf`)}`
    } : undefined;

    return {
        books: uniqueBooks,
        totalCount,
        hasNext: options.page ? options.page < 10 : true,
        hasPrevious: (options.page || 1) > 1,
        currentPage: options.page || 1,
        googleDorkUrls,
    };
}

// Helper function to search scraped sources via API
async function searchScrapedSource(
    source: 'oceanpdf' | 'allepub' | 'pdfdrive' | 'libgen',
    options: SearchOptions
): Promise<SearchResult> {
    const page = options.page || 1;
    const query = options.query || options.topic || options.author || '';

    if (!query) {
        return {
            books: [],
            totalCount: 0,
            hasNext: false,
            hasPrevious: page > 1,
            currentPage: page,
        };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(`/api/scrape?q=${encodeURIComponent(query)}&source=${source}&page=${page}`, {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Scrape API returned ${response.status}`);
        }

        const data = await response.json();

        // Transform scraped results to Book format
        const books: Book[] = (data.books || []).map((item: {
            id: string;
            title: string;
            author: string;
            cover: string | null;
            downloadUrl: string | null;
            previewUrl: string;
            description?: string;
        }) => ({
            id: item.id,
            title: item.title,
            author: item.author,
            authors: [item.author],
            cover: item.cover,
            description: item.description,
            subjects: [],
            languages: ['en'],
            downloadUrl: item.downloadUrl,
            previewUrl: item.previewUrl,
            formats: [],
            source: source,
        }));

        return {
            books,
            totalCount: data.totalCount || books.length * 5,
            hasNext: data.hasNext || books.length >= 10,
            hasPrevious: page > 1,
            currentPage: page,
        };
    } catch (error) {
        console.error(`${source} search error:`, error);
        return {
            books: [],
            totalCount: 0,
            hasNext: false,
            hasPrevious: page > 1,
            currentPage: page,
        };
    }
}

// ========== Get Popular Books from ALL Sources ==========
export async function getPopularBooks(page = 1): Promise<SearchResult> {
    console.log('Loading popular books from all sources...');

    // Get popular from multiple sources in parallel
    const [gutenbergPopular, archivePopular, googlePopular] = await Promise.allSettled([
        searchGutenberg({ page, sort: 'popular' }),
        searchInternetArchive({ page: 1, sort: 'popular' }),
        searchGoogleBooks({ page: 1, sort: 'popular' }),
    ]);

    const allBooks: Book[] = [];

    // Add Standard Ebooks first (high quality)
    allBooks.push(...getStandardEbooks());

    // Add from each source
    if (gutenbergPopular.status === 'fulfilled') {
        allBooks.push(...gutenbergPopular.value.books.slice(0, 15));
    }
    if (archivePopular.status === 'fulfilled') {
        allBooks.push(...archivePopular.value.books.slice(0, 10));
    }
    if (googlePopular.status === 'fulfilled') {
        allBooks.push(...googlePopular.value.books.slice(0, 10));
    }

    // Remove duplicates
    const seen = new Set<string>();
    const uniqueBooks = allBooks.filter(book => {
        const key = book.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 25);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Shuffle for variety but keep Standard Ebooks near top
    const standardBooks = uniqueBooks.filter(b => b.source === 'standardebooks');
    const otherBooks = uniqueBooks.filter(b => b.source !== 'standardebooks');

    // Shuffle other books
    for (let i = otherBooks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherBooks[i], otherBooks[j]] = [otherBooks[j], otherBooks[i]];
    }

    const combined = [...standardBooks.slice(0, 4), ...otherBooks];

    return {
        books: combined,
        totalCount: combined.length,
        hasNext: page < 5,
        hasPrevious: page > 1,
        currentPage: page,
    };
}

// ========== Category Helpers ==========
export const POPULAR_CATEGORIES = [
    { id: 'fiction', name: 'Fiction', topic: 'fiction' },
    { id: 'adventure', name: 'Adventure', topic: 'adventure' },
    { id: 'romance', name: 'Romance', topic: 'love' },
    { id: 'mystery', name: 'Mystery', topic: 'mystery' },
    { id: 'scifi', name: 'Science Fiction', topic: 'science fiction' },
    { id: 'fantasy', name: 'Fantasy', topic: 'fantasy' },
    { id: 'horror', name: 'Horror', topic: 'horror' },
    { id: 'philosophy', name: 'Philosophy', topic: 'philosophy' },
    { id: 'history', name: 'History', topic: 'history' },
    { id: 'biography', name: 'Biography', topic: 'biography' },
    { id: 'poetry', name: 'Poetry', topic: 'poetry' },
    { id: 'children', name: 'Children', topic: 'children' },
];

export const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ar', name: 'Arabic' },
];

export const BOOK_SOURCES = [
    { id: 'all', name: 'All Sources', description: 'Search all libraries at once' },
    { id: 'gutenberg', name: 'Gutenberg', description: '70,000+ public domain classics' },
    { id: 'openlibrary', name: 'Open Library', description: 'Millions of books' },
    { id: 'internetarchive', name: 'Archive.org', description: 'Massive digital library' },
    { id: 'oceanpdf', name: 'OceanPDF', description: 'Popular ebooks (PDF/EPUB)' },
    { id: 'allepub', name: 'AllEpub', description: 'EPUB ebook library' },
    { id: 'pdfdrive', name: 'PDF Drive', description: 'Large PDF collection' },
    { id: 'libgen', name: 'LibGen', description: 'Academic & technical books' },
];

// ========== Download Helper ==========
export async function downloadBook(book: Book): Promise<ArrayBuffer | null> {
    if (!book.downloadUrl) {
        console.error('No download URL available for book:', book.title);
        return null;
    }

    try {
        let downloadUrl = book.downloadUrl;

        // Handle Archive.org - need to resolve actual EPUB URL first
        if (book.source === 'internetarchive' || downloadUrl.includes('archive.org/download/')) {
            // Extract identifier from URL
            const match = downloadUrl.match(/archive\.org\/download\/([^/]+)/);
            if (match) {
                const identifier = match[1];
                console.log(`Resolving Archive.org EPUB for: ${identifier}`);

                // Get actual EPUB URL from our API
                const metadataRes = await fetch(`/api/archive/epub?id=${encodeURIComponent(identifier)}`);
                if (metadataRes.ok) {
                    const metadata = await metadataRes.json();
                    if (metadata.epubUrl) {
                        downloadUrl = metadata.epubUrl;
                        console.log(`Resolved to: ${downloadUrl}`);
                    } else if (metadata.pdfUrl) {
                        downloadUrl = metadata.pdfUrl;
                        console.log(`No EPUB, using PDF: ${downloadUrl}`);
                    } else {
                        throw new Error('No EPUB or PDF available');
                    }
                } else {
                    const error = await metadataRes.json().catch(() => ({}));
                    throw new Error(error.error || 'Failed to resolve Archive.org URL');
                }
            }
        }

        // Use the proxy API to avoid CORS issues
        const proxyUrl = `/api/download?url=${encodeURIComponent(downloadUrl)}`;
        console.log(`Downloading via proxy: ${proxyUrl}`);

        const response = await fetch(proxyUrl);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || 'Download failed');
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log(`Downloaded ${arrayBuffer.byteLength} bytes`);

        return arrayBuffer;
    } catch (error) {
        console.error('Failed to download book:', error);
        return null;
    }
}
