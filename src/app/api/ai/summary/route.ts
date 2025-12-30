import { NextRequest, NextResponse } from "next/server";

// Gemini AI Summary Generator for Latecomers
export async function POST(request: NextRequest) {
    try {
        const { bookTitle, passages, progress } = await request.json();

        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            // Return fallback summary without AI
            return NextResponse.json({
                summary: `Your group has read ${progress}% of "${bookTitle}". Jump in and start reading with them!`,
            });
        }

        const passageText = passages.join("\n\n---\n\n").slice(0, 3000);

        const prompt = `You are a helpful reading assistant. The user just joined a group reading session and needs a quick catch-up.

Book: "${bookTitle}"
Group Progress: ${progress}%

Here are the last few passages the group read:
${passageText}

Generate a brief, engaging summary (2-3 sentences) that helps the user understand:
1. What's happening in the story right now
2. Any key characters or events they should know about
3. The current mood/tone

Keep it spoiler-light and encourage them to keep reading. Be warm and friendly.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 200,
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error("Gemini API request failed");
        }

        const data = await response.json();
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text ||
            `Your group has read ${progress}% of "${bookTitle}". Jump in now!`;

        return NextResponse.json({ summary });
    } catch (error) {
        console.error("Summary generation failed:", error);
        return NextResponse.json({
            summary: "Join your group and continue reading together!",
        });
    }
}
