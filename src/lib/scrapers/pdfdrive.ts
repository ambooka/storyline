// PDF Drive Scraper - pdfdrive.com
// Large collection of PDF ebooks

import {
    BaseScraper,
    ScraperConfig,
    ScraperResult,
    ScrapedBook,
    fetchWithTimeout,
    decodeHtmlEntities,
    generateId,
} from './base-scraper';

export class PDFDriveScraper extends BaseScraper {
    config: ScraperConfig = {
        id: 'pdfdrive',
        name: 'PDF Drive',
        baseUrl: 'https://www.pdfdrive.com',
        alternativeUrls: ['https://pdfdrive.com', 'https://pdfdrive.to'],
        enabled: true,
        rateLimit: 2000,
        timeout: 15000,
        searchPath: '/search?q={query}',
    };

    async search(query: string, page: number = 1): Promise<ScraperResult> {
        const fallbackUrls = this.getFallbackUrls(query);
        const allDomains = [this.config.baseUrl, ...this.config.alternativeUrls];

        for (const baseUrl of allDomains) {
            try {
                const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(query)}&pagecount=&pubyear=&searchin=&em=${page}`;
                this.log(`Trying: ${searchUrl}`);

                const response = await fetchWithTimeout(searchUrl, {}, this.config.timeout, 1);

                if (!response.ok) {
                    this.log(`${baseUrl} returned ${response.status}`);
                    continue;
                }

                const html = await response.text();

                // Check for blocking
                if (html.includes('Access Denied') || html.includes('blocked') || html.length < 500) {
                    this.log(`${baseUrl} appears blocked`);
                    continue;
                }

                const books = this.parseResults(html, baseUrl);

                if (books.length > 0) {
                    return {
                        books,
                        totalCount: books.length * 10,
                        hasNext: books.length >= 10,
                        source: this.config.id,
                        fallbackUrls: { ...fallbackUrls, searchUrl },
                    };
                }
            } catch (error) {
                this.error(`Error with ${baseUrl}:`, error);
                continue;
            }
        }

        return this.createErrorResult(query, 'PDF Drive search failed. Click below to search directly.');
    }

    private parseResults(html: string, baseUrl: string): ScrapedBook[] {
        const books: ScrapedBook[] = [];

        // PDF Drive uses file-left + file-right structure
        const filePattern = /<div[^>]*class="[^"]*file-left[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*file-right[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
        let match;

        while ((match = filePattern.exec(html)) !== null && books.length < 20) {
            const leftHtml = match[1];
            const rightHtml = match[2];

            // Get cover from left side
            let cover: string | null = null;
            const imgMatch = leftHtml.match(/<img[^>]*data-original="([^"]*)"[^>]*/i) ||
                leftHtml.match(/<img[^>]*src="([^"]*)"[^>]*/i);
            if (imgMatch) {
                cover = imgMatch[1].startsWith('http') ? imgMatch[1] : `${baseUrl}${imgMatch[1]}`;
            }

            // Get title and link from right side
            const titleMatch = rightHtml.match(/<h2[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*title="([^"]*)"[^>]*>/i) ||
                rightHtml.match(/<a[^>]*href="([^"]*)"[^>]*class="[^"]*ai-search[^"]*"[^>]*>([^<]*)<\/a>/i);

            if (!titleMatch) continue;

            const url = titleMatch[1].startsWith('http') ? titleMatch[1] : `${baseUrl}${titleMatch[1]}`;
            const title = decodeHtmlEntities(titleMatch[2]).trim();

            if (!title || title.length < 3) continue;

            // Get file info
            let fileSize: string | undefined;
            const sizeMatch = rightHtml.match(/(\d+(?:\.\d+)?\s*(?:KB|MB|GB|Pages))/i);
            if (sizeMatch) fileSize = sizeMatch[1];

            books.push({
                id: generateId(this.config.id, url),
                title,
                author: 'Unknown Author',
                cover,
                downloadUrl: null,
                previewUrl: url,
                fileSize,
                format: 'PDF',
            });
        }

        // Fallback: simpler pattern
        if (books.length === 0) {
            const simplePattern = /<a[^>]*href="(\/\d+-[^"]+)"[^>]*>([^<]+)<\/a>/gi;
            let simpleMatch;

            while ((simpleMatch = simplePattern.exec(html)) !== null && books.length < 20) {
                const url = `${baseUrl}${simpleMatch[1]}`;
                const title = decodeHtmlEntities(simpleMatch[2]).trim();

                if (title && title.length > 5) {
                    books.push({
                        id: generateId(this.config.id, url),
                        title,
                        author: 'Unknown Author',
                        cover: null,
                        downloadUrl: null,
                        previewUrl: url,
                        format: 'PDF',
                    });
                }
            }
        }

        return books;
    }
}

export const pdfDriveScraper = new PDFDriveScraper();
