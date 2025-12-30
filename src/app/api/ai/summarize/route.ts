import { NextRequest, NextResponse } from 'next/server';
import { generateSummary } from '@/lib/ai/gemini';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, bookTitle, chapterNumber, detailLevel } = body;

        if (!text) {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400 }
            );
        }

        const summary = await generateSummary(text, {
            bookTitle,
            chapterNumber,
            detailLevel: detailLevel || 'brief',
        });

        return NextResponse.json(summary);
    } catch (error) {
        console.error('Summary API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate summary' },
            { status: 500 }
        );
    }
}
