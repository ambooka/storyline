"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Play,
    Pause,
    Square,
    Volume2,
    VolumeX,
    Type,
    Minus,
    Plus,
    Bookmark,
    BookmarkCheck,
    Music,
    Loader2,
    ChevronDown,
    Settings,
    X,
    Mic,
    Palette,
    Headphones,
    Library,
    MapPin,
    Heart,
    Trash2,
} from "lucide-react";
import { useAmbientSound } from "@/lib/audio";
import { useAITextToSpeech, AI_VOICES, AIVoice } from "@/lib/ai-tts";
import { SoundWaveIcon } from "./SoundWaveIcon";
import styles from "./ReaderToolbar.module.css";

// Types for bookmark items
interface BookmarkItem {
    id: string;
    cfi: string;
    title: string;
    createdAt: Date;
}

interface ReactionItem {
    id: string;
    emoji: string;
    text?: string;
    cfi: string;
}

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
    autoPageTurn?: boolean;
    onAutoPageTurnChange?: (value: boolean) => void;
    // New props for Library tab
    bookmarks?: BookmarkItem[];
    reactions?: ReactionItem[];
    onGoToBookmark?: (cfi: string) => void;
    onDeleteBookmark?: (id: string) => void;
    onDeleteReaction?: (id: string) => void;
}

type SettingsTab = "audio" | "sounds" | "display" | "library";

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
    autoPageTurn = true,
    onAutoPageTurnChange,
    bookmarks = [],
    reactions = [],
    onGoToBookmark,
    onDeleteBookmark,
    onDeleteReaction,
}: ReaderToolbarProps) {
    const [showSettings, setShowSettings] = useState(false);
    const [activeTab, setActiveTab] = useState<SettingsTab>("audio");
    // Default autoRead to true for auto-highlight and tracking
    const [autoRead, setAutoRead] = useState(true);
    const prevPageTextRef = useRef<string>(pageText);

    // AI TTS with realistic voices
    const tts = useAITextToSpeech();
    const ambient = useAmbientSound();

    // Load saved TTS settings on mount - but default autoRead to true
    useEffect(() => {
        const savedVoice = localStorage.getItem('tts-voice');
        const savedSpeed = localStorage.getItem('tts-speed');
        const savedAutoRead = localStorage.getItem('tts-auto-read');

        if (savedVoice) tts.setVoice(savedVoice as AIVoice);
        if (savedSpeed) tts.setSpeed(parseFloat(savedSpeed));
        // Default to true if not explicitly set to false
        if (savedAutoRead !== 'false') {
            setAutoRead(true);
        }

        // Enable auto page turn by default
        if (onAutoPageTurnChange && !localStorage.getItem('tts-auto-page-turn')) {
            onAutoPageTurnChange(true);
        }
    }, []);

    // Save TTS settings when they change
    useEffect(() => {
        localStorage.setItem('tts-voice', tts.currentVoice);
        localStorage.setItem('tts-speed', tts.speed.toString());
    }, [tts.currentVoice, tts.speed]);

    // Detect page changes and handle TTS accordingly - auto continue reading
    useEffect(() => {
        if (pageText !== prevPageTextRef.current) {
            if (tts.isPlaying) {
                tts.stop();

                // Auto-read is on by default, continue reading new page
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

    // Handle TTS play/pause
    const handlePlayPause = useCallback(() => {
        if (tts.isPlaying && !tts.isPaused) {
            tts.pause();
        } else if (tts.isPaused) {
            tts.resume();
        } else if (pageText && pageText.trim().length > 0) {
            const cleanText = pageText
                .replace(/\s+/g, " ")
                .replace(/([.!?])\s*/g, "$1 ")
                .trim();
            tts.speak(cleanText);
        }
    }, [tts, pageText]);

    const handleStop = useCallback(() => {
        tts.stop();
    }, [tts]);

    const handleVoiceChange = useCallback((voice: AIVoice) => {
        tts.setVoice(voice);
        localStorage.setItem('tts-voice', voice);
        if (tts.isPlaying && pageText) {
            tts.stop();
            // Wait for state update to complete before speaking with new voice
            setTimeout(() => {
                const cleanText = pageText
                    .replace(/\s+/g, " ")
                    .replace(/([.!?])\s*/g, "$1 ")
                    .trim();
                tts.speak(cleanText);
            }, 500);
        }
    }, [tts, pageText]);

    const toggleAutoRead = useCallback(() => {
        const newValue = !autoRead;
        setAutoRead(newValue);
        localStorage.setItem('tts-auto-read', newValue.toString());
    }, [autoRead]);

    // Close settings when clicking overlay
    const handleOverlayClick = useCallback(() => {
        setShowSettings(false);
    }, []);

    return (
        <>
            {/* Main Floating Toolbar - Mobile Optimized */}
            <motion.div
                className={styles.toolbar}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
                {/* Navigation */}
                <div className={styles.toolbarSection}>
                    <button className={styles.navBtn} onClick={onPrevPage} title="Previous page">
                        <ChevronDown size={20} style={{ transform: "rotate(90deg)" }} />
                    </button>
                    <div className={styles.progressPill}>
                        <span className={styles.progressPercent}>{Math.round(progress)}%</span>
                    </div>
                    <button className={styles.navBtn} onClick={onNextPage} title="Next page">
                        <ChevronDown size={20} style={{ transform: "rotate(-90deg)" }} />
                    </button>
                </div>

                {/* Listen Button - Now shows wave+pause or play */}
                <button
                    className={`${styles.listenBtn} ${tts.isPlaying ? styles.listenBtnActive : ""} ${tts.isLoading ? styles.listenBtnLoading : ""}`}
                    onClick={handlePlayPause}
                    disabled={tts.isLoading}
                >
                    {tts.isLoading ? (
                        <Loader2 size={20} className={styles.spinner} />
                    ) : tts.isPlaying && !tts.isPaused ? (
                        <>
                            <SoundWaveIcon size={18} />
                            <Pause size={18} />
                        </>
                    ) : tts.isPaused ? (
                        <>
                            <Play size={20} />
                            <span className={styles.listenLabel}>Resume</span>
                        </>
                    ) : (
                        <>
                            <Play size={20} />
                            <span className={styles.listenLabel}>Listen</span>
                        </>
                    )}
                </button>

                {/* Stop Button - Only when playing */}
                {tts.isPlaying && (
                    <button
                        className={styles.stopBtn}
                        onClick={handleStop}
                        title="Stop"
                    >
                        <Square size={16} />
                    </button>
                )}

                {/* Settings Button */}
                <button
                    className={`${styles.settingsBtn} ${showSettings ? styles.settingsBtnActive : ""}`}
                    onClick={() => setShowSettings(!showSettings)}
                >
                    <Settings size={20} />
                </button>

                {/* Bookmark Button */}
                <button
                    className={`${styles.bookmarkBtn} ${isBookmarked ? styles.bookmarkBtnActive : ""}`}
                    onClick={onToggleBookmark}
                >
                    {isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                </button>
            </motion.div>

            {/* Settings Bottom Sheet */}
            <AnimatePresence>
                {showSettings && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            className={styles.overlay}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleOverlayClick}
                        />

                        {/* Bottom Sheet */}
                        <motion.div
                            className={styles.bottomSheet}
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        >
                            {/* Handle */}
                            <div className={styles.bottomSheetHandle}>
                                <div className={styles.handleBar} />
                            </div>

                            {/* Header */}
                            <div className={styles.bottomSheetHeader}>
                                <span>Settings</span>
                                <button onClick={() => setShowSettings(false)} className={styles.closeBtn}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className={styles.tabBar}>
                                <button
                                    className={`${styles.tab} ${activeTab === "audio" ? styles.tabActive : ""}`}
                                    onClick={() => setActiveTab("audio")}
                                >
                                    <Headphones size={16} />
                                    <span>Audio</span>
                                </button>
                                <button
                                    className={`${styles.tab} ${activeTab === "sounds" ? styles.tabActive : ""}`}
                                    onClick={() => setActiveTab("sounds")}
                                >
                                    <Music size={16} />
                                    <span>Sounds</span>
                                </button>
                                <button
                                    className={`${styles.tab} ${activeTab === "display" ? styles.tabActive : ""}`}
                                    onClick={() => setActiveTab("display")}
                                >
                                    <Palette size={16} />
                                    <span>Display</span>
                                </button>
                                <button
                                    className={`${styles.tab} ${activeTab === "library" ? styles.tabActive : ""}`}
                                    onClick={() => setActiveTab("library")}
                                >
                                    <Library size={16} />
                                    <span>Library</span>
                                    {(bookmarks.length + reactions.length) > 0 && (
                                        <span className={styles.tabBadge}>{bookmarks.length + reactions.length}</span>
                                    )}
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className={styles.tabContent}>
                                {/* Audio Tab */}
                                {activeTab === "audio" && (
                                    <div className={styles.tabPanel}>
                                        {/* Voice Selector */}
                                        <div className={styles.settingGroup}>
                                            <label className={styles.settingLabel}>
                                                <Mic size={14} />
                                                Narrator Voice
                                            </label>
                                            <div className={styles.voiceGrid}>
                                                {AI_VOICES.map((voice) => (
                                                    <button
                                                        key={voice.id}
                                                        className={`${styles.voiceBtn} ${tts.currentVoice === voice.id ? styles.voiceBtnActive : ""}`}
                                                        onClick={() => handleVoiceChange(voice.id)}
                                                        title={voice.description}
                                                    >
                                                        <span className={styles.voiceName}>{voice.name}</span>
                                                        <span className={styles.voiceMood}>{voice.mood}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Speed Control */}
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

                                        {/* Toggles - All enabled by default */}
                                        <div className={styles.toggleGroup}>
                                            <label className={styles.toggleRow}>
                                                <span>Auto-read on page turn</span>
                                                <input
                                                    type="checkbox"
                                                    checked={autoRead}
                                                    onChange={toggleAutoRead}
                                                    className={styles.toggle}
                                                />
                                            </label>
                                            {onAutoPageTurnChange && (
                                                <label className={styles.toggleRow}>
                                                    <span>Auto-turn pages while listening</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={autoPageTurn}
                                                        onChange={() => {
                                                            onAutoPageTurnChange(!autoPageTurn);
                                                            localStorage.setItem('tts-auto-page-turn', (!autoPageTurn).toString());
                                                        }}
                                                        className={styles.toggle}
                                                    />
                                                </label>
                                            )}
                                        </div>

                                        {/* Error message */}
                                        {tts.error && (
                                            <div className={styles.errorMsg}>⚠️ {tts.error}</div>
                                        )}
                                    </div>
                                )}

                                {/* Sounds Tab */}
                                {activeTab === "sounds" && (
                                    <div className={styles.tabPanel}>
                                        <div className={styles.settingGroup}>
                                            <div className={styles.settingLabelRow}>
                                                <label className={styles.settingLabel}>Background Sounds</label>
                                                {ambient.isPlaying && (
                                                    <button className={styles.stopSoundBtn} onClick={() => ambient.stop()}>
                                                        <X size={14} />
                                                        Stop
                                                    </button>
                                                )}
                                            </div>
                                            <div className={styles.soundGrid}>
                                                {ambient.sounds.map((sound) => (
                                                    <button
                                                        key={sound.id}
                                                        className={`${styles.soundBtn} ${ambient.currentSound === sound.id && ambient.isPlaying ? styles.soundBtnActive : ""}`}
                                                        onClick={() => ambient.toggle(sound.id)}
                                                    >
                                                        <span className={styles.soundEmoji}>{sound.emoji}</span>
                                                        <span className={styles.soundName}>{sound.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className={styles.settingGroup}>
                                            <label className={styles.settingLabel}>Volume</label>
                                            <div className={styles.volumeRow}>
                                                <VolumeX size={16} />
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.1"
                                                    value={ambient.volume}
                                                    onChange={(e) => ambient.setVolume(Number(e.target.value))}
                                                    className={styles.slider}
                                                />
                                                <Volume2 size={16} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Display Tab */}
                                {activeTab === "display" && (
                                    <div className={styles.tabPanel}>
                                        {/* Theme Selection */}
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

                                        {/* Text Size */}
                                        <div className={styles.settingGroup}>
                                            <div className={styles.sizeHeader}>
                                                <label className={styles.settingLabel}>
                                                    <Type size={14} />
                                                    Text Size
                                                </label>
                                                <span className={styles.sizeValue}>{fontSize}px</span>
                                            </div>
                                            <div className={styles.sizeControls}>
                                                <button
                                                    className={styles.sizeBtn}
                                                    onClick={() => onFontSizeChange(Math.max(14, fontSize - 2))}
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <input
                                                    type="range"
                                                    min="14"
                                                    max="28"
                                                    value={fontSize}
                                                    onChange={(e) => onFontSizeChange(Number(e.target.value))}
                                                    className={styles.slider}
                                                />
                                                <button
                                                    className={styles.sizeBtn}
                                                    onClick={() => onFontSizeChange(Math.min(28, fontSize + 2))}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Line Spacing */}
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
                                    </div>
                                )}

                                {/* Library Tab */}
                                {activeTab === "library" && (
                                    <div className={styles.tabPanel}>
                                        {/* Bookmarks Section */}
                                        <div className={styles.settingGroup}>
                                            <label className={styles.settingLabel}>
                                                <Bookmark size={14} />
                                                Bookmarks ({bookmarks.length})
                                            </label>
                                            {bookmarks.length === 0 ? (
                                                <div className={styles.emptyState}>
                                                    <Bookmark size={24} />
                                                    <span>No bookmarks yet</span>
                                                    <small>Tap the bookmark button to save your place</small>
                                                </div>
                                            ) : (
                                                <div className={styles.libraryList}>
                                                    {bookmarks.map((bookmark) => (
                                                        <div key={bookmark.id} className={styles.libraryItem}>
                                                            <button
                                                                className={styles.libraryItemBtn}
                                                                onClick={() => {
                                                                    onGoToBookmark?.(bookmark.cfi);
                                                                    setShowSettings(false);
                                                                }}
                                                            >
                                                                <MapPin size={16} />
                                                                <div className={styles.libraryItemInfo}>
                                                                    <span className={styles.libraryItemTitle}>{bookmark.title}</span>
                                                                    <span className={styles.libraryItemDate}>
                                                                        {new Date(bookmark.createdAt).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                            <button
                                                                className={styles.libraryDeleteBtn}
                                                                onClick={() => onDeleteBookmark?.(bookmark.id)}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Reactions Section */}
                                        <div className={styles.settingGroup}>
                                            <label className={styles.settingLabel}>
                                                <Heart size={14} />
                                                Reactions ({reactions.length})
                                            </label>
                                            {reactions.length === 0 ? (
                                                <div className={styles.emptyState}>
                                                    <Heart size={24} />
                                                    <span>No reactions yet</span>
                                                    <small>React to passages that move you</small>
                                                </div>
                                            ) : (
                                                <div className={styles.libraryList}>
                                                    {reactions.slice(0, 10).map((reaction) => (
                                                        <div key={reaction.id} className={styles.libraryItem}>
                                                            <button
                                                                className={styles.libraryItemBtn}
                                                                onClick={() => {
                                                                    onGoToBookmark?.(reaction.cfi);
                                                                    setShowSettings(false);
                                                                }}
                                                            >
                                                                <span className={styles.reactionEmoji}>{reaction.emoji}</span>
                                                                <div className={styles.libraryItemInfo}>
                                                                    <span className={styles.libraryItemTitle}>
                                                                        {reaction.text || "View passage"}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                            <button
                                                                className={styles.libraryDeleteBtn}
                                                                onClick={() => onDeleteReaction?.(reaction.id)}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {reactions.length > 10 && (
                                                        <span className={styles.moreItems}>
                                                            +{reactions.length - 10} more reactions
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
