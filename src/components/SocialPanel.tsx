"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Users,
    Plus,
    Link as LinkIcon,
    Copy,
    Check,
    Lock,
    Globe,
    Play,
    Pause,
} from "lucide-react";
import { useSocialStore, getSocket, Room, User } from "@/lib/socket-client";
import styles from "./SocialPanel.module.css";

interface SocialPanelProps {
    isOpen: boolean;
    onClose: () => void;
    bookId: string;
    currentUser: User;
}

export default function SocialPanel({
    isOpen,
    onClose,
    bookId,
    currentUser,
}: SocialPanelProps) {
    const [view, setView] = useState<"rooms" | "room" | "create">("rooms");
    const [roomName, setRoomName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [copied, setCopied] = useState(false);
    const [availableRooms, setAvailableRooms] = useState<Room[]>([]);

    const { currentRoom, memberPositions, messages, typingUsers } = useSocialStore();
    const socket = getSocket();

    // Fetch available rooms for this book
    useEffect(() => {
        if (isOpen && !currentRoom) {
            // In production, fetch from API
            setAvailableRooms([
                {
                    id: "demo-1",
                    name: "Fantasy Lovers",
                    bookId,
                    hostId: "host-1",
                    members: [
                        { id: "1", name: "Sarah", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" },
                        { id: "2", name: "Mark", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mark" },
                    ],
                    isPrivate: false,
                    syncMode: false,
                    createdAt: Date.now(),
                },
            ]);
        }
    }, [isOpen, currentRoom, bookId]);

    const handleCreateRoom = () => {
        if (!roomName.trim()) return;

        socket.emit("room:create", {
            name: roomName,
            bookId,
            isPrivate,
        });

        setRoomName("");
        setIsPrivate(false);
        setView("room");
    };

    const handleJoinRoom = (roomId: string) => {
        socket.emit("room:join", roomId);
        setView("room");
    };

    const handleLeaveRoom = () => {
        if (currentRoom) {
            socket.emit("room:leave", currentRoom.id);
        }
        setView("rooms");
    };

    const handleToggleSync = () => {
        if (currentRoom && currentRoom.hostId === currentUser.id) {
            socket.emit("room:toggle-sync", currentRoom.id, !currentRoom.syncMode);
        }
    };

    const copyInviteLink = () => {
        if (currentRoom) {
            navigator.clipboard.writeText(
                `${window.location.origin}/read/${bookId}?room=${currentRoom.id}`
            );
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isHost = currentRoom?.hostId === currentUser.id;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className={styles.panel}
                    initial={{ opacity: 0, x: 300 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 300 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.headerTitle}>
                            <Users size={20} />
                            <span>{currentRoom ? currentRoom.name : "Reading Rooms"}</span>
                        </div>
                        <button className={styles.closeBtn} onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className={styles.content}>
                        {/* Rooms List View */}
                        {view === "rooms" && !currentRoom && (
                            <>
                                <button
                                    className={styles.createBtn}
                                    onClick={() => setView("create")}
                                >
                                    <Plus size={18} />
                                    Create Room
                                </button>

                                <div className={styles.roomsList}>
                                    <div className={styles.sectionLabel}>Available Rooms</div>
                                    {availableRooms.length === 0 ? (
                                        <p className={styles.emptyText}>
                                            No public rooms for this book yet. Create one!
                                        </p>
                                    ) : (
                                        availableRooms.map((room) => (
                                            <div
                                                key={room.id}
                                                className={styles.roomCard}
                                                onClick={() => handleJoinRoom(room.id)}
                                            >
                                                <div className={styles.roomInfo}>
                                                    <span className={styles.roomName}>{room.name}</span>
                                                    <span className={styles.roomMembers}>
                                                        {room.members.length} reading
                                                    </span>
                                                </div>
                                                <div className={styles.roomAvatars}>
                                                    {room.members.slice(0, 3).map((m, i) => (
                                                        <img
                                                            key={m.id}
                                                            src={m.avatar}
                                                            alt={m.name}
                                                            className={styles.roomAvatar}
                                                            style={{ zIndex: 3 - i }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}

                        {/* Create Room View */}
                        {view === "create" && (
                            <div className={styles.createForm}>
                                <button
                                    className={styles.backBtn}
                                    onClick={() => setView("rooms")}
                                >
                                    ← Back
                                </button>

                                <div className={styles.inputGroup}>
                                    <label>Room Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Fantasy Lovers"
                                        value={roomName}
                                        onChange={(e) => setRoomName(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>

                                <div className={styles.toggleGroup}>
                                    <button
                                        className={`${styles.toggleBtn} ${!isPrivate ? styles.active : ""}`}
                                        onClick={() => setIsPrivate(false)}
                                    >
                                        <Globe size={16} />
                                        Public
                                    </button>
                                    <button
                                        className={`${styles.toggleBtn} ${isPrivate ? styles.active : ""}`}
                                        onClick={() => setIsPrivate(true)}
                                    >
                                        <Lock size={16} />
                                        Private
                                    </button>
                                </div>

                                <button
                                    className={styles.submitBtn}
                                    onClick={handleCreateRoom}
                                    disabled={!roomName.trim()}
                                >
                                    Create Room
                                </button>
                            </div>
                        )}

                        {/* Active Room View */}
                        {currentRoom && (
                            <>
                                {/* Room Controls */}
                                <div className={styles.roomControls}>
                                    <button
                                        className={styles.inviteBtn}
                                        onClick={copyInviteLink}
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                        {copied ? "Copied!" : "Copy Invite Link"}
                                    </button>

                                    {isHost && (
                                        <button
                                            className={`${styles.syncBtn} ${currentRoom.syncMode ? styles.active : ""}`}
                                            onClick={handleToggleSync}
                                        >
                                            {currentRoom.syncMode ? <Pause size={16} /> : <Play size={16} />}
                                            {currentRoom.syncMode ? "Sync On" : "Sync Off"}
                                        </button>
                                    )}
                                </div>

                                {/* Members List */}
                                <div className={styles.membersList}>
                                    <div className={styles.sectionLabel}>
                                        Reading Now ({currentRoom.members.length})
                                    </div>
                                    {currentRoom.members.map((member) => {
                                        const position = memberPositions.get(member.id);
                                        return (
                                            <div key={member.id} className={styles.memberCard}>
                                                <img
                                                    src={member.avatar}
                                                    alt={member.name}
                                                    className={styles.memberAvatar}
                                                />
                                                <div className={styles.memberInfo}>
                                                    <span className={styles.memberName}>
                                                        {member.name}
                                                        {member.id === currentRoom.hostId && (
                                                            <span className={styles.hostBadge}>Host</span>
                                                        )}
                                                    </span>
                                                    <span className={styles.memberPosition}>
                                                        {position
                                                            ? `${position.percentage}% • Paragraph ${position.paragraphIndex}`
                                                            : "Starting..."}
                                                    </span>
                                                </div>
                                                {member.id !== currentUser.id && (
                                                    <button
                                                        className={styles.jumpBtn}
                                                        onClick={() => {
                                                            if (position) {
                                                                window.dispatchEvent(
                                                                    new CustomEvent("storyline:jump-to", {
                                                                        detail: { cfi: position.cfi },
                                                                    })
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        Jump to
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Chat */}
                                <div className={styles.chatSection}>
                                    <div className={styles.sectionLabel}>Discussion</div>
                                    <div className={styles.chatMessages}>
                                        {messages.length === 0 ? (
                                            <p className={styles.emptyText}>
                                                Start the conversation!
                                            </p>
                                        ) : (
                                            messages.slice(-20).map((msg) => (
                                                <div key={msg.id} className={styles.chatMessage}>
                                                    <img
                                                        src={msg.user.avatar}
                                                        alt=""
                                                        className={styles.chatAvatar}
                                                    />
                                                    <div className={styles.chatContent}>
                                                        <span className={styles.chatUser}>{msg.user.name}</span>
                                                        <p className={styles.chatText}>{msg.content}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    {typingUsers.length > 0 && (
                                        <div className={styles.typing}>
                                            Someone is typing...
                                        </div>
                                    )}
                                </div>

                                {/* Leave Room */}
                                <button className={styles.leaveBtn} onClick={handleLeaveRoom}>
                                    Leave Room
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
