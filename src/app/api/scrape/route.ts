import { NextRequest, NextResponse } from 'next/server';
import {
    searchSource,
    searchMultipleSources,
    searchAllScrapers,
    getScraperSources,
    getDirectSearchUrl,
    SCRAPER_INFO,
    ScraperSource,
} from '@/lib/scrapers';

// Unified scraper API endpoint with fallback support
// Always returns fallback links when scraping fails or is blocked
//
// Usage:
//   GET /api/scrape?q=query                      - Search all sources
//   GET /api/scrape?q=query&source=oceanpdf      - Search single source
//   GET /api/scrape?q=query&sources=oceanpdf,allepub  - Search multiple sources
//   GET /api/scrape?sources=list                 - List available sources

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q');
    const source = request.nextUrl.searchParams.get('source');
    const sources = request.nextUrl.searchParams.get('sources');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');

    // List available sources with their direct search URLs
    if (sources === 'list') {
        return NextResponse.json({
            sources: getScraperSources().map(id => ({
                id,
                ...SCRAPER_INFO[id],
                directSearchUrl: getDirectSearchUrl(id, 'example'),
            })),
        });
    }

    // Require query for search
    if (!query) {
        return NextResponse.json({ error: 'Missing search query (q parameter)' }, { status: 400 });
    }

    try {
        // Single source search
        if (source) {
            const validSource = source as ScraperSource;
            if (!getScraperSources().includes(validSource)) {
                return NextResponse.json({ error: `Invalid source: ${source}` }, { status: 400 });
            }

            const result = await searchSource(validSource, query, page);

            // Always include direct search link
            return NextResponse.json({
                ...result,
                directSearchUrl: getDirectSearchUrl(validSource, query),
                sourceName: SCRAPER_INFO[validSource].name,
                sourceEmoji: SCRAPER_INFO[validSource].emoji,
            });
        }

        // Multiple sources search
        if (sources && sources !== 'all') {
            const sourceList = sources.split(',') as ScraperSource[];
            const validSources = sourceList.filter(s => getScraperSources().includes(s));

            if (validSources.length === 0) {
                return NextResponse.json({ error: 'No valid sources specified' }, { status: 400 });
            }

            const { results, allBooks, fallbackLinks } = await searchMultipleSources(validSources, query, page);

            return NextResponse.json({
                books: allBooks,
                totalCount: allBooks.length,
                hasNext: Array.from(results.values()).some(r => r.hasNext),
                sources: Object.fromEntries(results),
                fallbackLinks,
                query,
                page,
            });
        }

        // Search all sources
        const { allBooks, totalCount, results, fallbackLinks } = await searchAllScrapers(query, page);

        return NextResponse.json({
            books: allBooks,
            totalCount,
            hasNext: Array.from(results.values()).some(r => r.hasNext),
            sources: Object.fromEntries(results),
            fallbackLinks,
            query,
            page,
        });

    } catch (error) {
        console.error('Scraper API error:', error);

        // Even on error, return fallback links
        const allSources = getScraperSources();
        const fallbackLinks = allSources.map(id => ({
            source: id,
            name: SCRAPER_INFO[id].name,
            emoji: SCRAPER_INFO[id].emoji,
            url: getDirectSearchUrl(id, query || ''),
        }));

        return NextResponse.json({
            error: 'Scraper search failed. Use the links below to search directly.',
            books: [],
            fallbackLinks,
        });
    }
}
