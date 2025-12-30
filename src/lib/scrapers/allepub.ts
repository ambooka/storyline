// AllEpub Scraper - allepub.com
// WordPress-based ebook site - most reliable of the scraped sources

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

export class AllEpubScraper extends BaseScraper {
    config: ScraperConfig = {
        id: 'allepub',
        name: 'AllEpub',
        baseUrl: 'https://allepub.com',
        alternativeUrls: ['https://www.allepub.com'],
        enabled: true,
        rateLimit: 2000,
        timeout: 15000,
        searchPath: '/?s={query}',
    };

    async search(query: string, page: number = 1): Promise<ScraperResult> {
        const fallbackUrls = this.getFallbackUrls(query);

        try {
            const searchUrl = `${this.config.baseUrl}/?s=${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ''}`;
            this.log(`Searching: ${searchUrl}`);

            const response = await fetchWithTimeout(searchUrl, {}, this.config.timeout);

            if (!response.ok) {
                throw new Error(`AllEpub returned ${response.status}`);
            }

            const html = await response.text();
            const books = this.parseResults(html);

            return {
                books,
                totalCount: books.length * 5,
                hasNext: books.length >= 10,
                source: this.config.id,
                fallbackUrls,
            };
        } catch (error) {
            this.error('Search failed:', error);
            return this.createErrorResult(query, 'AllEpub search failed. Click below to search directly.');
        }
    }

    private parseResults(html: string): ScrapedBook[] {
        const books: ScrapedBook[] = [];

        const articlePattern = /<article[^>]*>([\s\S]*?)<\/article>/gi;
        let match;

        while ((match = articlePattern.exec(html)) !== null && books.length < 20) {
            const articleHtml = match[1];

            const titleMatch =
                articleHtml.match(/<h2[^>]*entry-title[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i) ||
                articleHtml.match(/<h2[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i);

            if (!titleMatch) continue;

            const url = titleMatch[1];
            let title = decodeHtmlEntities(titleMatch[2]);

            if (!title || title.length < 3 || title.toLowerCase().includes('best-selling')) continue;

            title = title.replace(/\s*(EPUB|PDF|Free Download)\s*/gi, '').trim();

            let cover: string | null = null;
            const imgMatch = articleHtml.match(/<img[^>]*src="([^"]*wp-content\/uploads[^"]*)"[^>]*/i);
            if (imgMatch) {
                cover = imgMatch[1];
            }

            let author = 'Unknown Author';
            const authorFromTitle = title.match(/by\s+([A-Z][a-zA-Z\s.]+?)$/i);
            if (authorFromTitle) {
                author = normalizeAuthor(authorFromTitle[1]);
                title = title.replace(/\s+by\s+[A-Z][a-zA-Z\s.]+$/i, '').trim();
            } else {
                const authorMatch = articleHtml.match(/by\s+<a[^>]*>([^<]*)<\/a>/i);
                if (authorMatch) {
                    author = normalizeAuthor(authorMatch[1]);
                }
            }

            let description: string | undefined;
            const excerptMatch = articleHtml.match(/<div[^>]*entry-content[^>]*>([\s\S]*?)<\/div>/i);
            if (excerptMatch) {
                description = decodeHtmlEntities(excerptMatch[1]).slice(0, 200);
            }

            books.push({
                id: generateId(this.config.id, url),
                title,
                author,
                cover,
                downloadUrl: null,
                previewUrl: url,
                description,
            });
        }

        return books;
    }
}

export const allEpubScraper = new AllEpubScraper();
