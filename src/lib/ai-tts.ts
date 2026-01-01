"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Google Cloud TTS WaveNet voices
export type GoogleVoice =
    | "en-US-Wavenet-D"  // Deep American male (dramatic)
    | "en-GB-Neural2-B"  // British male (storyteller)
    | "en-US-Neural2-F"  // Warm American female
    | "en-GB-Wavenet-A"  // British female (clear)
    | "en-US-Wavenet-J"  // American male (warm)
    | "en-AU-Neural2-B"; // Australian male

export interface GoogleVoiceOption {
    id: GoogleVoice;
    name: string;
    description: string;
    mood: string;
}

export const GOOGLE_VOICES: GoogleVoiceOption[] = [
    { id: "en-US-Wavenet-D", name: "Dramatic", description: "Deep American male", mood: "Authoritative" },
    { id: "en-GB-Neural2-B", name: "Storyteller", description: "British male", mood: "Engaging" },
    { id: "en-US-Neural2-F", name: "Warm", description: "American female", mood: "Expressive" },
    { id: "en-GB-Wavenet-A", name: "Clear", description: "British female", mood: "Bright" },
    { id: "en-US-Wavenet-J", name: "Calm", description: "American male", mood: "Thoughtful" },
    { id: "en-AU-Neural2-B", name: "Aussie", description: "Australian male", mood: "Friendly" },
];

// Keep the old export names for compatibility
export type AIVoice = GoogleVoice;
export const AI_VOICES = GOOGLE_VOICES;

interface AITTSState {
    isLoading: boolean;
    isPlaying: boolean;
    isPaused: boolean;
    error: string | null;
    currentVoice: GoogleVoice;
    speed: number;
    currentWordIndex: number;
    totalWords: number;
}

interface AITTSOptions {
    onWordChange?: (wordIndex: number, word: string) => void;
    onEnd?: () => void;
}

// Silent audio data URL to unlock audio on user gesture
const SILENT_AUDIO = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYykAMBAAAAAAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYykAMBAAAAAAAAAAAAAAAAAAAA";

export function useAITextToSpeech(options?: AITTSOptions) {
    const [state, setState] = useState<AITTSState>({
        isLoading: false,
        isPlaying: false,
        isPaused: false,
        error: null,
        currentVoice: "en-US-Wavenet-D",
        speed: 1.0,
        currentWordIndex: -1,
        totalWords: 0,
    });

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioUrlRef = useRef<string | null>(null);
    const optionsRef = useRef(options);
    const wordsRef = useRef<string[]>([]);
    const wordTimerRef = useRef<NodeJS.Timeout | null>(null);
    const wordIndexRef = useRef(0);
    const audioUnlockedRef = useRef(false);

    // Keep options ref updated
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (audioUrlRef.current) {
                URL.revokeObjectURL(audioUrlRef.current);
            }
            if (wordTimerRef.current) {
                clearInterval(wordTimerRef.current);
            }
        };
    }, []);

    // Unlock audio on user gesture (call this early in click handler)
    const unlockAudio = useCallback(() => {
        if (audioUnlockedRef.current) return;

        try {
            // Create and play silent audio to unlock
            const audio = new Audio(SILENT_AUDIO);
            audio.volume = 0;
            audio.play().then(() => {
                audioUnlockedRef.current = true;
                audio.pause();
            }).catch(() => {
                // Ignore - will try again on next gesture
            });
        } catch {
            // Ignore
        }
    }, []);

    // Start word timing simulation for audio playback
    const startWordTimer = useCallback((words: string[], speed: number) => {
        if (wordTimerRef.current) {
            clearInterval(wordTimerRef.current);
        }

        wordsRef.current = words;
        wordIndexRef.current = 0;

        // Average word duration based on speed (roughly 150 words/minute at 1x)
        const baseIntervalMs = 400 / speed;

        wordTimerRef.current = setInterval(() => {
            const currentIndex = wordIndexRef.current;

            if (currentIndex >= words.length) {
                if (wordTimerRef.current) {
                    clearInterval(wordTimerRef.current);
                    wordTimerRef.current = null;
                }
                return;
            }

            setState(prev => ({ ...prev, currentWordIndex: currentIndex }));

            if (optionsRef.current?.onWordChange && currentIndex < words.length) {
                optionsRef.current.onWordChange(currentIndex, words[currentIndex]);
            }

            wordIndexRef.current = currentIndex + 1;
        }, baseIntervalMs);
    }, []);

    const stopWordTimer = useCallback(() => {
        if (wordTimerRef.current) {
            clearInterval(wordTimerRef.current);
            wordTimerRef.current = null;
        }
        wordIndexRef.current = 0;
    }, []);

    // Main speak function - Google TTS only
    const speak = useCallback(async (text: string) => {
        if (!text || text.trim().length === 0) {
            setState(prev => ({ ...prev, error: "No text to speak" }));
            return;
        }

        // Unlock audio first (must be synchronous from user gesture)
        unlockAudio();

        // Stop any current playback
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
        stopWordTimer();

        // Parse words for highlighting
        const words = text.split(/\s+/).filter(w => w.length > 0);

        setState(prev => ({
            ...prev,
            isLoading: true,
            error: null,
            totalWords: words.length,
            currentWordIndex: -1,
        }));

        // Create audio element NOW (before async) to maintain user gesture context
        const audio = new Audio();
        audioRef.current = audio;

        try {
            // Call Google Cloud TTS API
            const response = await fetch("/api/ai/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: text.slice(0, 4000),
                    voice: state.currentVoice,
                    speed: state.speed,
                    pitch: -2.0,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `TTS API failed: ${response.status}`);
            }

            // Google TTS succeeded
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            audioUrlRef.current = audioUrl;

            // Set the src on the already-created audio element
            audio.src = audioUrl;

            audio.onplay = () => {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    isPlaying: true,
                    isPaused: false,
                    error: null,
                }));
                // Start word timing simulation
                startWordTimer(words, state.speed);
            };

            audio.onpause = () => {
                setState(prev => ({ ...prev, isPaused: true }));
            };

            audio.onended = () => {
                setState(prev => ({
                    ...prev,
                    isPlaying: false,
                    isPaused: false,
                    currentWordIndex: -1,
                }));
                stopWordTimer();
                if (optionsRef.current?.onEnd) {
                    optionsRef.current.onEnd();
                }
            };

            audio.onerror = (e) => {
                console.error("Audio playback error:", e);
                stopWordTimer();
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    isPlaying: false,
                    error: "Audio playback failed",
                }));
            };

            // Load and play
            audio.load();
            await audio.play();

        } catch (error) {
            console.error("Google TTS error:", error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                isPlaying: false,
                error: error instanceof Error ? error.message : "TTS failed",
            }));
        }
    }, [state.currentVoice, state.speed, startWordTimer, stopWordTimer, unlockAudio]);

    const pause = useCallback(() => {
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
        }
        stopWordTimer();
        setState(prev => ({ ...prev, isPaused: true }));
    }, [stopWordTimer]);

    const resume = useCallback(() => {
        if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(console.error);
            // Restart word timer
            if (wordsRef.current.length > 0) {
                startWordTimer(wordsRef.current, state.speed);
            }
        }
        setState(prev => ({ ...prev, isPaused: false }));
    }, [startWordTimer, state.speed]);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        stopWordTimer();
        setState(prev => ({
            ...prev,
            isPlaying: false,
            isPaused: false,
            error: null,
            currentWordIndex: -1,
        }));
    }, [stopWordTimer]);

    const setVoice = useCallback((voice: GoogleVoice) => {
        setState(prev => ({ ...prev, currentVoice: voice }));
    }, []);

    const setSpeed = useCallback((speed: number) => {
        setState(prev => ({ ...prev, speed: Math.max(0.25, Math.min(4.0, speed)) }));
    }, []);

    return {
        ...state,
        voices: GOOGLE_VOICES,
        speak,
        pause,
        resume,
        stop,
        setVoice,
        setSpeed,
        unlockAudio, // Export for early unlock on page interaction
    };
}
