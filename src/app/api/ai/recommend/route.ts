import { NextRequest, NextResponse } from 'next/server';
import { getRecommendations } from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { recentBooks, favoriteGenres, mood, preferredLength } = body;

        const recommendations = await getRecommendations({
            recentBooks: recentBooks || [],
            favoriteGenres: favoriteGenres || [],
            mood,
            preferredLength,
        });

        return NextResponse.json({ recommendations });
    } catch (error) {
        console.error('Recommendations API error:', error);
        return NextResponse.json(
            { error: 'Failed to get recommendations' },
            { status: 500 }
        );
    }
}
