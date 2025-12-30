"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Volume2,
    VolumeX,
    Play,
    Pause,
    SkipForward,
    SkipBack,
    Settings,
    Mic,
    X
} from "lucide-react";
import { useAmbientSound, useTextToSpeech, AmbientSound } from "@/lib/audio";
import styles from "./AudioControls.module.css";

interface AudioControlsProps {
    currentText?: string;
    onClose?: () => void;
}

export function AudioControls({ currentText, onClose }: AudioControlsProps) {
    const [showSettings, setShowSettings] = useState(false);
    const [activeTab, setActiveTab] = useState<"ambient" | "tts">("ambient");

    const ambient = useAmbientSound();
    const tts = useTextToSpeech();

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === "ambient" ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab("ambient")}
                    >
                        <Volume2 size={16} />
                        Ambient
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "tts" ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab("tts")}
                    >
                        <Mic size={16} />
                        Read Aloud
                    </button>
                </div>
                {onClose && (
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Ambient Sounds */}
            {activeTab === "ambient" && (
                <div className={styles.ambientSection}>
                    <div className={styles.soundGrid}>
                        {ambient.sounds.map((sound) => (
                            <button
                                key={sound.id}
                                className={`${styles.soundBtn} ${ambient.currentSound === sound.id ? styles.soundBtnActive : ""}`}
                                onClick={() => ambient.toggle(sound.id)}
                                disabled={ambient.isLoading}
                            >
                                <span className={styles.soundEmoji}>{sound.emoji}</span>
                                <span className={styles.soundName}>{sound.name}</span>
                                {ambient.currentSound === sound.id && ambient.isPlaying && (
                                    <span className={styles.playingIndicator}>
                                        <span />
                                        <span />
                                        <span />
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Volume Control */}
                    <div className={styles.volumeControl}>
                        <VolumeX size={16} />
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={ambient.volume}
                            onChange={(e) => ambient.setVolume(Number(e.target.value))}
                            className={styles.volumeSlider}
                        />
                        <Volume2 size={16} />
                    </div>

                    {ambient.isPlaying && (
                        <button className={styles.stopBtn} onClick={ambient.stop}>
                            <Pause size={16} />
                            Stop Ambient Sound
                        </button>
                    )}
                </div>
            )}

            {/* Text-to-Speech */}
            {activeTab === "tts" && (
                <div className={styles.ttsSection}>
                    {/* Progress indicator */}
                    {tts.isSpeaking && (
                        <div className={styles.ttsProgress}>
                            <div
                                className={styles.ttsProgressBar}
                                style={{ width: `${tts.progress}%` }}
                            />
                        </div>
                    )}

                    {/* Controls */}
                    <div className={styles.ttsControls}>
                        <button
                            className={styles.ttsBtn}
                            onClick={() => {
                                if (tts.isSpeaking && !tts.isPaused) {
                                    tts.pause();
                                } else if (tts.isPaused) {
                                    tts.resume();
                                } else if (currentText) {
                                    tts.speak(currentText);
                                }
                            }}
                            disabled={!currentText && !tts.isSpeaking}
                        >
                            {tts.isSpeaking && !tts.isPaused ? (
                                <Pause size={24} />
                            ) : (
                                <Play size={24} />
                            )}
                        </button>
                        <button
                            className={styles.ttsBtnSmall}
                            onClick={tts.stop}
                            disabled={!tts.isSpeaking}
                        >
                            Stop
                        </button>
                    </div>

                    {/* Status */}
                    <div className={styles.ttsStatus}>
                        {tts.isSpeaking && !tts.isPaused && <span>Reading aloud...</span>}
                        {tts.isPaused && <span>Paused</span>}
                        {tts.error && <span className={styles.ttsError}>{tts.error}</span>}
                    </div>

                    {!currentText && !tts.isSpeaking && (
                        <p className={styles.ttsHint}>
                            Select some text to read aloud
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// Floating audio button for the reader
interface FloatingAudioButtonProps {
    isActive: boolean;
    onClick: () => void;
}

export function FloatingAudioButton({ isActive, onClick }: FloatingAudioButtonProps) {
    return (
        <motion.button
            className={`${styles.floatingBtn} ${isActive ? styles.floatingBtnActive : ""}`}
            onClick={onClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            {isActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </motion.button>
    );
}
