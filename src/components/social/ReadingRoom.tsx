"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    Crown,
    Copy,
    Check,
    X,
    MessageCircle,
    Send,
    Mic,
    MicOff,
    Settings,
    LogOut
} from "lucide-react";
import styles from "./ReadingRoom.module.css";

interface Participant {
    id: string;
    name: string;
    avatar: string;
    currentCfi: string;
    isHost: boolean;
    isActive: boolean;
}

interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: Date;
    cfi?: string;
}

interface ReadingRoomProps {
    roomId: string;
    bookId: string;
    bookTitle: string;
    currentCfi: string;
    onClose: () => void;
    onSyncToPosition: (cfi: string) => void;
}

export function ReadingRoom({
    roomId,
    bookId,
    bookTitle,
    currentCfi,
    onClose,
    onSyncToPosition,
}: ReadingRoomProps) {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [chatOpen, setChatOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [syncMode, setSyncMode] = useState(false);

    // Mock data for demonstration
    useEffect(() => {
        setParticipants([
            { id: "1", name: "You", avatar: "👤", currentCfi: currentCfi, isHost: true, isActive: true },
            { id: "2", name: "Sarah", avatar: "👩", currentCfi: "", isHost: false, isActive: true },
            { id: "3", name: "Mike", avatar: "👨", currentCfi: "", isHost: false, isActive: false },
        ]);
    }, [currentCfi]);

    const inviteLink = `https://storyline.app/room/${roomId}`;

    const handleCopyLink = useCallback(() => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [inviteLink]);

    const handleSendMessage = useCallback(() => {
        if (!newMessage.trim()) return;

        const message: ChatMessage = {
            id: Date.now().toString(),
            userId: "1",
            userName: "You",
            content: newMessage,
            timestamp: new Date(),
            cfi: currentCfi,
        };

        setMessages((prev) => [...prev, message]);
        setNewMessage("");
    }, [newMessage, currentCfi]);

    return (
        <div className={styles.roomPanel}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <Users size={18} />
                    <span>Reading Room</span>
                    <span className={styles.participantCount}>
                        {participants.filter(p => p.isActive).length}
                    </span>
                </div>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={18} />
                </button>
            </div>

            {/* Book Info */}
            <div className={styles.bookInfo}>
                <span className={styles.bookTitle}>{bookTitle}</span>
            </div>

            {/* Participants */}
            <div className={styles.participants}>
                {participants.map((participant) => (
                    <motion.div
                        key={participant.id}
                        className={`${styles.participant} ${!participant.isActive ? styles.participantInactive : ""}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className={styles.avatar}>
                            {participant.avatar}
                            {participant.isActive && <span className={styles.activeIndicator} />}
                        </div>
                        <span className={styles.participantName}>
                            {participant.name}
                            {participant.isHost && <Crown size={12} className={styles.hostIcon} />}
                        </span>
                        {participant.isActive && participant.id !== "1" && (
                            <button
                                className={styles.syncBtn}
                                onClick={() => onSyncToPosition(participant.currentCfi)}
                                title="Jump to their position"
                            >
                                →
                            </button>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Controls */}
            <div className={styles.controls}>
                <button
                    className={`${styles.controlBtn} ${!isMuted ? styles.controlBtnActive : ""}`}
                    onClick={() => setIsMuted(!isMuted)}
                >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                    className={`${styles.controlBtn} ${chatOpen ? styles.controlBtnActive : ""}`}
                    onClick={() => setChatOpen(!chatOpen)}
                >
                    <MessageCircle size={18} />
                    {messages.length > 0 && <span className={styles.badge}>{messages.length}</span>}
                </button>
                <button
                    className={`${styles.controlBtn} ${syncMode ? styles.controlBtnActive : ""}`}
                    onClick={() => setSyncMode(!syncMode)}
                    title="Sync mode - everyone follows host"
                >
                    <Settings size={18} />
                </button>
            </div>

            {/* Invite Link */}
            <div className={styles.inviteSection}>
                <span className={styles.inviteLabel}>Invite friends</span>
                <button className={styles.inviteBtn} onClick={handleCopyLink}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy Link"}
                </button>
            </div>

            {/* Chat Panel */}
            <AnimatePresence>
                {chatOpen && (
                    <motion.div
                        className={styles.chatPanel}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 200 }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className={styles.chatMessages}>
                            {messages.length === 0 ? (
                                <div className={styles.chatEmpty}>
                                    <MessageCircle size={20} />
                                    <span>No messages yet</span>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} className={styles.chatMessage}>
                                        <span className={styles.chatUser}>{msg.userName}</span>
                                        <span className={styles.chatContent}>{msg.content}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className={styles.chatInput}>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                            />
                            <button onClick={handleSendMessage}>
                                <Send size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Leave Room */}
            <button className={styles.leaveBtn} onClick={onClose}>
                <LogOut size={16} />
                Leave Room
            </button>
        </div>
    );
}

// Create Room Modal
interface CreateRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateRoom: (name: string, isPrivate: boolean) => void;
    bookTitle: string;
}

export function CreateRoomModal({
    isOpen,
    onClose,
    onCreateRoom,
    bookTitle,
}: CreateRoomModalProps) {
    const [roomName, setRoomName] = useState(`Reading ${bookTitle}`);
    const [isPrivate, setIsPrivate] = useState(false);

    const handleCreate = () => {
        onCreateRoom(roomName, isPrivate);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className={styles.modal}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3>Create Reading Room</h3>

                <div className={styles.formGroup}>
                    <label>Room Name</label>
                    <input
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Enter room name..."
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                        />
                        Private room (invite only)
                    </label>
                </div>

                <div className={styles.modalActions}>
                    <button className={styles.cancelBtn} onClick={onClose}>
                        Cancel
                    </button>
                    <button className={styles.createBtn} onClick={handleCreate}>
                        Create Room
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
