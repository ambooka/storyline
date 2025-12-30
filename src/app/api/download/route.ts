import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Validate URL is from allowed domains
    const allowedDomains = [
        'www.gutenberg.org',
        'gutenberg.org',
        'archive.org',        // Main archive.org
        '.archive.org',       // All archive.org subdomains (CDN servers like dn721805.ca.archive.org)
        'standardebooks.org',
        'books.google.com',
        'openlibrary.org',
        'ia800',  // Internet Archive CDN servers (legacy pattern)
        'ia600',
        'ia900',
    ];

    try {
        const parsedUrl = new URL(url);
        const isAllowed = allowedDomains.some(domain =>
            parsedUrl.hostname.includes(domain) || parsedUrl.hostname.startsWith(domain)
        );

        if (!isAllowed) {
            console.error('Domain not allowed:', parsedUrl.hostname);
            return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
        }

        console.log('Downloading:', url);

        // Fetch the ePub file with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for large files

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/epub+zip, application/pdf, application/octet-stream, */*',
            },
            signal: controller.signal,
            redirect: 'follow',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error('Download failed:', response.status, url);
            return NextResponse.json(
                { error: `Failed to fetch: ${response.status}` },
                { status: response.status }
            );
        }

        // Get the file data
        const arrayBuffer = await response.arrayBuffer();

        // Validate the file - check for ZIP signature (EPUB is a ZIP file)
        const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
        const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B; // "PK" signature
        const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // "%PDF"

        // Check if it's HTML (error page)
        const first50 = new TextDecoder().decode(arrayBuffer.slice(0, 50));
        const isHtml = first50.toLowerCase().includes('<!doctype') || first50.toLowerCase().includes('<html');

        if (isHtml) {
            console.error('Downloaded HTML instead of EPUB/PDF - likely error page');
            return NextResponse.json(
                { error: 'File not available - received HTML error page' },
                { status: 404 }
            );
        }

        if (!isZip && !isPdf) {
            console.error('File is not a valid EPUB (ZIP) or PDF format');
            console.error('First bytes:', Array.from(bytes).map(b => b.toString(16)));
            return NextResponse.json(
                { error: 'Invalid file format - not EPUB or PDF' },
                { status: 400 }
            );
        }

        console.log(`Downloaded ${arrayBuffer.byteLength} bytes, format: ${isZip ? 'EPUB/ZIP' : 'PDF'}`);

        // Determine content type
        let contentType = response.headers.get('content-type') || 'application/octet-stream';
        if (isZip) contentType = 'application/epub+zip';
        if (isPdf) contentType = 'application/pdf';

        // Return with proper headers
        return new NextResponse(arrayBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="book.${isZip ? 'epub' : 'pdf'}"`,
                'Cache-Control': 'public, max-age=3600',
                'Content-Length': arrayBuffer.byteLength.toString(),
            },
        });
    } catch (error) {
        console.error('Download proxy error:', error);
        const message = error instanceof Error ? error.message : 'Failed to download file';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

