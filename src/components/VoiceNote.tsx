"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, Square, Play, Pause, Trash2 } from "lucide-react";
import styles from "./VoiceNote.module.css";

interface VoiceNoteRecorderProps {
    onRecordComplete: (audioBlob: Blob, duration: number) => void;
    maxDuration?: number; // in seconds, default 15
}

export function VoiceNoteRecorder({
    onRecordComplete,
    maxDuration = 15,
}: VoiceNoteRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                onRecordComplete(blob, duration);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setDuration(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setDuration((d) => {
                    if (d >= maxDuration - 1) {
                        stopRecording();
                        return maxDuration;
                    }
                    return d + 1;
                });
            }, 1000);
        } catch (error) {
            console.error("Failed to start recording:", error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className={styles.recorder}>
            {isRecording ? (
                <>
                    <motion.div
                        className={styles.recordingIndicator}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                    />
                    <span className={styles.duration}>
                        {formatTime(duration)} / {formatTime(maxDuration)}
                    </span>
                    <button className={styles.stopBtn} onClick={stopRecording}>
                        <Square size={16} />
                    </button>
                </>
            ) : (
                <button className={styles.recordBtn} onClick={startRecording}>
                    <Mic size={20} />
                    <span>Record Voice Note</span>
                </button>
            )}
        </div>
    );
}

// Voice Note Player
interface VoiceNotePlayerProps {
    audioUrl: string;
    duration: number;
    onDelete?: () => void;
}

export function VoiceNotePlayer({
    audioUrl,
    duration,
    onDelete,
}: VoiceNotePlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.addEventListener("timeupdate", () => {
            setCurrentTime(audio.currentTime);
        });

        audio.addEventListener("ended", () => {
            setIsPlaying(false);
            setCurrentTime(0);
        });

        return () => {
            audio.pause();
            audio.src = "";
        };
    }, [audioUrl]);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={styles.player}>
            <button className={styles.playBtn} onClick={togglePlay}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <div className={styles.waveform}>
                <div className={styles.waveformBg}>
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className={styles.waveformBar}
                            style={{
                                height: `${Math.random() * 60 + 40}%`,
                                opacity: i < (progress / 100) * 20 ? 1 : 0.3,
                            }}
                        />
                    ))}
                </div>
            </div>

            <span className={styles.time}>
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {onDelete && (
                <button className={styles.deleteBtn} onClick={onDelete}>
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    );
}
