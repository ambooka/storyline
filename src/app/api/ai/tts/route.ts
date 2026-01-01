import { NextRequest, NextResponse } from "next/server";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";

// WaveNet/Neural2 voices - realistic and dramatic
export type GoogleVoice =
    | "en-US-Wavenet-D"  // Deep American male (dramatic)
    | "en-GB-Neural2-B"  // British male (storyteller)
    | "en-US-Neural2-F"  // Warm American female
    | "en-GB-Wavenet-A"  // British female (clear)
    | "en-US-Wavenet-J"  // American male (warm)
    | "en-AU-Neural2-B"; // Australian male

// Lazy-load TTS client
let ttsClient: TextToSpeechClient | null = null;

function getTTSClient(): TextToSpeechClient {
    if (!ttsClient) {
        // Check for credentials
        const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

        if (!credentials && !projectId) {
            // Try to initialize with default credentials (works in Google Cloud)
            ttsClient = new TextToSpeechClient();
        } else {
            ttsClient = new TextToSpeechClient({
                projectId: projectId,
            });
        }
    }
    return ttsClient;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            text,
            voice = "en-US-Wavenet-D",
            speed = 1.0,
            pitch = 0.0,
        } = body as {
            text: string;
            voice?: GoogleVoice;
            speed?: number;
            pitch?: number;
        };

        if (!text || text.trim().length === 0) {
            return NextResponse.json(
                { error: "Text is required" },
                { status: 400 }
            );
        }

        // Get TTS client
        const client = getTTSClient();

        // Properly limit text by bytes (Google TTS limit is 5000 bytes)
        // Use 4000 bytes max to be safe with encoding overhead
        const maxBytes = 4000;
        let trimmedText = text;

        // Calculate byte length and trim if needed
        const encoder = new TextEncoder();
        let byteLength = encoder.encode(trimmedText).length;

        while (byteLength > maxBytes && trimmedText.length > 0) {
            // Trim by ~10% each iteration
            const trimAmount = Math.max(1, Math.floor(trimmedText.length * 0.1));
            trimmedText = trimmedText.slice(0, -trimAmount);
            byteLength = encoder.encode(trimmedText).length;
        }

        // Clean up - try to end at a sentence boundary if possible
        const lastSentence = Math.max(
            trimmedText.lastIndexOf('.'),
            trimmedText.lastIndexOf('!'),
            trimmedText.lastIndexOf('?')
        );
        if (lastSentence > trimmedText.length * 0.5) {
            trimmedText = trimmedText.slice(0, lastSentence + 1);
        }

        // Synthesize speech with high quality settings
        const [response] = await client.synthesizeSpeech({
            input: { text: trimmedText },
            voice: {
                languageCode: voice.substring(0, 5), // e.g., "en-US"
                name: voice,
            },
            audioConfig: {
                audioEncoding: "MP3", // MP3 for universal browser support
                speakingRate: Math.max(0.25, Math.min(4.0, speed)),
                pitch: Math.max(-20.0, Math.min(20.0, pitch)),
                effectsProfileId: ["large-home-entertainment-class-device"], // Premium audio quality
            },
        });

        if (!response.audioContent) {
            throw new Error("No audio content received");
        }

        // Convert to buffer
        const audioBuffer = Buffer.from(response.audioContent as Uint8Array);

        // Return the audio
        return new NextResponse(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.byteLength.toString(),
            },
        });
    } catch (error) {
        console.error("Google TTS API error:", error);

        // Check for specific errors
        if (error instanceof Error) {
            if (error.message.includes("credentials") || error.message.includes("auth")) {
                return NextResponse.json(
                    { error: "Google Cloud credentials not configured" },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            { error: "Failed to generate speech" },
            { status: 500 }
        );
    }
}

// GET endpoint to list available voices
export async function GET() {
    const voices = [
        { id: "en-US-Wavenet-D", name: "Dramatic", description: "Deep American male", mood: "Authoritative" },
        { id: "en-GB-Neural2-B", name: "Storyteller", description: "British male", mood: "Engaging" },
        { id: "en-US-Neural2-F", name: "Warm", description: "American female", mood: "Expressive" },
        { id: "en-GB-Wavenet-A", name: "Clear", description: "British female", mood: "Bright" },
        { id: "en-US-Wavenet-J", name: "Calm", description: "American male", mood: "Thoughtful" },
        { id: "en-AU-Neural2-B", name: "Down Under", description: "Australian male", mood: "Friendly" },
    ];

    return NextResponse.json({ voices });
}
