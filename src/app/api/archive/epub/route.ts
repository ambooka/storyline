import { NextRequest, NextResponse } from 'next/server';

// API endpoint to get the actual EPUB download URL from Internet Archive
// Archive.org file names are unpredictable, so we need to fetch metadata first
//
// Usage: GET /api/archive/epub?id=thomas-erikson-surrounded-by-idiots

const ARCHIVE_BASE = 'https://archive.org';

interface ArchiveFile {
    name: string;
    format: string;
    size?: string;
}

interface ArchiveMetadata {
    files: ArchiveFile[];
    metadata: {
        identifier: string;
        title?: string;
        creator?: string | string[];
    };
}

export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    try {
        // Fetch metadata from Archive.org
        const metadataUrl = `${ARCHIVE_BASE}/metadata/${id}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(metadataUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return NextResponse.json({ error: 'Item not found on Archive.org' }, { status: 404 });
        }

        const data: ArchiveMetadata = await response.json();
        const files = data.files || [];

        // Find EPUB file
        const epubFile = files.find(f =>
            f.name.toLowerCase().endsWith('.epub') &&
            f.format === 'EPUB'
        );

        // Find PDF file as fallback
        const pdfFile = files.find(f =>
            f.name.toLowerCase().endsWith('.pdf') &&
            (f.format === 'Text PDF' || f.format === 'PDF')
        );

        if (!epubFile && !pdfFile) {
            return NextResponse.json({
                error: 'No EPUB or PDF file available for this item',
                previewUrl: `${ARCHIVE_BASE}/details/${id}`,
            }, { status: 404 });
        }

        // Construct download URLs
        const epubUrl = epubFile
            ? `${ARCHIVE_BASE}/download/${id}/${encodeURIComponent(epubFile.name)}`
            : null;
        const pdfUrl = pdfFile
            ? `${ARCHIVE_BASE}/download/${id}/${encodeURIComponent(pdfFile.name)}`
            : null;

        return NextResponse.json({
            id,
            title: data.metadata?.title,
            epubUrl,
            pdfUrl,
            epubFile: epubFile?.name,
            pdfFile: pdfFile?.name,
            previewUrl: `${ARCHIVE_BASE}/details/${id}`,
        });
    } catch (error) {
        console.error('Archive metadata fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch Archive.org metadata',
            previewUrl: `${ARCHIVE_BASE}/details/${id}`,
        }, { status: 500 });
    }
}
