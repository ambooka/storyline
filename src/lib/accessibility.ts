"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ========== Accessibility Store ==========
interface AccessibilityState {
    // Text-to-Speech
    ttsEnabled: boolean;
    ttsRate: number; // 0.5 - 2.0
    ttsPitch: number; // 0.5 - 2.0
    ttsVoice: string | null;
    ttsHighlightWords: boolean;

    // Visual Aids
    screenRulerEnabled: boolean;
    screenRulerHeight: number; // pixels
    lineFocusEnabled: boolean;
    lineFocusDimAmount: number; // 0-1

    // Color Filters
    colorFilter: ColorFilter;
    highContrast: boolean;

    // Font
    useDyslexicFont: boolean;

    // Keyboard
    keyboardNavigation: boolean;

    // Actions
    setTtsEnabled: (enabled: boolean) => void;
    setTtsRate: (rate: number) => void;
    setTtsPitch: (pitch: number) => void;
    setTtsVoice: (voice: string | null) => void;
    setTtsHighlightWords: (enabled: boolean) => void;
    setScreenRulerEnabled: (enabled: boolean) => void;
    setScreenRulerHeight: (height: number) => void;
    setLineFocusEnabled: (enabled: boolean) => void;
    setLineFocusDimAmount: (amount: number) => void;
    setColorFilter: (filter: ColorFilter) => void;
    setHighContrast: (enabled: boolean) => void;
    setUseDyslexicFont: (enabled: boolean) => void;
    setKeyboardNavigation: (enabled: boolean) => void;
}

export type ColorFilter =
    | "none"
    | "sepia"
    | "greyscale"
    | "inverted"
    | "blue-light"    // Reduces blue light
    | "high-contrast";

export const useAccessibilityStore = create<AccessibilityState>()(
    persist(
        (set) => ({
            // Defaults
            ttsEnabled: false,
            ttsRate: 1.0,
            ttsPitch: 1.0,
            ttsVoice: null,
            ttsHighlightWords: true,
            screenRulerEnabled: false,
            screenRulerHeight: 80,
            lineFocusEnabled: false,
            lineFocusDimAmount: 0.7,
            colorFilter: "none",
            highContrast: false,
            useDyslexicFont: false,
            keyboardNavigation: true,

            // Actions
            setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
            setTtsRate: (rate) => set({ ttsRate: Math.max(0.5, Math.min(2.0, rate)) }),
            setTtsPitch: (pitch) => set({ ttsPitch: Math.max(0.5, Math.min(2.0, pitch)) }),
            setTtsVoice: (voice) => set({ ttsVoice: voice }),
            setTtsHighlightWords: (enabled) => set({ ttsHighlightWords: enabled }),
            setScreenRulerEnabled: (enabled) => set({ screenRulerEnabled: enabled }),
            setScreenRulerHeight: (height) => set({ screenRulerHeight: Math.max(40, Math.min(200, height)) }),
            setLineFocusEnabled: (enabled) => set({ lineFocusEnabled: enabled }),
            setLineFocusDimAmount: (amount) => set({ lineFocusDimAmount: Math.max(0.3, Math.min(0.9, amount)) }),
            setColorFilter: (filter) => set({ colorFilter: filter }),
            setHighContrast: (enabled) => set({ highContrast: enabled }),
            setUseDyslexicFont: (enabled) => set({ useDyslexicFont: enabled }),
            setKeyboardNavigation: (enabled) => set({ keyboardNavigation: enabled }),
        }),
        {
            name: "storyline-accessibility",
        }
    )
);

// ========== Text-to-Speech Hook ==========
interface TTSOptions {
    onWordBoundary?: (charIndex: number, charLength: number) => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
}

export function useTextToSpeech(options: TTSOptions = {}) {
    const { ttsRate, ttsPitch, ttsVoice, ttsHighlightWords } = useAccessibilityStore();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Load available voices
    useEffect(() => {
        const loadVoices = () => {
            const voices = speechSynthesis.getVoices();
            setAvailableVoices(voices);
        };

        loadVoices();
        speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const speak = useCallback(
        (text: string) => {
            if (!("speechSynthesis" in window)) {
                options.onError?.("Text-to-speech not supported in this browser");
                return;
            }

            // Cancel any existing speech
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = ttsRate;
            utterance.pitch = ttsPitch;

            // Set voice if specified
            if (ttsVoice) {
                const voice = availableVoices.find((v) => v.name === ttsVoice);
                if (voice) utterance.voice = voice;
            }

            // Word boundary event for highlighting
            if (ttsHighlightWords) {
                utterance.onboundary = (event) => {
                    if (event.name === "word") {
                        setCurrentWordIndex(event.charIndex);
                        options.onWordBoundary?.(event.charIndex, event.charLength || 0);
                    }
                };
            }

            utterance.onstart = () => {
                setIsSpeaking(true);
                setIsPaused(false);
            };

            utterance.onend = () => {
                setIsSpeaking(false);
                setIsPaused(false);
                setCurrentWordIndex(-1);
                options.onEnd?.();
            };

            utterance.onerror = (event) => {
                setIsSpeaking(false);
                options.onError?.(event.error);
            };

            utteranceRef.current = utterance;
            speechSynthesis.speak(utterance);
        },
        [ttsRate, ttsPitch, ttsVoice, ttsHighlightWords, availableVoices, options]
    );

    const pause = useCallback(() => {
        speechSynthesis.pause();
        setIsPaused(true);
    }, []);

    const resume = useCallback(() => {
        speechSynthesis.resume();
        setIsPaused(false);
    }, []);

    const stop = useCallback(() => {
        speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentWordIndex(-1);
    }, []);

    return {
        speak,
        pause,
        resume,
        stop,
        isSpeaking,
        isPaused,
        currentWordIndex,
        availableVoices,
    };
}

// ========== Screen Ruler Hook ==========
export function useScreenRuler() {
    const { screenRulerEnabled, screenRulerHeight } = useAccessibilityStore();
    const [position, setPosition] = useState({ y: 0 });

    useEffect(() => {
        if (!screenRulerEnabled) return;

        const handleMouseMove = (e: MouseEvent) => {
            setPosition({ y: e.clientY });
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [screenRulerEnabled]);

    return {
        enabled: screenRulerEnabled,
        position,
        height: screenRulerHeight,
    };
}

// ========== Keyboard Navigation Hook ==========
export function useKeyboardNavigation(
    onPrevious: () => void,
    onNext: () => void,
    onToggleTTS?: () => void
) {
    const { keyboardNavigation } = useAccessibilityStore();

    useEffect(() => {
        if (!keyboardNavigation) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't intercept if user is typing in an input
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            switch (e.key) {
                case "ArrowLeft":
                case "PageUp":
                    e.preventDefault();
                    onPrevious();
                    break;
                case "ArrowRight":
                case "PageDown":
                case " ":
                    e.preventDefault();
                    onNext();
                    break;
                case "s":
                case "S":
                    if (onToggleTTS) {
                        e.preventDefault();
                        onToggleTTS();
                    }
                    break;
                case "Escape":
                    // Can be used to close panels
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [keyboardNavigation, onPrevious, onNext, onToggleTTS]);
}

// ========== Color Filter CSS Generator ==========
export function getColorFilterCSS(filter: ColorFilter): string {
    switch (filter) {
        case "sepia":
            return "sepia(0.3)";
        case "greyscale":
            return "grayscale(1)";
        case "inverted":
            return "invert(1) hue-rotate(180deg)";
        case "blue-light":
            return "sepia(0.2) saturate(0.8)";
        case "high-contrast":
            return "contrast(1.4) saturate(1.2)";
        default:
            return "none";
    }
}

// ========== OpenDyslexic Font Loader ==========
export function useDyslexicFont() {
    const { useDyslexicFont } = useAccessibilityStore();

    useEffect(() => {
        if (useDyslexicFont) {
            // Load OpenDyslexic font
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href =
                "https://fonts.cdnfonts.com/css/opendyslexic";
            link.id = "opendyslexic-font";
            document.head.appendChild(link);

            // Apply to body
            document.body.style.setProperty("--font-reading", "'OpenDyslexic', sans-serif");
        } else {
            // Remove font
            const existingLink = document.getElementById("opendyslexic-font");
            if (existingLink) {
                existingLink.remove();
            }
            document.body.style.setProperty("--font-reading", "'Literata', Georgia, serif");
        }
    }, [useDyslexicFont]);

    return useDyslexicFont;
}
