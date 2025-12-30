// Library Genesis Scraper - libgen mirrors
// Large academic/technical ebook library

import {
    BaseScraper,
    ScraperConfig,
    ScraperResult,
    ScrapedBook,
    fetchWithTimeout,
    decodeHtmlEntities,
    normalizeAuthor,
} from './base-scraper';

// LibGen has multiple mirrors
const LIBGEN_MIRRORS = [
    'https://libgen.is',
    'https://libgen.li',
    'https://libgen.gs',
    'https://libgen.st',
    'https://libgen.rs',
];

export class LibGenScraper extends BaseScraper {
    config: ScraperConfig = {
        id: 'libgen',
        name: 'Library Genesis',
        baseUrl: LIBGEN_MIRRORS[0],
        alternativeUrls: LIBGEN_MIRRORS.slice(1),
        enabled: true,
        rateLimit: 3000,
        timeout: 20000,
        searchPath: '/search.php?req={query}&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def',
    };

    async search(query: string, page: number = 1): Promise<ScraperResult> {
        const fallbackUrls = this.getFallbackUrls(query);

        for (const mirror of LIBGEN_MIRRORS) {
            try {
                const offset = (page - 1) * 25;
                const searchUrl = `${mirror}/search.php?req=${encodeURIComponent(query)}&lg_topic=libgen&open=0&view=simple&res=25&phrase=1&column=def${offset > 0 ? `&page=${page}` : ''}`;
                this.log(`Trying: ${searchUrl}`);

                const response = await fetchWithTimeout(searchUrl, {}, this.config.timeout, 1);

                if (!response.ok) {
                    this.log(`${mirror} returned ${response.status}`);
                    continue;
                }

                const html = await response.text();

                // Check for valid response
                if (html.length < 500 || html.includes('Error') || html.includes('blocked')) {
                    this.log(`${mirror} invalid response`);
                    continue;
                }

                const books = this.parseResults(html, mirror);

                if (books.length > 0) {
                    return {
                        books,
                        totalCount: books.length * 10,
                        hasNext: books.length >= 25,
                        source: this.config.id,
                        fallbackUrls: { ...fallbackUrls, searchUrl },
                    };
                }
            } catch (error) {
                this.error(`Error with ${mirror}:`, error);
                continue;
            }
        }

        return this.createErrorResult(query, 'Library Genesis is currently unavailable. Click below to try directly.');
    }

    private parseResults(html: string, mirror: string): ScrapedBook[] {
        const books: ScrapedBook[] = [];

        // LibGen uses table layout - find result rows
        const rowPattern = /<tr[^>]*valign="top"[^>]*>([\s\S]*?)<\/tr>/gi;
        let match;

        while ((match = rowPattern.exec(html)) !== null && books.length < 25) {
            const rowHtml = match[1];

            // Skip header rows (contain <th>)
            if (rowHtml.includes('<th')) continue;

            // Extract cells
            const cells: string[] = [];
            const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            let cellMatch;
            while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
                cells.push(cellMatch[1]);
            }

            if (cells.length < 4) continue;

            // Find the title cell (contains book link with green or blue color usually)
            let title = '';
            let bookUrl = '';
            let author = 'Unknown Author';

            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];

                // Author is usually in a cell with just author links
                const authorLinks = cell.match(/<a[^>]*>([^<]+)<\/a>/gi);
                if (authorLinks && authorLinks.length > 0 && !title && i < 3) {
                    const names = authorLinks.map(l => {
                        const m = l.match(/>([^<]+)</);
                        return m ? m[1] : '';
                    }).filter(Boolean);
                    if (names.length > 0 && names[0].length > 2) {
                        author = normalizeAuthor(names.slice(0, 2).join(', '));
                    }
                }

                // Title is in a cell with book.php link
                const titleMatch = cell.match(/<a[^>]*href="([^"]*book\.php[^"]*|\/book\/[^"]*)"[^>]*>([^<]+)<\/a>/i);
                if (titleMatch && titleMatch[2].length > 3) {
                    bookUrl = titleMatch[1];
                    title = decodeHtmlEntities(titleMatch[2]);
                }
            }

            if (!title) continue;

            // Get file info from cells
            let fileSize: string | undefined;
            let format: string | undefined;
            for (const cell of cells) {
                const sizeMatch = cell.match(/(\d+(?:\.\d+)?\s*(?:Kb|Mb|Gb|KB|MB|GB))/i);
                if (sizeMatch) fileSize = sizeMatch[1];

                const formatMatch = cell.match(/\b(pdf|epub|mobi|djvu|azw3|fb2)\b/i);
                if (formatMatch) format = formatMatch[1].toUpperCase();
            }

            const fullUrl = bookUrl.startsWith('http') ? bookUrl : `${mirror}${bookUrl.startsWith('/') ? '' : '/'}${bookUrl}`;

            books.push({
                id: `libgen-${books.length}-${title.slice(0, 20).replace(/\W/g, '')}`,
                title,
                author,
                cover: null,
                downloadUrl: null,
                previewUrl: fullUrl,
                fileSize,
                format,
            });
        }

        return books;
    }
}

export const libGenScraper = new LibGenScraper();
