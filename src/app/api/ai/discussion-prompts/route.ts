import { NextRequest, NextResponse } from "next/server";

// Gemini AI Discussion Prompts Generator
export async function POST(request: NextRequest) {
    try {
        const { bookTitle, passage } = await request.json();

        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Gemini API key not configured" },
                { status: 503 }
            );
        }

        const prompt = `You are a book club facilitator. Generate 3 thoughtful discussion questions for a group reading session.

Book: "${bookTitle}"

Current passage being read:
"${passage.slice(0, 500)}"

Generate exactly 3 discussion questions that:
1. Encourage deep thinking about the text
2. Relate to themes, character motivations, or literary techniques
3. Can spark interesting group conversations

Format: Return ONLY a JSON array of 3 strings, no other text.
Example: ["Question 1?", "Question 2?", "Question 3?"]`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 500,
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error("Gemini API request failed");
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Parse JSON from response
        try {
            const jsonMatch = textContent.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                const prompts = JSON.parse(jsonMatch[0]);
                return NextResponse.json({ prompts });
            }
        } catch {
            // If parsing fails, return the raw text split by newlines
            const lines = textContent
                .split("\n")
                .filter((line: string) => line.trim().length > 10)
                .slice(0, 3);
            return NextResponse.json({ prompts: lines });
        }

        return NextResponse.json({ prompts: [] });
    } catch (error) {
        console.error("Discussion prompts generation failed:", error);
        return NextResponse.json(
            { error: "Failed to generate discussion prompts" },
            { status: 500 }
        );
    }
}
