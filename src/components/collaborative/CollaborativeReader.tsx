"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    MessageCircle,
    Share2,
    X,
    Send,
    Smile,
    Copy,
    ExternalLink,
} from "lucide-react";
import {
    ReadingRoom,
    Participant,
    ChatMessage,
    LiveReaction,
    createReadingRoom,
    joinReadingRoom,
    leaveReadingRoom,
    updateReadingPosition,
    sendReaction,
    sendChatMessage,
    onParticipantsChange,
    onChatMessage,
    onNewReaction,
    getParticipantColor,
} from "@/lib/firebase/realtime";
import { getCurrentUser } from "@/lib/firebase/auth";
import styles from "./CollaborativeReader.module.css";

const REACTION_EMOJIS = ["❤️", "😮", "😢", "😂", "🤔", "🔥", "👏", "💡"];

interface CollaborativeReaderProps {
    bookId: string;
    bookTitle: string;
    bookCover?: string;
    currentPosition: number;
    currentCfi: string;
    selectedText?: string;
    onPositionChange?: (position: number, cfi: string) => void;
}

export function CollaborativeReader({
    bookId,
    bookTitle,
    bookCover,
    currentPosition,
    currentCfi,
    selectedText,
    onPositionChange,
}: CollaborativeReaderProps) {
    const [roomId, setRoomId] = useState<string | null>(null);
    const [room, setRoom] = useState<ReadingRoom | null>(null);
    const [participants, setParticipants] = useState<Record<string, Participant>>({});
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [reactions, setReactions] = useState<LiveReaction[]>([]);
    const [showChat, setShowChat] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [messageInput, setMessageInput] = useState("");
    const [isHost, setIsHost] = useState(false);
    const [inviteLink, setInviteLink] = useState("");

    const user = getCurrentUser();
    const participantCount = Object.keys(participants).length;

    // Create or join room
    const handleCreateRoom = useCallback(async () => {
        if (!user) return;

        const newRoomId = await createReadingRoom({
            hostId: user.uid,
            hostName: user.displayName || "Anonymous",
            bookId,
            bookTitle,
            bookCover,
            isActive: true,
            isPublic: true,
            maxParticipants: 10,
        });

        if (newRoomId) {
            setRoomId(newRoomId);
            setIsHost(true);
            setInviteLink(`${window.location.origin}/read/${bookId}?room=${newRoomId}`);

            // Join as participant
            await joinReadingRoom(newRoomId, {
                id: user.uid,
                name: user.displayName || "Anonymous",
                avatar: user.photoURL || undefined,
                position: currentPosition,
                cursor: currentCfi,
                isActive: true,
                color: getParticipantColor(0),
            });
        }
    }, [user, bookId, bookTitle, bookCover, currentPosition, currentCfi]);

    // Join existing room
    const handleJoinRoom = useCallback(async (targetRoomId: string) => {
        if (!user) return;

        const joined = await joinReadingRoom(targetRoomId, {
            id: user.uid,
            name: user.displayName || "Anonymous",
            avatar: user.photoURL || undefined,
            position: currentPosition,
            cursor: currentCfi,
            isActive: true,
            color: getParticipantColor(participantCount),
        });

        if (joined) {
            setRoomId(targetRoomId);
        }
    }, [user, currentPosition, currentCfi, participantCount]);

    // Leave room
    const handleLeaveRoom = useCallback(async () => {
        if (!roomId || !user) return;
        await leaveReadingRoom(roomId, user.uid);
        setRoomId(null);
        setRoom(null);
        setParticipants({});
        setMessages([]);
        setIsHost(false);
    }, [roomId, user]);

    // Update position when reading changes
    useEffect(() => {
        if (!roomId || !user) return;
        updateReadingPosition(roomId, user.uid, currentPosition, currentCfi);
    }, [roomId, user, currentPosition, currentCfi]);

    // Listen to participants
    useEffect(() => {
        if (!roomId) return;
        const unsubscribe = onParticipantsChange(roomId, setParticipants);
        return unsubscribe;
    }, [roomId]);

    // Listen to chat
    useEffect(() => {
        if (!roomId) return;
        const unsubscribe = onChatMessage(roomId, (msg) => {
            setMessages((prev) => [...prev.slice(-99), msg]);
        });
        return unsubscribe;
    }, [roomId]);

    // Listen to reactions
    useEffect(() => {
        if (!roomId) return;
        const unsubscribe = onNewReaction(roomId, (reaction) => {
            setReactions((prev) => [...prev.slice(-49), reaction]);
            // Auto-remove after 5 seconds
            setTimeout(() => {
                setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
            }, 5000);
        });
        return unsubscribe;
    }, [roomId]);

    // Check for room ID in URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlRoomId = params.get("room");
        if (urlRoomId && !roomId) {
            handleJoinRoom(urlRoomId);
        }
    }, [handleJoinRoom, roomId]);

    // Send chat message
    const handleSendMessage = useCallback(async () => {
        if (!roomId || !user || !messageInput.trim()) return;

        await sendChatMessage(roomId, {
            userId: user.uid,
            userName: user.displayName || "Anonymous",
            userAvatar: user.photoURL || undefined,
            message: messageInput.trim(),
            type: "text",
        });

        setMessageInput("");
    }, [roomId, user, messageInput]);

    // Send reaction
    const handleSendReaction = useCallback(async (emoji: string) => {
        if (!roomId || !user) return;

        await sendReaction(roomId, {
            userId: user.uid,
            userName: user.displayName || "Anonymous",
            emoji,
            passage: selectedText?.slice(0, 100) || "",
            cfi: currentCfi,
        });

        setShowReactions(false);
    }, [roomId, user, selectedText, currentCfi]);

    // Copy invite link
    const handleCopyLink = useCallback(() => {
        navigator.clipboard.writeText(inviteLink);
    }, [inviteLink]);

    if (!user) {
        return (
            <div className={styles.loginPrompt}>
                <Users size={24} />
                <p>Sign in to read together with friends</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Floating participants indicator */}
            {roomId && (
                <motion.div
                    className={styles.participantsBar}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className={styles.participantAvatars}>
                        {Object.values(participants).slice(0, 5).map((p, i) => (
                            <div
                                key={p.id}
                                className={styles.participantAvatar}
                                style={{ borderColor: p.color, zIndex: 5 - i }}
                                title={p.name}
                            >
                                {p.avatar ? (
                                    <img src={p.avatar} alt={p.name} />
                                ) : (
                                    <span>{p.name.charAt(0)}</span>
                                )}
                            </div>
                        ))}
                        {participantCount > 5 && (
                            <div className={styles.participantMore}>
                                +{participantCount - 5}
                            </div>
                        )}
                    </div>

                    <button className={styles.chatBtn} onClick={() => setShowChat(!showChat)}>
                        <MessageCircle size={18} />
                        {messages.length > 0 && <span className={styles.badge}>{messages.length}</span>}
                    </button>

                    <button className={styles.reactionBtn} onClick={() => setShowReactions(!showReactions)}>
                        <Smile size={18} />
                    </button>

                    <button className={styles.shareBtn} onClick={handleCopyLink} title="Copy invite link">
                        <Share2 size={18} />
                    </button>

                    <button className={styles.leaveBtn} onClick={handleLeaveRoom}>
                        <X size={18} />
                    </button>
                </motion.div>
            )}

            {/* Start session button */}
            {!roomId && (
                <motion.button
                    className={styles.startBtn}
                    onClick={handleCreateRoom}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Users size={20} />
                    Read Together
                </motion.button>
            )}

            {/* Reaction picker */}
            <AnimatePresence>
                {showReactions && (
                    <motion.div
                        className={styles.reactionPicker}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        {REACTION_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                className={styles.emojiBtn}
                                onClick={() => handleSendReaction(emoji)}
                            >
                                {emoji}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Live reactions floating */}
            <div className={styles.floatingReactions}>
                <AnimatePresence>
                    {reactions.map((reaction) => (
                        <motion.div
                            key={reaction.id}
                            className={styles.floatingReaction}
                            initial={{ opacity: 0, y: 20, scale: 0.5 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.5 }}
                        >
                            <span className={styles.reactionEmoji}>{reaction.emoji}</span>
                            <span className={styles.reactionUser}>{reaction.userName}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Chat sidebar */}
            <AnimatePresence>
                {showChat && roomId && (
                    <motion.div
                        className={styles.chatSidebar}
                        initial={{ x: 300 }}
                        animate={{ x: 0 }}
                        exit={{ x: 300 }}
                    >
                        <div className={styles.chatHeader}>
                            <h3>Reading Room Chat</h3>
                            <button onClick={() => setShowChat(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className={styles.chatMessages}>
                            {messages.length === 0 ? (
                                <p className={styles.noMessages}>No messages yet. Start the conversation!</p>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`${styles.chatMessage} ${msg.userId === user.uid ? styles.ownMessage : ""}`}
                                    >
                                        <div className={styles.messageHeader}>
                                            <span className={styles.messageName}>{msg.userName}</span>
                                        </div>
                                        <p className={styles.messageText}>{msg.message}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <form className={styles.chatInput} onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                            />
                            <button type="submit" disabled={!messageInput.trim()}>
                                <Send size={18} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Participant cursors overlay */}
            {roomId && Object.values(participants).filter((p) => p.id !== user.uid).map((participant) => (
                <div
                    key={participant.id}
                    className={styles.participantCursor}
                    style={{
                        top: `${participant.position}%`,
                        borderColor: participant.color,
                        backgroundColor: `${participant.color}20`,
                    }}
                >
                    <span style={{ backgroundColor: participant.color }}>{participant.name}</span>
                </div>
            ))}
        </div>
    );
}
