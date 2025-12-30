"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    Users,
    Phone,
    PhoneOff,
    Settings,
} from "lucide-react";
import styles from "./VoiceRoom.module.css";

interface VoiceParticipant {
    id: string;
    name: string;
    avatar?: string;
    isSpeaking: boolean;
    isMuted: boolean;
}

interface VoiceRoomProps {
    roomId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    participants: VoiceParticipant[];
    onJoin: () => void;
    onLeave: () => void;
    onMuteToggle: (muted: boolean) => void;
}

/**
 * Voice Room Component
 * Audio chat for collaborative reading sessions.
 * Uses WebRTC for peer-to-peer audio.
 */
export function VoiceRoom({
    roomId,
    userId,
    userName,
    userAvatar,
    participants,
    onJoin,
    onLeave,
    onMuteToggle,
}: VoiceRoomProps) {
    const [isInCall, setIsInCall] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [showControls, setShowControls] = useState(false);

    const handleJoinCall = useCallback(() => {
        setIsInCall(true);
        onJoin();
    }, [onJoin]);

    const handleLeaveCall = useCallback(() => {
        setIsInCall(false);
        onLeave();
    }, [onLeave]);

    const handleMuteToggle = useCallback(() => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        onMuteToggle(newMuted);
    }, [isMuted, onMuteToggle]);

    const activeParticipants = participants.filter((p) => !p.isMuted);

    return (
        <div className={styles.container}>
            {/* Voice indicator when in call */}
            {isInCall && (
                <motion.div
                    className={styles.voiceBar}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    {/* Speaking indicators */}
                    <div className={styles.speakingIndicators}>
                        {participants.map((p) => (
                            <div
                                key={p.id}
                                className={`${styles.participant} ${p.isSpeaking ? styles.speaking : ""} ${p.isMuted ? styles.muted : ""}`}
                                title={p.name}
                            >
                                {p.avatar ? (
                                    <img src={p.avatar} alt={p.name} />
                                ) : (
                                    <span>{p.name.charAt(0)}</span>
                                )}
                                {p.isSpeaking && (
                                    <div className={styles.speakingRing} />
                                )}
                                {p.isMuted && (
                                    <div className={styles.mutedIcon}>
                                        <MicOff size={10} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Controls */}
                    <div className={styles.controls}>
                        <button
                            className={`${styles.controlBtn} ${isMuted ? styles.controlBtnActive : ""}`}
                            onClick={handleMuteToggle}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>

                        <button
                            className={`${styles.controlBtn} ${!isSpeakerOn ? styles.controlBtnActive : ""}`}
                            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                            title={isSpeakerOn ? "Deafen" : "Undeafen"}
                        >
                            {isSpeakerOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>

                        <button
                            className={`${styles.controlBtn} ${styles.leaveBtn}`}
                            onClick={handleLeaveCall}
                            title="Leave voice"
                        >
                            <PhoneOff size={18} />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Join button when not in call */}
            {!isInCall && (
                <motion.button
                    className={styles.joinBtn}
                    onClick={handleJoinCall}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Phone size={18} />
                    <span>Join Voice</span>
                    {participants.length > 0 && (
                        <span className={styles.participantCount}>
                            {participants.length} in call
                        </span>
                    )}
                </motion.button>
            )}
        </div>
    );
}
