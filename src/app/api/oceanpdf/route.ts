import { NextRequest, NextResponse } from 'next/server';

// OceanPDF Scraper API - searches and scrapes book information
// OceanPDF uses multiple domains, we try them in order

const OCEANPDF_DOMAINS = [
    'https://www.allepub.com',
    'https://oceanofpdf.com',
    'https://theoceanofpdf.com',
];

interface OceanPDFBook {
    id: string;
    title: string;
    author: string;
    cover: string | null;
    downloadUrl: string | null;
    previewUrl: string;
    description?: string;
}

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');

    if (!query) {
        return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
    }

    // Try each domain until one works
    for (const baseUrl of OCEANPDF_DOMAINS) {
        try {
            const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ''}`;
            console.log('Trying OceanPDF domain:', searchUrl);

            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'max-age=0',
                },
            });

            if (!response.ok) {
                console.log(`${baseUrl} returned ${response.status}, trying next...`);
                continue;
            }

            const html = await response.text();
            const books = parseSearchResults(html, baseUrl);

            if (books.length > 0) {
                return NextResponse.json({
                    books,
                    query,
                    page,
                    hasNext: books.length >= 10,
                    source: baseUrl,
                });
            }
        } catch (error) {
            console.log(`Error with ${baseUrl}:`, error);
            continue;
        }
    }

    // All domains failed, return empty results
    console.log('All OceanPDF domains failed');
    return NextResponse.json({
        books: [],
        query,
        page,
        hasNext: false,
        error: 'Could not fetch from OceanPDF - site may be blocking requests',
    });
}

// Parse search results from HTML
function parseSearchResults(html: string, baseUrl: string): OceanPDFBook[] {
    const books: OceanPDFBook[] = [];

    // Try multiple patterns for different site layouts

    // Pattern 1: Standard WordPress article layout
    const articlePattern = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    let articleMatch;

    while ((articleMatch = articlePattern.exec(html)) !== null && books.length < 20) {
        const articleHtml = articleMatch[1];

        // Extract title and URL - multiple patterns
        const titleMatch =
            articleHtml.match(/<h2[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i) ||
            articleHtml.match(/<h3[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i) ||
            articleHtml.match(/<a[^>]*class="[^"]*title[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i);

        if (!titleMatch) continue;

        const url = titleMatch[1];
        const title = decodeHtmlEntities(titleMatch[2].trim());

        if (!title || title.length < 2) continue;

        // Generate ID from URL
        const slug = url.split('/').filter(Boolean).pop() || `book-${books.length}`;
        const id = `oceanpdf-${slug}`;

        // Extract cover image
        let cover: string | null = null;
        const imgMatch = articleHtml.match(/<img[^>]*src="([^"]*)"[^>]*/i);
        if (imgMatch && !imgMatch[1].includes('avatar') && !imgMatch[1].includes('icon')) {
            cover = imgMatch[1];
        }

        // Extract author
        let author = 'Unknown Author';
        const authorMatch =
            articleHtml.match(/by\s+<a[^>]*>([^<]*)<\/a>/i) ||
            articleHtml.match(/Author[:\s]+([^<,]+)/i) ||
            articleHtml.match(/by\s+([A-Z][a-zA-Z\s.]+)/);
        if (authorMatch) {
            author = decodeHtmlEntities(authorMatch[1].trim());
        }

        // Extract description
        let description: string | undefined;
        const excerptMatch =
            articleHtml.match(/<div[^>]*class="[^"]*excerpt[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
            articleHtml.match(/<p[^>]*>([\s\S]{20,}?)<\/p>/i);
        if (excerptMatch) {
            description = decodeHtmlEntities(
                excerptMatch[1].replace(/<[^>]*>/g, '').trim().slice(0, 200)
            );
        }

        books.push({
            id,
            title,
            author,
            cover,
            downloadUrl: null,
            previewUrl: url.startsWith('http') ? url : `${baseUrl}${url}`,
            description,
        });
    }

    // Pattern 2: Grid/card layout (fallback)
    if (books.length === 0) {
        const cardPattern = /<div[^>]*class="[^"]*(?:post|book|item|card)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
        let cardMatch;

        while ((cardMatch = cardPattern.exec(html)) !== null && books.length < 20) {
            const cardHtml = cardMatch[1];
            const linkMatch = cardHtml.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/i);
            if (linkMatch && linkMatch[2].length > 3) {
                const slug = linkMatch[1].split('/').filter(Boolean).pop() || `book-${books.length}`;
                books.push({
                    id: `oceanpdf-${slug}`,
                    title: decodeHtmlEntities(linkMatch[2].trim()),
                    author: 'Unknown Author',
                    cover: null,
                    downloadUrl: null,
                    previewUrl: linkMatch[1].startsWith('http') ? linkMatch[1] : `${baseUrl}${linkMatch[1]}`,
                });
            }
        }
    }

    return books;
}

function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#8217;/g, "'")
        .replace(/&#8211;/g, '-')
        .replace(/&#8230;/g, '...')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#\d+;/g, '');
}
