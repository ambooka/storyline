import { NextRequest, NextResponse } from 'next/server';

// Proxy for audio files to avoid CORS issues
export async function GET(request: NextRequest) {
    const soundId = request.nextUrl.searchParams.get('id');

    // Map of ambient sound IDs to direct URLs
    const soundUrls: Record<string, string> = {
        rain: 'https://www.soundjay.com/nature/rain-01.mp3',
        fireplace: 'https://www.soundjay.com/nature/fire-crackling-1.mp3',
        coffee_shop: 'https://www.soundjay.com/human/crowd-talk-1.mp3',
        forest: 'https://www.soundjay.com/nature/morning-birds-1.mp3',
        ocean: 'https://www.soundjay.com/nature/ocean-wave-1.mp3',
        library: 'https://www.soundjay.com/clock/clock-ticking-2.mp3',
        night: 'https://www.soundjay.com/nature/cricket-1.mp3',
    };

    if (!soundId || !soundUrls[soundId]) {
        return NextResponse.json(
            { error: 'Invalid sound ID', available: Object.keys(soundUrls) },
            { status: 400 }
        );
    }

    try {
        const response = await fetch(soundUrls[soundId], {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status}`);
        }

        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('Audio proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to load audio' },
            { status: 500 }
        );
    }
}
