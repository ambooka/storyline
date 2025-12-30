// OceanPDF Scraper - oceanofpdf.com
// This site frequently changes domains and blocks scrapers
// Fallback to direct site links when blocked

import {
    BaseScraper,
    ScraperConfig,
    ScraperResult,
    ScrapedBook,
    fetchWithTimeout,
    decodeHtmlEntities,
    generateId,
    normalizeAuthor,
} from './base-scraper';

// Known OceanPDF domains - try in order (theoceanofpdf.com works best)
const OCEANPDF_DOMAINS = [
    'https://theoceanofpdf.com',  // Primary - returns 200
    'https://www.theoceanofpdf.com',
    'https://oceanofpdf.com',     // Often blocked by Cloudflare
    'https://www.oceanofpdf.com',
    'https://oceanpdf.com',
];

export class OceanPDFScraper extends BaseScraper {
    config: ScraperConfig = {
        id: 'oceanpdf',
        name: 'OceanPDF',
        baseUrl: OCEANPDF_DOMAINS[0],
        alternativeUrls: OCEANPDF_DOMAINS.slice(1),
        enabled: true,
        rateLimit: 2000,
        timeout: 15000,
        searchPath: '/?s={query}',
    };

    // Override fallback to always use oceanofpdf.com for user access
    protected getFallbackUrls(query: string): {
        searchUrl: string;
        homeUrl: string;
        googleSearch: string;
    } {
        return {
            searchUrl: `https://oceanofpdf.com/?s=${encodeURIComponent(query)}`,
            homeUrl: 'https://oceanofpdf.com',
            googleSearch: `https://www.google.com/search?q=${encodeURIComponent(query)}+site:oceanofpdf.com`,
        };
    }

    async search(query: string, page: number = 1): Promise<ScraperResult> {
        const fallbackUrls = this.getFallbackUrls(query);

        // Try each domain until one works
        for (const baseUrl of OCEANPDF_DOMAINS) {
            try {
                const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ''}`;
                this.log(`Trying: ${searchUrl}`);

                const response = await fetchWithTimeout(searchUrl, {}, this.config.timeout, 1);

                if (!response.ok) {
                    this.log(`${baseUrl} returned ${response.status}`);
                    continue;
                }

                const html = await response.text();

                // Check if we got a valid response (not a block page)
                if (html.includes('Access Denied') || html.includes('blocked') || html.length < 1000) {
                    this.log(`${baseUrl} blocked or invalid response`);
                    continue;
                }

                const books = this.parseResults(html, baseUrl);

                if (books.length > 0) {
                    return {
                        books,
                        totalCount: books.length * 5,
                        hasNext: books.length >= 10,
                        source: this.config.id,
                        fallbackUrls: { ...fallbackUrls, searchUrl: `${baseUrl}/?s=${encodeURIComponent(query)}` },
                    };
                }
            } catch (error) {
                this.error(`Error with ${baseUrl}:`, error);
                continue;
            }
        }

        // All domains failed - return with fallback links
        this.log('All OceanPDF domains failed, returning fallback links');
        return {
            ...this.createErrorResult(query, 'OceanPDF is currently blocking requests. Click below to search directly.'),
            fallbackUrls,
        };
    }

    private parseResults(html: string, baseUrl: string): ScrapedBook[] {
        const books: ScrapedBook[] = [];

        // Pattern 1: Match wp-block-post-title h2 elements (theoceanofpdf.com)
        // Example: <h2 class="wp-block-post-title..."><a href="...">Title</a></h2>
        const wpBlockPattern = /<h2[^>]*class="[^"]*wp-block-post-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>\s*<\/h2>/gi;
        let wpMatch;

        while ((wpMatch = wpBlockPattern.exec(html)) !== null && books.length < 20) {
            const url = wpMatch[1];
            let title = decodeHtmlEntities(wpMatch[2]);

            // Skip non-book URLs (about pages, etc)
            if (!url || url.includes('/about') || url.includes('/contact') || title.length < 5) continue;

            // Clean title - remove [PDF], Download, etc.
            title = title
                .replace(/\[PDF\]\s*/gi, '')
                .replace(/\s*PDF\s*$/i, '')
                .replace(/\s*-?\s*Free Download\s*$/i, '')
                .replace(/\s*Download\s*$/i, '')
                .trim();

            // Try to extract author from title (often "Title by Author")
            let author = 'Unknown Author';
            const byMatch = title.match(/(.+?)\s+by\s+([A-Z][^–\-]+?)(?:\s*[–\-]|$)/i);
            if (byMatch) {
                title = byMatch[1].trim();
                author = normalizeAuthor(byMatch[2]);
            }

            books.push({
                id: generateId(this.config.id, url),
                title,
                author,
                cover: null, // theoceanofpdf.com doesn't show covers in search
                downloadUrl: null,
                previewUrl: url.startsWith('http') ? url : `${baseUrl}${url}`,
            });
        }

        // Pattern 2: Classic article-based layout (fallback for other OceanPDF domains)
        if (books.length === 0) {
            const articlePattern = /<article[^>]*>([\s\S]*?)<\/article>/gi;
            let match;

            while ((match = articlePattern.exec(html)) !== null && books.length < 20) {
                const articleHtml = match[1];

                const titleMatch =
                    articleHtml.match(/<h2[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i) ||
                    articleHtml.match(/<h3[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i);

                if (!titleMatch) continue;

                const url = titleMatch[1];
                const title = decodeHtmlEntities(titleMatch[2]);

                if (!title || title.length < 3) continue;

                let cover: string | null = null;
                const imgMatch = articleHtml.match(/<img[^>]*src="([^"]*)"[^>]*/i);
                if (imgMatch && !imgMatch[1].includes('avatar')) {
                    cover = imgMatch[1];
                }

                let author = 'Unknown Author';
                const authorMatch =
                    articleHtml.match(/by\s+<a[^>]*>([^<]*)<\/a>/i) ||
                    articleHtml.match(/by\s+([A-Z][a-zA-Z\s.]+?)(?:\s+(?:EPUB|PDF|Free|Download|\||<))/i);
                if (authorMatch) {
                    author = normalizeAuthor(authorMatch[1]);
                }

                books.push({
                    id: generateId(this.config.id, url),
                    title: title.replace(/\s*(EPUB|PDF|Free Download)\s*/gi, '').trim(),
                    author,
                    cover,
                    downloadUrl: null,
                    previewUrl: url.startsWith('http') ? url : `${baseUrl}${url}`,
                });
            }
        }

        return books;
    }
}

export const oceanPDFScraper = new OceanPDFScraper();
