"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
    joinReadingRoom,
    leaveReadingRoom,
    sendRoomMessage,
    updateReadingPosition,
    subscribeToMessages,
    subscribeToParticipants,
    type ChatMessage,
    type Participant as FirebaseParticipant,
    getParticipantColor,
} from "@/lib/firebase/realtime";
import {
    Users,
    Crown,
    Copy,
    Check,
    X,
    MessageCircle,
    Send,
    MapPin
} from "lucide-react";
import styles from "./LiveReadingRoom.module.css";

interface Participant {
    id: string;
    name: string;
    avatar?: string;
    position?: number;
    isHost?: boolean;
}

interface LiveReadingRoomProps {
    roomId: string;
    bookId: string;
    bookTitle: string;
    currentCfi: string;
    isHost: boolean;
    onClose: () => void;
    onSyncToPosition: (cfi: string) => void;
}

export function LiveReadingRoom({
    roomId,
    bookId,
    bookTitle,
    currentCfi,
    isHost,
    onClose,
    onSyncToPosition,
}: LiveReadingRoomProps) {
    const { user, profile } = useAuth();

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [copied, setCopied] = useState(false);
    const [syncMode, setSyncMode] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const unsubscribersRef = useRef<(() => void)[]>([]);

    // Join room on mount
    useEffect(() => {
        if (!user) return;

        const userId = user.uid;
        const userName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Reader';
        const userAvatar = profile?.photoURL || user.photoURL || undefined;

        // Join the room
        joinReadingRoom(roomId, {
            id: userId,
            name: userName,
            avatar: userAvatar,
            position: 0,
            cursor: '',
            isActive: true,
            color: getParticipantColor(0),
        });

        // Subscribe to participants
        const unsubParticipants = subscribeToParticipants(roomId, (participantList) => {
            setParticipants(participantList);
        });

        // Subscribe to messages
        const unsubMessages = subscribeToMessages(roomId, (messageList) => {
            setMessages(messageList);
        });

        if (unsubParticipants) unsubscribersRef.current.push(unsubParticipants);
        if (unsubMessages) unsubscribersRef.current.push(unsubMessages);

        return () => {
            // Leave room and cleanup
            leaveReadingRoom(roomId, userId);
            unsubscribersRef.current.forEach((unsub) => unsub());
        };
    }, [user, profile, roomId, isHost]);

    // Scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Copy invite link
    const copyInviteLink = useCallback(() => {
        const link = `${window.location.origin}/read/${bookId}?room=${roomId}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [bookId, roomId]);

    // Send message
    const handleSendMessage = useCallback(() => {
        if (!newMessage.trim() || !user) return;

        const userName = profile?.displayName || user.displayName || 'Reader';
        sendRoomMessage(roomId, user.uid, userName, newMessage.trim());
        setNewMessage("");
    }, [newMessage, roomId, user, profile]);

    // Sync position (host only)
    const syncPosition = useCallback(() => {
        if (!isHost) return;
        updateReadingPosition(roomId, user?.uid || '', 100, currentCfi);
    }, [isHost, roomId, currentCfi]);

    if (!user) return null;

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
        >
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <h3>Live Reading</h3>
                    <span className={styles.bookTitle}>{bookTitle}</span>
                </div>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            {/* Invite Link */}
            <div className={styles.inviteSection}>
                <button className={styles.inviteBtn} onClick={copyInviteLink}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "Copied!" : "Copy Invite Link"}
                </button>
            </div>

            {/* Participants */}
            <div className={styles.participants}>
                <div className={styles.participantHeader}>
                    <Users size={16} />
                    <span>{participants.length} participants</span>
                </div>
                <div className={styles.participantList}>
                    {participants.map((p) => (
                        <div key={p.id} className={styles.participant}>
                            <div className={styles.participantAvatar}>
                                {p.avatar ? (
                                    <img src={p.avatar} alt="" />
                                ) : (
                                    <span>{p.name.charAt(0)}</span>
                                )}
                            </div>
                            <span className={styles.participantName}>{p.name}</span>
                            {p.isHost && <Crown size={14} className={styles.hostIcon} />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Sync Controls (Host only) */}
            {isHost && (
                <div className={styles.syncControls}>
                    <button
                        className={`${styles.syncBtn} ${syncMode ? styles.syncActive : ""}`}
                        onClick={() => {
                            setSyncMode(!syncMode);
                            if (!syncMode) syncPosition();
                        }}
                    >
                        <MapPin size={16} />
                        {syncMode ? "Syncing..." : "Sync Group"}
                    </button>
                </div>
            )}

            {/* Messages */}
            <div className={styles.messages}>
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`${styles.message} ${msg.userId === user.uid ? styles.ownMessage : ""}`}
                    >
                        <span className={styles.messageSender}>{msg.userName}</span>
                        <p className={styles.messageText}>{msg.message}</p>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className={styles.messageInput}>
                <input
                    type="text"
                    placeholder="Say something..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <button onClick={handleSendMessage}>
                    <Send size={18} />
                </button>
            </div>
        </motion.div>
    );
}
