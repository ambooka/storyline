// Unified Scraper Interface
// Manages all ebook scrapers and provides parallel search with fallback support

import { ScrapedBook, ScraperResult } from './base-scraper';
import { oceanPDFScraper } from './oceanpdf';
import { allEpubScraper } from './allepub';
import { pdfDriveScraper } from './pdfdrive';
import { libGenScraper } from './libgen';

// All available scrapers
export const SCRAPERS = {
    oceanpdf: oceanPDFScraper,
    allepub: allEpubScraper,
    pdfdrive: pdfDriveScraper,
    libgen: libGenScraper,
} as const;

export type ScraperSource = keyof typeof SCRAPERS;

// Scraper metadata for UI
export const SCRAPER_INFO: Record<ScraperSource, {
    name: string;
    description: string;
    emoji: string;
    directSearchUrl: (query: string) => string;
}> = {
    oceanpdf: {
        name: 'OceanPDF',
        description: 'Popular ebooks (PDF/EPUB)',
        emoji: '🌊',
        directSearchUrl: (q) => `https://oceanofpdf.com/?s=${encodeURIComponent(q)}`,
    },
    allepub: {
        name: 'AllEpub',
        description: 'EPUB ebook library',
        emoji: '📱',
        directSearchUrl: (q) => `https://allepub.com/?s=${encodeURIComponent(q)}`,
    },
    pdfdrive: {
        name: 'PDF Drive',
        description: 'Large PDF collection',
        emoji: '📄',
        directSearchUrl: (q) => `https://www.pdfdrive.com/search?q=${encodeURIComponent(q)}`,
    },
    libgen: {
        name: 'LibGen',
        description: 'Academic & technical books',
        emoji: '🎓',
        directSearchUrl: (q) => `https://libgen.is/search.php?req=${encodeURIComponent(q)}`,
    },
};

// Get all available scraper sources
export function getScraperSources(): ScraperSource[] {
    return Object.keys(SCRAPERS) as ScraperSource[];
}

// Get direct search URL for a source
export function getDirectSearchUrl(source: ScraperSource, query: string): string {
    return SCRAPER_INFO[source].directSearchUrl(query);
}

// Search a single source
export async function searchSource(source: ScraperSource, query: string, page: number = 1): Promise<ScraperResult> {
    const scraper = SCRAPERS[source];
    if (!scraper) {
        return {
            books: [],
            totalCount: 0,
            hasNext: false,
            source,
            error: `Unknown source: ${source}`,
        };
    }
    return scraper.search(query, page);
}

// Search multiple sources in parallel with fallback
export async function searchMultipleSources(
    sources: ScraperSource[],
    query: string,
    page: number = 1,
    timeoutMs: number = 25000
): Promise<{
    results: Map<ScraperSource, ScraperResult>;
    allBooks: ScrapedBook[];
    fallbackLinks: { source: ScraperSource; name: string; emoji: string; url: string }[];
}> {
    const results = new Map<ScraperSource, ScraperResult>();
    const allBooks: ScrapedBook[] = [];
    const fallbackLinks: { source: ScraperSource; name: string; emoji: string; url: string }[] = [];

    // Create search promises with timeout
    const searchPromises = sources.map(async (source) => {
        try {
            const result = await Promise.race([
                searchSource(source, query, page),
                new Promise<ScraperResult>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
                ),
            ]);
            return { source, result };
        } catch (error) {
            // On error, add fallback link
            return {
                source,
                result: {
                    books: [],
                    totalCount: 0,
                    hasNext: false,
                    source,
                    error: error instanceof Error ? error.message : 'Search failed',
                    fallbackUrls: {
                        searchUrl: getDirectSearchUrl(source, query),
                        homeUrl: SCRAPERS[source].config.baseUrl,
                        googleSearch: `https://google.com/search?q=${encodeURIComponent(query)}+site:${new URL(SCRAPERS[source].config.baseUrl).hostname}`,
                    },
                } as ScraperResult,
            };
        }
    });

    // Wait for all searches
    const searchResults = await Promise.allSettled(searchPromises);

    // Collect results and fallback links
    for (const result of searchResults) {
        if (result.status === 'fulfilled') {
            const { source, result: scraperResult } = result.value;
            results.set(source, scraperResult);

            if (scraperResult.books.length > 0) {
                allBooks.push(...scraperResult.books);
            }

            // Always add fallback link for each source
            fallbackLinks.push({
                source,
                name: SCRAPER_INFO[source].name,
                emoji: SCRAPER_INFO[source].emoji,
                url: scraperResult.fallbackUrls?.searchUrl || getDirectSearchUrl(source, query),
            });
        }
    }

    return { results, allBooks, fallbackLinks };
}

// Search all enabled scrapers
export async function searchAllScrapers(query: string, page: number = 1): Promise<{
    results: Map<ScraperSource, ScraperResult>;
    allBooks: ScrapedBook[];
    totalCount: number;
    fallbackLinks: { source: ScraperSource; name: string; emoji: string; url: string }[];
}> {
    const enabledSources = getScraperSources().filter(source => SCRAPERS[source].config.enabled);
    const { results, allBooks, fallbackLinks } = await searchMultipleSources(enabledSources, query, page);

    let totalCount = 0;
    results.forEach(r => totalCount += r.totalCount);

    return { results, allBooks, totalCount, fallbackLinks };
}

// Re-export types
export type { ScrapedBook, ScraperResult, ScraperConfig } from './base-scraper';
