"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Ambient sound types
export type AmbientSound =
    | "rain"
    | "fireplace"
    | "coffee_shop"
    | "forest"
    | "ocean"
    | "library"
    | "night";

interface SoundConfig {
    id: AmbientSound;
    name: string;
    emoji: string;
    url: string; // Direct URL to audio file
}

// Ambient sounds served through local API proxy to avoid CORS
// The API fetches from free sources and caches them
const AMBIENT_SOUNDS: SoundConfig[] = [
    {
        id: "rain",
        name: "Gentle Rain",
        emoji: "🌧️",
        url: "/api/audio?id=rain"
    },
    {
        id: "fireplace",
        name: "Cozy Fire",
        emoji: "🔥",
        url: "/api/audio?id=fireplace"
    },
    {
        id: "coffee_shop",
        name: "Café Ambience",
        emoji: "☕",
        url: "/api/audio?id=coffee_shop"
    },
    {
        id: "forest",
        name: "Forest Birds",
        emoji: "🌲",
        url: "/api/audio?id=forest"
    },
    {
        id: "ocean",
        name: "Ocean Waves",
        emoji: "🌊",
        url: "/api/audio?id=ocean"
    },
    {
        id: "library",
        name: "Quiet Library",
        emoji: "📚",
        url: "/api/audio?id=library"
    },
    {
        id: "night",
        name: "Night Crickets",
        emoji: "🌙",
        url: "/api/audio?id=night"
    },
];

interface AmbientState {
    currentSound: AmbientSound | null;
    volume: number;
    isPlaying: boolean;
    isLoading: boolean;
}

// Hook for ambient sounds - uses real audio files
export function useAmbientSound() {
    const [state, setState] = useState<AmbientState>({
        currentSound: null,
        volume: 0.3,
        isPlaying: false,
        isLoading: false,
    });

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Load sound
    const play = useCallback(async (soundId: AmbientSound) => {
        const soundConfig = AMBIENT_SOUNDS.find(s => s.id === soundId);
        if (!soundConfig) return;

        setState(prev => ({ ...prev, isLoading: true }));

        // Stop current sound
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        try {
            const audio = new Audio(soundConfig.url);
            audio.loop = true;
            audio.volume = state.volume;
            audio.crossOrigin = "anonymous";

            // Wait for audio to be ready
            await new Promise((resolve, reject) => {
                audio.oncanplaythrough = resolve;
                audio.onerror = reject;
                audio.load();
            });

            await audio.play();
            audioRef.current = audio;

            setState({
                currentSound: soundId,
                volume: state.volume,
                isPlaying: true,
                isLoading: false,
            });
        } catch (error) {
            console.error("Failed to load ambient sound:", error);
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [state.volume]);

    // Stop sound
    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setState(prev => ({
            ...prev,
            currentSound: null,
            isPlaying: false,
        }));
    }, []);

    // Toggle sound
    const toggle = useCallback((soundId: AmbientSound) => {
        if (state.currentSound === soundId && state.isPlaying) {
            stop();
        } else {
            play(soundId);
        }
    }, [state.currentSound, state.isPlaying, play, stop]);

    // Set volume
    const setVolume = useCallback((volume: number) => {
        setState(prev => ({ ...prev, volume }));
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    return {
        ...state,
        sounds: AMBIENT_SOUNDS,
        play,
        stop,
        toggle,
        setVolume,
    };
}

// ===== TEXT TO SPEECH =====

interface TTSState {
    isSpeaking: boolean;
    isPaused: boolean;
    currentWord: number;
    totalWords: number;
    error: string | null;
}

export function useTextToSpeech() {
    const [state, setState] = useState<TTSState>({
        isSpeaking: false,
        isPaused: false,
        currentWord: 0,
        totalWords: 0,
        error: null,
    });

    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const speak = useCallback((text: string) => {
        if (!window.speechSynthesis) {
            setState(prev => ({ ...prev, error: "Speech synthesis not supported" }));
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const words = text.split(/\s+/).filter(w => w.length > 0);
        const utterance = new SpeechSynthesisUtterance(text);

        // Use a nice voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v =>
            v.name.includes("Daniel") ||
            v.name.includes("Karen") ||
            v.name.includes("Google") ||
            v.lang.startsWith("en")
        );
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.rate = 0.9; // Slightly slower for reading
        utterance.pitch = 1;

        utterance.onstart = () => {
            setState({
                isSpeaking: true,
                isPaused: false,
                currentWord: 0,
                totalWords: words.length,
                error: null,
            });
        };

        utterance.onend = () => {
            setState({
                isSpeaking: false,
                isPaused: false,
                currentWord: 0,
                totalWords: 0,
                error: null,
            });
        };

        utterance.onerror = (e) => {
            setState(prev => ({
                ...prev,
                isSpeaking: false,
                error: e.error,
            }));
        };

        utterance.onboundary = (e) => {
            if (e.name === "word") {
                const wordIndex = text.slice(0, e.charIndex).split(/\s+/).length;
                setState(prev => ({ ...prev, currentWord: wordIndex }));
            }
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, []);

    const pause = useCallback(() => {
        window.speechSynthesis?.pause();
        setState(prev => ({ ...prev, isPaused: true }));
    }, []);

    const resume = useCallback(() => {
        window.speechSynthesis?.resume();
        setState(prev => ({ ...prev, isPaused: false }));
    }, []);

    const stop = useCallback(() => {
        window.speechSynthesis?.cancel();
        setState({
            isSpeaking: false,
            isPaused: false,
            currentWord: 0,
            totalWords: 0,
            error: null,
        });
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            window.speechSynthesis?.cancel();
        };
    }, []);

    return {
        ...state,
        speak,
        pause,
        resume,
        stop,
        progress: state.totalWords > 0 ? (state.currentWord / state.totalWords) * 100 : 0,
    };
}
