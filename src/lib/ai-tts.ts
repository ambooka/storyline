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
    usingFallback: boolean;
}

export function useAITextToSpeech() {
    const [state, setState] = useState<AITTSState>({
        isLoading: false,
        isPlaying: false,
        isPaused: false,
        error: null,
        currentVoice: "en-US-Wavenet-D", // Deep dramatic voice default
        speed: 1.0,
        usingFallback: false,
    });

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioUrlRef = useRef<string | null>(null);
    const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

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
            if (typeof speechSynthesis !== "undefined") {
                speechSynthesis.cancel();
            }
        };
    }, []);

    // Fallback to Web Speech API with dramatic settings
    const speakWithFallback = useCallback((text: string) => {
        if (typeof speechSynthesis === "undefined") {
            setState(prev => ({ ...prev, error: "Speech synthesis not supported" }));
            return;
        }

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Get available voices and pick the best one
        const voices = speechSynthesis.getVoices();

        // Prefer high-quality voices
        const preferredVoices = [
            "Google UK English Male",
            "Microsoft David",
            "Daniel",
            "Alex",
            "Google US English",
            "Samantha",
        ];

        let selectedVoice = voices.find(v =>
            preferredVoices.some(pv => v.name.includes(pv))
        );

        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.startsWith("en") && v.localService);
        }
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.startsWith("en"));
        }
        if (!selectedVoice && voices.length > 0) {
            selectedVoice = voices[0];
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.rate = state.speed * 0.9;
        utterance.pitch = 0.95;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            setState(prev => ({
                ...prev,
                isLoading: false,
                isPlaying: true,
                isPaused: false,
                usingFallback: true,
            }));
        };

        utterance.onpause = () => {
            setState(prev => ({ ...prev, isPaused: true }));
        };

        utterance.onresume = () => {
            setState(prev => ({ ...prev, isPaused: false }));
        };

        utterance.onend = () => {
            setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
        };

        utterance.onerror = (e) => {
            // 'interrupted' is expected when cancelling speech - not an error
            if (e.error === 'interrupted' || e.error === 'canceled') {
                console.log("Speech interrupted (normal when switching)");
                setState(prev => ({
                    ...prev,
                    isPlaying: false,
                    isPaused: false,
                }));
                return;
            }
            console.error("Speech synthesis error:", e);
            setState(prev => ({
                ...prev,
                isLoading: false,
                isPlaying: false,
                error: e.error || "Speech failed"
            }));
        };

        speechSynthRef.current = utterance;
        speechSynthesis.speak(utterance);
        setState(prev => ({ ...prev, isPlaying: true, isLoading: false }));
    }, [state.speed]);

    // Main speak function - tries Google Cloud TTS first, falls back to Web Speech
    const speak = useCallback(async (text: string) => {
        if (!text || text.trim().length === 0) {
            setState(prev => ({ ...prev, error: "No text to speak" }));
            return;
        }

        // Stop any current playback
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
        if (typeof speechSynthesis !== "undefined") {
            speechSynthesis.cancel();
        }

        setState(prev => ({ ...prev, isLoading: true, error: null, usingFallback: false }));

        try {
            // Try Google Cloud TTS
            const response = await fetch("/api/ai/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: text.slice(0, 5000),
                    voice: state.currentVoice,
                    speed: state.speed,
                    pitch: -2.0, // Slightly lower pitch for drama
                }),
            });

            if (!response.ok) {
                // Any failure from Google TTS - use fallback
                console.log("Google TTS failed with status", response.status, "- using Web Speech API fallback");
                speakWithFallback(text);
                return;
            }

            // Google TTS succeeded
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            audioUrlRef.current = audioUrl;

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onplay = () => {
                setState(prev => ({ ...prev, isLoading: false, isPlaying: true, isPaused: false, usingFallback: false }));
            };

            audio.onpause = () => {
                setState(prev => ({ ...prev, isPaused: true }));
            };

            audio.onended = () => {
                setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
            };

            audio.onerror = () => {
                console.log("Audio playback failed, using Web Speech API fallback");
                speakWithFallback(text);
            };

            await audio.play();

        } catch (error) {
            console.log("Google TTS error, using fallback:", error);
            speakWithFallback(text);
        }
    }, [state.currentVoice, state.speed, speakWithFallback]);

    const pause = useCallback(() => {
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
        }
        if (typeof speechSynthesis !== "undefined" && speechSynthesis.speaking) {
            speechSynthesis.pause();
        }
    }, []);

    const resume = useCallback(() => {
        if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play();
            setState(prev => ({ ...prev, isPaused: false }));
        }
        if (typeof speechSynthesis !== "undefined" && speechSynthesis.paused) {
            speechSynthesis.resume();
        }
    }, []);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
        if (typeof speechSynthesis !== "undefined") {
            speechSynthesis.cancel();
        }
        setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
    }, []);

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
    };
}
