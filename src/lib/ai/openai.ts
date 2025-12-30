import OpenAI from 'openai';

// Lazy initialize OpenAI client to prevent build errors when API key is not set
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
    if (!openaiClient) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is not set');
        }
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiClient;
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
 * Generate a summary for a chapter or text passage
 */
export async function generateSummary(
    text: string,
    options: {
        detailLevel?: 'brief' | 'detailed';
        bookTitle?: string;
        chapterNumber?: number;
    } = {}
): Promise<ChapterSummary> {
    const { detailLevel = 'brief', bookTitle, chapterNumber } = options;

    const systemPrompt = `You are a literary assistant that provides insightful, spoiler-free chapter summaries. 
Your summaries help readers remember where they left off without revealing future plot points.
Be concise but capture the essence of the narrative.`;

    const userPrompt = `Summarize the following text${bookTitle ? ` from "${bookTitle}"` : ''}${chapterNumber ? ` (Chapter ${chapterNumber})` : ''}:

${text.slice(0, 8000)}

Provide your response in this JSON format:
{
  "summary": "${detailLevel === 'brief' ? '2-3 sentences' : '1 paragraph'} summary",
  "keyPoints": ["3-5 key events or revelations"],
  "characters": ["characters mentioned or introduced"],
  "mood": "overall emotional tone (e.g., 'tense', 'romantic', 'mysterious')",
  "estimatedReadTime": estimated minutes to read this chapter
}`;

    try {
        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 500,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        return JSON.parse(content) as ChapterSummary;
    } catch (error) {
        console.error('Failed to generate summary:', error);
        // Return a fallback
        return {
            summary: 'Summary unavailable. Continue reading to discover what happens next.',
            keyPoints: [],
            characters: [],
            mood: 'unknown',
            estimatedReadTime: 5,
        };
    }
}

/**
 * Get personalized book recommendations
 */
export async function getRecommendations(
    userContext: {
        recentBooks: string[];
        favoriteGenres: string[];
        mood?: string;
        preferredLength?: 'short' | 'medium' | 'long';
    }
): Promise<BookRecommendation[]> {
    const { recentBooks, favoriteGenres, mood, preferredLength } = userContext;

    const userPrompt = `Based on the following reading preferences, suggest 5 books:

Recently read: ${recentBooks.join(', ') || 'None specified'}
Favorite genres: ${favoriteGenres.join(', ') || 'Various'}
Current mood: ${mood || 'Any'}
Preferred length: ${preferredLength || 'Any'}

Consider classic literature, modern fiction, and hidden gems.
Focus on books with strong narratives and memorable characters.

Respond in this JSON format:
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
        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a literary expert recommending books. Focus on quality and match with reader preferences.'
                },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.8,
            max_tokens: 800,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        const parsed = JSON.parse(content);
        return parsed.recommendations as BookRecommendation[];
    } catch (error) {
        console.error('Failed to get recommendations:', error);
        return [];
    }
}

/**
 * Analyze emotional tone of a passage
 */
export async function analyzeEmotion(text: string): Promise<{
    emotion: string;
    intensity: number;
    suggestedReaction: string;
}> {
    try {
        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Analyze the emotional tone of text passages. Be concise.'
                },
                {
                    role: 'user',
                    content: `Analyze this passage and respond in JSON:

"${text.slice(0, 1000)}"

Format: {"emotion": "primary emotion", "intensity": 0.0-1.0, "suggestedReaction": "🔥 or ❤️ or 🤯 or 💡 or 😢"}`
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.5,
            max_tokens: 100,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('No response');

        return JSON.parse(content);
    } catch {
        return { emotion: 'neutral', intensity: 0.5, suggestedReaction: '💡' };
    }
}

/**
 * Generate a quote card description for sharing
 */
export async function generateQuoteContext(
    quote: string,
    bookTitle: string,
    author: string
): Promise<string> {
    try {
        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Generate a brief, engaging caption for book quote cards.'
                },
                {
                    role: 'user',
                    content: `Create a 1-2 sentence caption for this quote from "${bookTitle}" by ${author}:

"${quote}"

Make it shareable and thought-provoking.`
                },
            ],
            temperature: 0.8,
            max_tokens: 100,
        });

        return response.choices[0]?.message?.content || '';
    } catch {
        return `From "${bookTitle}" by ${author}`;
    }
}
