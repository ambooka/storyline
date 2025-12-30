import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy initialize Gemini client to prevent build errors when API key is not set
let geminiClient: GoogleGenerativeAI | null = null;

function getGemini(): GoogleGenerativeAI {
    if (!geminiClient) {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_API_KEY or GEMINI_API_KEY environment variable is not set");
        }
        geminiClient = new GoogleGenerativeAI(apiKey);
    }
    return geminiClient;
}

export interface ChapterSummary {
    summary: string;
    keyPoints: string[];
    characters: string[];
    mood: string;
    estimatedReadTime: number;
}

export interface BookRecommendation {
    title: string;
    author: string;
    reason: string;
    matchScore: number;
}

/**
 * Generate a summary for a chapter or text passage using Gemini
 */
export async function generateSummary(
    text: string,
    options: {
        detailLevel?: "brief" | "detailed";
        bookTitle?: string;
        chapterNumber?: number;
    } = {}
): Promise<ChapterSummary> {
    const { detailLevel = "brief", bookTitle, chapterNumber } = options;

    const prompt = `You are a literary assistant that provides insightful, spoiler-free chapter summaries.
Your summaries help readers remember where they left off without revealing future plot points.

Summarize the following text${bookTitle ? ` from "${bookTitle}"` : ""}${chapterNumber ? ` (Chapter ${chapterNumber})` : ""}:

${text.slice(0, 8000)}

Provide your response in this exact JSON format (no markdown, just JSON):
{
  "summary": "${detailLevel === "brief" ? "2-3 sentences" : "1 paragraph"} summary",
  "keyPoints": ["3-5 key events or revelations"],
  "characters": ["characters mentioned or introduced"],
  "mood": "overall emotional tone (e.g., 'tense', 'romantic', 'mysterious')",
  "estimatedReadTime": estimated minutes to read this chapter as a number
}`;

    try {
        const model = getGemini().getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 500,
                responseMimeType: "application/json",
            },
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        const content = response.text();

        if (!content) {
            throw new Error("No response from Gemini");
        }

        // Parse JSON response
        const parsed = JSON.parse(content);
        return parsed as ChapterSummary;
    } catch (error) {
        console.error("Failed to generate summary:", error);
        // Return a fallback
        return {
            summary: "Summary unavailable. Continue reading to discover what happens next.",
            keyPoints: [],
            characters: [],
            mood: "unknown",
            estimatedReadTime: 5,
        };
    }
}

/**
 * Get personalized book recommendations using Gemini
 */
export async function getRecommendations(userContext: {
    recentBooks: string[];
    favoriteGenres: string[];
    mood?: string;
    preferredLength?: "short" | "medium" | "long";
}): Promise<BookRecommendation[]> {
    const { recentBooks, favoriteGenres, mood, preferredLength } = userContext;

    const prompt = `You are a literary expert recommending books. Focus on quality and match with reader preferences.

Based on the following reading preferences, suggest 5 books:

Recently read: ${recentBooks.join(", ") || "None specified"}
Favorite genres: ${favoriteGenres.join(", ") || "Various"}
Current mood: ${mood || "Any"}
Preferred length: ${preferredLength || "Any"}

Consider classic literature, modern fiction, and hidden gems.
Focus on books with strong narratives and memorable characters.

Respond in this exact JSON format (no markdown, just JSON):
{
  "recommendations": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "reason": "Why this book matches the reader's preferences",
      "matchScore": 0.85
    }
  ]
}`;

    try {
        const model = getGemini().getGenerativeModel({
            model: "gemini-1.5-pro",
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 800,
                responseMimeType: "application/json",
            },
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        const content = response.text();

        if (!content) {
            throw new Error("No response from Gemini");
        }

        const parsed = JSON.parse(content);
        return parsed.recommendations as BookRecommendation[];
    } catch (error) {
        console.error("Failed to get recommendations:", error);
        return [];
    }
}

/**
 * Analyze emotional tone of a passage using Gemini
 */
export async function analyzeEmotion(text: string): Promise<{
    emotion: string;
    intensity: number;
    suggestedReaction: string;
}> {
    try {
        const model = getGemini().getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 100,
                responseMimeType: "application/json",
            },
        });

        const prompt = `Analyze the emotional tone of this passage. Be concise.

"${text.slice(0, 1000)}"

Respond in this exact JSON format (no markdown, just JSON):
{"emotion": "primary emotion", "intensity": 0.0-1.0, "suggestedReaction": "🔥 or ❤️ or 🤯 or 💡 or 😢"}`;

        const result = await model.generateContent(prompt);
        const content = result.response.text();

        if (!content) throw new Error("No response");
        return JSON.parse(content);
    } catch {
        return { emotion: "neutral", intensity: 0.5, suggestedReaction: "💡" };
    }
}

/**
 * Generate a quote card description for sharing using Gemini
 */
export async function generateQuoteContext(
    quote: string,
    bookTitle: string,
    author: string
): Promise<string> {
    try {
        const model = getGemini().getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 100,
            },
        });

        const prompt = `Generate a 1-2 sentence caption for this quote from "${bookTitle}" by ${author}:

"${quote}"

Make it shareable and thought-provoking. Return just the caption text, no quotes.`;

        const result = await model.generateContent(prompt);
        return result.response.text() || `From "${bookTitle}" by ${author}`;
    } catch {
        return `From "${bookTitle}" by ${author}`;
    }
}
