import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'sepia' | 'amoled';
export type FontFamily = 'literata' | 'inter' | 'opendyslexic' | 'system';

interface ReaderSettings {
    // Theme
    theme: ThemeMode;

    // Typography
    fontFamily: FontFamily;
    fontSize: number; // 14-28
    lineHeight: number; // 1.4-2.2
    letterSpacing: number; // -0.5 to 2
    textAlign: 'left' | 'justify';

    // Layout
    margins: number; // 0-100 (percentage)
    maxWidth: number; // 500-900

    // Reading
    autoHideControls: boolean;
    showProgress: boolean;

    // Social
    showAnnotations: boolean;
    showGhostAvatars: boolean;
    socialIntensity: number; // 0-3: solo, minimal, moderate, full
}

interface ReaderState extends ReaderSettings {
    // Actions
    setTheme: (theme: ThemeMode) => void;
    setFontFamily: (font: FontFamily) => void;
    setFontSize: (size: number) => void;
    setLineHeight: (height: number) => void;
    setLetterSpacing: (spacing: number) => void;
    setTextAlign: (align: 'left' | 'justify') => void;
    setMargins: (margins: number) => void;
    setMaxWidth: (width: number) => void;
    setAutoHideControls: (hide: boolean) => void;
    setShowProgress: (show: boolean) => void;
    setShowAnnotations: (show: boolean) => void;
    setShowGhostAvatars: (show: boolean) => void;
    setSocialIntensity: (intensity: number) => void;
    resetToDefaults: () => void;
}

const defaultSettings: ReaderSettings = {
    theme: 'light',
    fontFamily: 'literata',
    fontSize: 18,
    lineHeight: 1.8,
    letterSpacing: 0,
    textAlign: 'left',
    margins: 20,
    maxWidth: 720,
    autoHideControls: true,
    showProgress: true,
    showAnnotations: true,
    showGhostAvatars: true,
    socialIntensity: 2,
};

export const useReaderStore = create<ReaderState>()(
    persist(
        (set) => ({
            ...defaultSettings,

            setTheme: (theme) => {
                document.documentElement.setAttribute('data-theme', theme);
                set({ theme });
            },

            setFontFamily: (fontFamily) => set({ fontFamily }),
            setFontSize: (fontSize) => set({ fontSize: Math.max(14, Math.min(28, fontSize)) }),
            setLineHeight: (lineHeight) => set({ lineHeight: Math.max(1.4, Math.min(2.2, lineHeight)) }),
            setLetterSpacing: (letterSpacing) => set({ letterSpacing: Math.max(-0.5, Math.min(2, letterSpacing)) }),
            setTextAlign: (textAlign) => set({ textAlign }),
            setMargins: (margins) => set({ margins: Math.max(0, Math.min(100, margins)) }),
            setMaxWidth: (maxWidth) => set({ maxWidth: Math.max(500, Math.min(900, maxWidth)) }),
            setAutoHideControls: (autoHideControls) => set({ autoHideControls }),
            setShowProgress: (showProgress) => set({ showProgress }),
            setShowAnnotations: (showAnnotations) => set({ showAnnotations }),
            setShowGhostAvatars: (showGhostAvatars) => set({ showGhostAvatars }),
            setSocialIntensity: (socialIntensity) => set({ socialIntensity: Math.max(0, Math.min(3, socialIntensity)) }),

            resetToDefaults: () => set(defaultSettings),
        }),
        {
            name: 'storyline-reader-settings',
        }
    )
);
