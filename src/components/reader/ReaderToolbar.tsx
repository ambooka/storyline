"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play,
    Pause,
    Square,
    SkipForward,
    SkipBack,
    Volume2,
    VolumeX,
    Type,
    Moon,
    Sun,
    Minus,
    Plus,
    Bookmark,
    BookmarkCheck,
    Music,
    Loader2,
    ChevronDown,
    SlidersHorizontal,
    X,
    Mic,
} from "lucide-react";
import { useAmbientSound } from "@/lib/audio";
import { useAITextToSpeech, AI_VOICES, AIVoice } from "@/lib/ai-tts";
import styles from "./ReaderToolbar.module.css";

interface ReaderToolbarProps {
    pageText: string;
    theme: "light" | "dark" | "sepia" | "amoled";
    onThemeChange: (theme: "light" | "dark" | "sepia" | "amoled") => void;
    fontSize: number;
    onFontSizeChange: (size: number) => void;
    lineHeight: number;
    onLineHeightChange: (height: number) => void;
    isBookmarked: boolean;
    onToggleBookmark: () => void;
    progress: number;
    currentChapter: string;
    onPrevPage: () => void;
    onNextPage: () => void;
}

export function ReaderToolbar({
    pageText,
    theme,
    onThemeChange,
    fontSize,
    onFontSizeChange,
    lineHeight,
    onLineHeightChange,
    isBookmarked,
    onToggleBookmark,
    progress,
    currentChapter,
    onPrevPage,
    onNextPage,
}: ReaderToolbarProps) {
    const [showSettings, setShowSettings] = useState(false);
    const [showAmbient, setShowAmbient] = useState(false);
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);
    const [autoRead, setAutoRead] = useState(false);
    const prevPageTextRef = useRef<string>(pageText);

    // AI TTS with realistic voices
    const tts = useAITextToSpeech();
    const ambient = useAmbientSound();
    const settingsRef = useRef<HTMLDivElement>(null);
    const ambientRef = useRef<HTMLDivElement>(null);
    const voiceSettingsRef = useRef<HTMLDivElement>(null);

    // Load saved TTS settings on mount
    useEffect(() => {
        const savedVoice = localStorage.getItem('tts-voice');
        const savedSpeed = localStorage.getItem('tts-speed');
        const savedAutoRead = localStorage.getItem('tts-auto-read');

        if (savedVoice) tts.setVoice(savedVoice as AIVoice);
        if (savedSpeed) tts.setSpeed(parseFloat(savedSpeed));
        if (savedAutoRead) setAutoRead(savedAutoRead === 'true');
    }, []);

    // Save TTS settings when they change
    useEffect(() => {
        localStorage.setItem('tts-voice', tts.currentVoice);
        localStorage.setItem('tts-speed', tts.speed.toString());
    }, [tts.currentVoice, tts.speed]);

    // Detect page changes and handle TTS accordingly
    useEffect(() => {
        if (pageText !== prevPageTextRef.current) {
            // Page changed
            if (tts.isPlaying) {
                tts.stop();

                // If auto-read is enabled, start reading new page after a short delay
                if (autoRead && pageText && pageText.trim().length > 0) {
                    setTimeout(() => {
                        const cleanText = pageText
                            .replace(/\s+/g, " ")
                            .replace(/([.!?])\s*/g, "$1 ")
                            .trim();
                        tts.speak(cleanText);
                    }, 300);
                }
            }
            prevPageTextRef.current = pageText;
        }
    }, [pageText, tts, autoRead]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setShowSettings(false);
            }
            if (ambientRef.current && !ambientRef.current.contains(e.target as Node)) {
                setShowAmbient(false);
            }
            if (voiceSettingsRef.current && !voiceSettingsRef.current.contains(e.target as Node)) {
                setShowVoiceSettings(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Handle TTS play/pause
    const handlePlayPause = useCallback(() => {
        if (tts.isPlaying && !tts.isPaused) {
            tts.pause();
        } else if (tts.isPaused) {
            tts.resume();
        } else if (pageText && pageText.trim().length > 0) {
            // Clean up text for better reading
            const cleanText = pageText
                .replace(/\s+/g, " ")
                .replace(/([.!?])\s*/g, "$1 ")
                .trim();
            tts.speak(cleanText);
        }
    }, [tts, pageText]);

    const handleStop = useCallback(() => {
        tts.stop();
        setAutoRead(false);
        localStorage.setItem('tts-auto-read', 'false');
    }, [tts]);

    const handleVoiceChange = useCallback((voice: AIVoice) => {
        tts.setVoice(voice);
        // If currently playing, restart with new voice
        if (tts.isPlaying && pageText) {
            tts.stop();
            setTimeout(() => {
                const cleanText = pageText
                    .replace(/\s+/g, " ")
                    .replace(/([.!?])\s*/g, "$1 ")
                    .trim();
                tts.speak(cleanText);
            }, 100);
        }
    }, [tts, pageText]);

    const handleSpeedChange = useCallback((speed: number) => {
        tts.setSpeed(speed);
    }, [tts]);

    const toggleAutoRead = useCallback(() => {
        const newValue = !autoRead;
        setAutoRead(newValue);
        localStorage.setItem('tts-auto-read', newValue.toString());
    }, [autoRead]);

    return (
        <>
            {/* Main Floating Toolbar */}
            <motion.div
                className={styles.toolbar}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
                {/* Left: Navigation */}
                <div className={styles.toolbarSection}>
                    <button className={styles.navBtn} onClick={onPrevPage} title="Previous page">
                        <ChevronDown size={18} style={{ transform: "rotate(90deg)" }} />
                    </button>
                    <div className={styles.progressPill}>
                        <span className={styles.progressPercent}>{Math.round(progress)}%</span>
                    </div>
                    <button className={styles.navBtn} onClick={onNextPage} title="Next page">
                        <ChevronDown size={18} style={{ transform: "rotate(-90deg)" }} />
                    </button>
                </div>

                {/* Center: Main Controls */}
                <div className={styles.toolbarCenter}>
                    {/* Listen Button - AI TTS */}
                    <button
                        className={`${styles.listenBtn} ${tts.isPlaying ? styles.listenBtnActive : ""} ${tts.isLoading ? styles.listenBtnLoading : ""}`}
                        onClick={handlePlayPause}
                        disabled={tts.isLoading}
                        title={tts.isPlaying ? "Pause reading" : "Read aloud with AI voice"}
                    >
                        {tts.isLoading ? (
                            <Loader2 size={18} className={styles.spinner} />
                        ) : tts.isPlaying && !tts.isPaused ? (
                            <Pause size={18} />
                        ) : (
                            <Play size={18} />
                        )}
                        <span>
                            {tts.isLoading ? "Loading..." : tts.isPlaying ? (tts.isPaused ? "Resume" : "Pause") : "Listen"}
                        </span>
                    </button>

                    {/* Voice Settings Button */}
                    <div className={styles.voiceSettingsWrapper} ref={voiceSettingsRef}>
                        <button
                            className={`${styles.voiceSettingsBtn} ${showVoiceSettings ? styles.voiceSettingsBtnActive : ""}`}
                            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                            title="Voice settings"
                        >
                            <Mic size={16} />
                        </button>

                        <AnimatePresence>
                            {showVoiceSettings && (
                                <motion.div
                                    className={styles.voiceSettingsDropdown}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <div className={styles.voiceSettingsHeader}>
                                        <Mic size={14} />
                                        <span>Voice Settings</span>
                                        {tts.isPlaying && (
                                            <button className={styles.stopBtn} onClick={handleStop} title="Stop">
                                                <Square size={12} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Voice Selector */}
                                    <div className={styles.voiceSelector}>
                                        <label>Voice</label>
                                        <div className={styles.voiceOptions}>
                                            {AI_VOICES.map((voice) => (
                                                <button
                                                    key={voice.id}
                                                    className={`${styles.voiceOption} ${tts.currentVoice === voice.id ? styles.voiceOptionActive : ""}`}
                                                    onClick={() => handleVoiceChange(voice.id)}
                                                    title={`${voice.description} - ${voice.mood}`}
                                                >
                                                    <span className={styles.voiceName}>{voice.name}</span>
                                                    <span className={styles.voiceDesc}>{voice.description}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Speed Control */}
                                    <div className={styles.speedControl}>
                                        <label>Speed: {tts.speed.toFixed(1)}x</label>
                                        <div className={styles.speedSlider}>
                                            <span>0.5x</span>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="2.0"
                                                step="0.1"
                                                value={tts.speed}
                                                onChange={(e) => handleSpeedChange(Number(e.target.value))}
                                                className={styles.volumeSlider}
                                            />
                                            <span>2x</span>
                                        </div>
                                    </div>

                                    {/* Auto-Read Toggle */}
                                    <div className={styles.autoReadToggle}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={autoRead}
                                                onChange={toggleAutoRead}
                                            />
                                            <span>Auto-read on page turn</span>
                                        </label>
                                    </div>

                                    {tts.usingFallback && (
                                        <div className={styles.fallbackNotice}>
                                            Using browser voice (API unavailable)
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className={styles.divider} />

                    {/* Ambient Sound Button */}
                    <div className={styles.ambientWrapper} ref={ambientRef}>
                        <button
                            className={`${styles.ambientBtn} ${ambient.isPlaying ? styles.ambientBtnActive : ""}`}
                            onClick={() => setShowAmbient(!showAmbient)}
                            title="Background sounds"
                        >
                            <Music size={18} />
                            {ambient.isPlaying && (
                                <span className={styles.ambientIndicator}>
                                    {ambient.sounds.find(s => s.id === ambient.currentSound)?.emoji}
                                </span>
                            )}
                        </button>

                        {/* Ambient Dropdown */}
                        <AnimatePresence>
                            {showAmbient && (
                                <motion.div
                                    className={styles.ambientDropdown}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                >
                                    <div className={styles.ambientHeader}>
                                        <span>🎧 Background Sounds</span>
                                        {ambient.isPlaying && (
                                            <button className={styles.ambientStopBtn} onClick={() => ambient.stop()}>
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div className={styles.ambientGrid}>
                                        {ambient.sounds.map((sound) => (
                                            <button
                                                key={sound.id}
                                                className={`${styles.soundBtn} ${ambient.currentSound === sound.id && ambient.isPlaying ? styles.soundBtnActive : ""}`}
                                                onClick={() => ambient.toggle(sound.id)}
                                            >
                                                <span className={styles.soundEmoji}>{sound.emoji}</span>
                                                <span className={styles.soundName}>{sound.name}</span>
                                                {ambient.currentSound === sound.id && ambient.isPlaying && (
                                                    <span className={styles.soundPlaying}>▶</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    <div className={styles.volumeRow}>
                                        <VolumeX size={14} />
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={ambient.volume}
                                            onChange={(e) => ambient.setVolume(Number(e.target.value))}
                                            className={styles.volumeSlider}
                                        />
                                        <Volume2 size={14} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className={styles.divider} />

                    {/* Text Size Controls */}
                    <div className={styles.sizeControls}>
                        <button
                            className={styles.sizeBtn}
                            onClick={() => onFontSizeChange(Math.max(14, fontSize - 2))}
                        >
                            <Minus size={14} />
                        </button>
                        <span className={styles.sizeLabel}><Type size={14} /></span>
                        <button
                            className={styles.sizeBtn}
                            onClick={() => onFontSizeChange(Math.min(28, fontSize + 2))}
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    <div className={styles.divider} />

                    {/* Theme Toggle */}
                    <button
                        className={styles.themeBtn}
                        onClick={() => onThemeChange(theme === "dark" || theme === "amoled" ? "light" : "dark")}
                    >
                        {theme === "dark" || theme === "amoled" ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>

                {/* Right: Actions */}
                <div className={styles.toolbarSection}>
                    <button
                        className={`${styles.actionBtn} ${isBookmarked ? styles.actionBtnActive : ""}`}
                        onClick={onToggleBookmark}
                    >
                        {isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                    </button>

                    <div className={styles.settingsWrapper} ref={settingsRef}>
                        <button
                            className={`${styles.actionBtn} ${showSettings ? styles.actionBtnActive : ""}`}
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <SlidersHorizontal size={18} />
                        </button>

                        {/* Settings Dropdown */}
                        <AnimatePresence>
                            {showSettings && (
                                <motion.div
                                    className={styles.settingsDropdown}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                >
                                    <div className={styles.settingGroup}>
                                        <label className={styles.settingLabel}>Theme</label>
                                        <div className={styles.themeGrid}>
                                            {(["light", "dark", "sepia", "amoled"] as const).map((t) => (
                                                <button
                                                    key={t}
                                                    className={`${styles.themePill} ${styles[`themePill${t.charAt(0).toUpperCase() + t.slice(1)}`]} ${theme === t ? styles.themePillActive : ""}`}
                                                    onClick={() => onThemeChange(t)}
                                                >
                                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.settingGroup}>
                                        <label className={styles.settingLabel}>Text Size: {fontSize}px</label>
                                        <input
                                            type="range"
                                            min="14"
                                            max="28"
                                            value={fontSize}
                                            onChange={(e) => onFontSizeChange(Number(e.target.value))}
                                            className={styles.slider}
                                        />
                                    </div>

                                    <div className={styles.settingGroup}>
                                        <label className={styles.settingLabel}>Line Spacing: {lineHeight.toFixed(1)}</label>
                                        <input
                                            type="range"
                                            min="1.4"
                                            max="2.2"
                                            step="0.1"
                                            value={lineHeight}
                                            onChange={(e) => onLineHeightChange(Number(e.target.value))}
                                            className={styles.slider}
                                        />
                                    </div>

                                    {/* AI Voice Selection */}
                                    <div className={styles.settingGroup}>
                                        <label className={styles.settingLabel}>
                                            <Mic size={12} /> AI Narrator Voice
                                        </label>
                                        <div className={styles.voiceGrid}>
                                            {AI_VOICES.map((voice) => (
                                                <button
                                                    key={voice.id}
                                                    className={`${styles.voiceBtn} ${tts.currentVoice === voice.id ? styles.voiceBtnActive : ""}`}
                                                    onClick={() => tts.setVoice(voice.id)}
                                                    title={voice.description}
                                                >
                                                    <span className={styles.voiceName}>{voice.name}</span>
                                                    <span className={styles.voiceMood}>{voice.mood}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Reading Speed */}
                                    <div className={styles.settingGroup}>
                                        <label className={styles.settingLabel}>Reading Speed: {tts.speed}x</label>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="2"
                                            step="0.25"
                                            value={tts.speed}
                                            onChange={(e) => tts.setSpeed(Number(e.target.value))}
                                            className={styles.slider}
                                        />
                                    </div>

                                    {tts.error && (
                                        <div className={styles.errorMsg}>
                                            ⚠️ {tts.error}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            {/* TTS Progress Bar */}
            <AnimatePresence>
                {(tts.isPlaying || tts.isLoading) && (
                    <motion.div
                        className={styles.ttsBar}
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                    >
                        <div className={styles.ttsControls}>
                            <button onClick={handlePlayPause} className={styles.ttsPlayBtn} disabled={tts.isLoading}>
                                {tts.isLoading ? (
                                    <Loader2 size={20} className={styles.spinner} />
                                ) : tts.isPaused ? (
                                    <Play size={20} />
                                ) : (
                                    <Pause size={20} />
                                )}
                            </button>
                            <button onClick={handleStop} className={styles.ttsStopBtn} title="Stop">
                                <Square size={14} />
                            </button>
                        </div>
                        <div className={styles.ttsInfo}>
                            <span className={styles.ttsVoice}>
                                {AI_VOICES.find(v => v.id === tts.currentVoice)?.name || "AI Voice"}
                            </span>
                            <span className={styles.ttsStatus}>
                                {tts.isLoading ? "🎙️ Generating..." : tts.isPaused ? "Paused" : "🎧 Reading..."}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
