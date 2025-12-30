"use client";

import { motion } from "framer-motion";
import {
    X,
    Volume2,
    Eye,
    Palette,
    Type,
    Keyboard,
    Play,
    Pause,
    RotateCcw,
} from "lucide-react";
import {
    useAccessibilityStore,
    useTextToSpeech,
    ColorFilter,
} from "@/lib/accessibility";
import styles from "./AccessibilityPanel.module.css";

interface AccessibilityPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const COLOR_FILTERS: { id: ColorFilter; name: string; preview: string }[] = [
    { id: "none", name: "None", preview: "linear-gradient(135deg, #fff 50%, #000 50%)" },
    { id: "sepia", name: "Sepia", preview: "linear-gradient(135deg, #F4ECD8, #D4A574)" },
    { id: "greyscale", name: "Greyscale", preview: "linear-gradient(135deg, #ccc, #666)" },
    { id: "blue-light", name: "Blue Light", preview: "linear-gradient(135deg, #FFE4B5, #DEB887)" },
    { id: "high-contrast", name: "High Contrast", preview: "linear-gradient(135deg, #fff, #000)" },
    { id: "inverted", name: "Inverted", preview: "linear-gradient(135deg, #000, #fff)" },
];

export default function AccessibilityPanel({
    isOpen,
    onClose,
}: AccessibilityPanelProps) {
    const {
        ttsEnabled,
        ttsRate,
        ttsPitch,
        ttsHighlightWords,
        screenRulerEnabled,
        screenRulerHeight,
        lineFocusEnabled,
        lineFocusDimAmount,
        colorFilter,
        useDyslexicFont,
        keyboardNavigation,
        setTtsEnabled,
        setTtsRate,
        setTtsPitch,
        setTtsHighlightWords,
        setScreenRulerEnabled,
        setScreenRulerHeight,
        setLineFocusEnabled,
        setLineFocusDimAmount,
        setColorFilter,
        setUseDyslexicFont,
        setKeyboardNavigation,
    } = useAccessibilityStore();

    const { speak, stop, isSpeaking, availableVoices } = useTextToSpeech();

    const testTTS = () => {
        if (isSpeaking) {
            stop();
        } else {
            speak(
                "Hello! This is a preview of the text to speech feature. " +
                "You can adjust the speed and pitch using the sliders below."
            );
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className={styles.panel}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Accessibility</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {/* Text-to-Speech Section */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Volume2 size={20} />
                            <h3>Text-to-Speech</h3>
                        </div>

                        <div className={styles.toggleRow}>
                            <span>Enable TTS</span>
                            <button
                                className={`${styles.toggle} ${ttsEnabled ? styles.toggleActive : ""}`}
                                onClick={() => setTtsEnabled(!ttsEnabled)}
                            >
                                <div className={styles.toggleThumb} />
                            </button>
                        </div>

                        {ttsEnabled && (
                            <>
                                <div className={styles.sliderRow}>
                                    <span>Speed</span>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2"
                                        step="0.1"
                                        value={ttsRate}
                                        onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                                        className={styles.slider}
                                    />
                                    <span className={styles.sliderValue}>{ttsRate}x</span>
                                </div>

                                <div className={styles.sliderRow}>
                                    <span>Pitch</span>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2"
                                        step="0.1"
                                        value={ttsPitch}
                                        onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                                        className={styles.slider}
                                    />
                                    <span className={styles.sliderValue}>{ttsPitch}</span>
                                </div>

                                <div className={styles.toggleRow}>
                                    <span>Highlight Words</span>
                                    <button
                                        className={`${styles.toggle} ${ttsHighlightWords ? styles.toggleActive : ""}`}
                                        onClick={() => setTtsHighlightWords(!ttsHighlightWords)}
                                    >
                                        <div className={styles.toggleThumb} />
                                    </button>
                                </div>

                                <button className={styles.testBtn} onClick={testTTS}>
                                    {isSpeaking ? <Pause size={16} /> : <Play size={16} />}
                                    {isSpeaking ? "Stop" : "Test Voice"}
                                </button>
                            </>
                        )}
                    </section>

                    {/* Visual Aids Section */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Eye size={20} />
                            <h3>Visual Aids</h3>
                        </div>

                        <div className={styles.toggleRow}>
                            <span>Screen Ruler</span>
                            <button
                                className={`${styles.toggle} ${screenRulerEnabled ? styles.toggleActive : ""}`}
                                onClick={() => setScreenRulerEnabled(!screenRulerEnabled)}
                            >
                                <div className={styles.toggleThumb} />
                            </button>
                        </div>

                        {screenRulerEnabled && (
                            <div className={styles.sliderRow}>
                                <span>Height</span>
                                <input
                                    type="range"
                                    min="40"
                                    max="200"
                                    step="10"
                                    value={screenRulerHeight}
                                    onChange={(e) => setScreenRulerHeight(parseInt(e.target.value))}
                                    className={styles.slider}
                                />
                                <span className={styles.sliderValue}>{screenRulerHeight}px</span>
                            </div>
                        )}

                        <div className={styles.toggleRow}>
                            <span>Line Focus</span>
                            <button
                                className={`${styles.toggle} ${lineFocusEnabled ? styles.toggleActive : ""}`}
                                onClick={() => setLineFocusEnabled(!lineFocusEnabled)}
                            >
                                <div className={styles.toggleThumb} />
                            </button>
                        </div>

                        {lineFocusEnabled && (
                            <div className={styles.sliderRow}>
                                <span>Dim Amount</span>
                                <input
                                    type="range"
                                    min="0.3"
                                    max="0.9"
                                    step="0.1"
                                    value={lineFocusDimAmount}
                                    onChange={(e) => setLineFocusDimAmount(parseFloat(e.target.value))}
                                    className={styles.slider}
                                />
                                <span className={styles.sliderValue}>{Math.round(lineFocusDimAmount * 100)}%</span>
                            </div>
                        )}
                    </section>

                    {/* Color Filters Section */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Palette size={20} />
                            <h3>Color Filters</h3>
                        </div>

                        <div className={styles.filterGrid}>
                            {COLOR_FILTERS.map((filter) => (
                                <button
                                    key={filter.id}
                                    className={`${styles.filterBtn} ${colorFilter === filter.id ? styles.filterBtnActive : ""}`}
                                    onClick={() => setColorFilter(filter.id)}
                                >
                                    <div
                                        className={styles.filterPreview}
                                        style={{ background: filter.preview }}
                                    />
                                    <span>{filter.name}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Font Section */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Type size={20} />
                            <h3>Font</h3>
                        </div>

                        <div className={styles.toggleRow}>
                            <div className={styles.toggleInfo}>
                                <span>OpenDyslexic</span>
                                <span className={styles.toggleDescription}>
                                    Font designed for readers with dyslexia
                                </span>
                            </div>
                            <button
                                className={`${styles.toggle} ${useDyslexicFont ? styles.toggleActive : ""}`}
                                onClick={() => setUseDyslexicFont(!useDyslexicFont)}
                            >
                                <div className={styles.toggleThumb} />
                            </button>
                        </div>
                    </section>

                    {/* Keyboard Section */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Keyboard size={20} />
                            <h3>Keyboard</h3>
                        </div>

                        <div className={styles.toggleRow}>
                            <span>Keyboard Navigation</span>
                            <button
                                className={`${styles.toggle} ${keyboardNavigation ? styles.toggleActive : ""}`}
                                onClick={() => setKeyboardNavigation(!keyboardNavigation)}
                            >
                                <div className={styles.toggleThumb} />
                            </button>
                        </div>

                        {keyboardNavigation && (
                            <div className={styles.shortcuts}>
                                <div className={styles.shortcut}>
                                    <kbd>←</kbd> / <kbd>→</kbd>
                                    <span>Navigate pages</span>
                                </div>
                                <div className={styles.shortcut}>
                                    <kbd>Space</kbd>
                                    <span>Next page</span>
                                </div>
                                <div className={styles.shortcut}>
                                    <kbd>S</kbd>
                                    <span>Toggle TTS</span>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </motion.div>
        </motion.div>
    );
}
