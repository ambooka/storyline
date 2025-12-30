// Base Scraper Class - Common utilities for all ebook scrapers

export interface ScrapedBook {
    id: string;
    title: string;
    author: string;
    cover: string | null;
    downloadUrl: string | null;
    previewUrl: string;
    description?: string;
    fileSize?: string;
    format?: string;
}

export interface ScraperResult {
    books: ScrapedBook[];
    totalCount: number;
    hasNext: boolean;
    source: string;
    error?: string;
    // Fallback URLs when scraping fails or is blocked
    fallbackUrls?: {
        searchUrl: string;      // Direct search URL on the site
        homeUrl: string;        // Site homepage
        googleSearch: string;   // Google search for this query on the site
    };
}

export interface ScraperConfig {
    id: string;
    name: string;
    baseUrl: string;
    alternativeUrls: string[];  // Fallback domains
    enabled: boolean;
    rateLimit: number;
    timeout: number;
    searchPath: string;         // Search URL path pattern
}

// Common headers for scraping requests - More realistic browser simulation
export const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
};

// Fetch with timeout, retry, and better error handling
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = 15000,
    retries: number = 2
): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    ...BROWSER_HEADERS,
                    ...options.headers,
                },
            });

            clearTimeout(timeoutId);

            // Handle redirects and check for blocking
            if (response.status === 403 || response.status === 503) {
                throw new Error(`Blocked: ${response.status}`);
            }

            return response;
        } catch (error) {
            if (attempt === retries) throw error;
            // Wait before retry with exponential backoff
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
    }
    throw new Error('Max retries exceeded');
}

// Generate Google search URL for a site
export function generateGoogleSearchUrl(query: string, site: string): string {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}+site:${site}`;
}

// Decode HTML entities
export function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#8217;/g, "'")
        .replace(/&#8216;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8211;/g, '-')
        .replace(/&#8212;/g, '—')
        .replace(/&#8230;/g, '...')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#\d+;/g, '')
        .replace(/<[^>]*>/g, '')
        .trim();
}

// Extract text from HTML element pattern
export function extractText(html: string, pattern: RegExp): string | null {
    const match = html.match(pattern);
    return match ? decodeHtmlEntities(match[1]) : null;
}

// Generate unique ID from URL
export function generateId(source: string, url: string): string {
    const slug = url
        .split('/')
        .filter(Boolean)
        .pop()
        ?.replace(/[^a-z0-9-]/gi, '-')
        .toLowerCase() || 'unknown';
    return `${source}-${slug}`;
}

// Normalize author name
export function normalizeAuthor(author: string): string {
    return author
        .replace(/\s*(EPUB|PDF|Free|Download|by)\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim() || 'Unknown Author';
}

// Base scraper abstract class with fallback support
export abstract class BaseScraper {
    abstract config: ScraperConfig;
    abstract search(query: string, page?: number): Promise<ScraperResult>;

    protected log(message: string): void {
        console.log(`[${this.config.id}] ${message}`);
    }

    protected error(message: string, error?: unknown): void {
        console.error(`[${this.config.id}] ${message}`, error);
    }

    // Generate fallback URLs for when scraping fails
    protected getFallbackUrls(query: string): {
        searchUrl: string;
        homeUrl: string;
        googleSearch: string;
    } {
        const searchPath = this.config.searchPath.replace('{query}', encodeURIComponent(query));
        return {
            searchUrl: `${this.config.baseUrl}${searchPath}`,
            homeUrl: this.config.baseUrl,
            googleSearch: generateGoogleSearchUrl(query, new URL(this.config.baseUrl).hostname),
        };
    }

    // Create error result with fallback links
    protected createErrorResult(query: string, errorMessage: string): ScraperResult {
        return {
            books: [],
            totalCount: 0,
            hasNext: false,
            source: this.config.id,
            error: errorMessage,
            fallbackUrls: this.getFallbackUrls(query),
        };
    }
}
