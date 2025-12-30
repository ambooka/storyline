"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Share2, Copy, Check, X } from "lucide-react";
import styles from "./QuickStartRoom.module.css";

interface QuickStartRoomProps {
    bookId: string;
    bookTitle: string;
    onRoomCreated: (roomId: string, isHost: boolean) => void;
    onClose: () => void;
}

export function QuickStartRoom({
    bookId,
    bookTitle,
    onRoomCreated,
    onClose,
}: QuickStartRoomProps) {
    const [mode, setMode] = useState<"choice" | "create" | "join">("choice");
    const [roomCode, setRoomCode] = useState("");
    const [generatedCode, setGeneratedCode] = useState("");
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");

    const generateRoomCode = useCallback(() => {
        // Generate 6-char readable code
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }, []);

    const handleCreateRoom = useCallback(() => {
        const code = generateRoomCode();
        setGeneratedCode(code);
        setMode("create");
        // Room ID combines book ID and code for uniqueness
        const roomId = `${bookId}-${code}`;
        // Store in localStorage for persistence
        localStorage.setItem(`room_${code}`, JSON.stringify({
            roomId,
            bookId,
            bookTitle,
            createdAt: Date.now(),
        }));
    }, [bookId, bookTitle, generateRoomCode]);

    const handleCopyCode = useCallback(() => {
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [generatedCode]);

    const handleStartRoom = useCallback(() => {
        const roomId = `${bookId}-${generatedCode}`;
        onRoomCreated(roomId, true);
    }, [bookId, generatedCode, onRoomCreated]);

    const handleJoinRoom = useCallback(() => {
        const code = roomCode.toUpperCase().trim();
        if (code.length !== 6) {
            setError("Room code must be 6 characters");
            return;
        }

        // Check if room exists (in localStorage for demo)
        const stored = localStorage.getItem(`room_${code}`);
        if (!stored) {
            setError("Room not found. Check the code and try again.");
            return;
        }

        const { roomId } = JSON.parse(stored);
        onRoomCreated(roomId, false);
    }, [roomCode, onRoomCreated]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <Users size={20} />
                    <span>Read Together</span>
                </div>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={18} />
                </button>
            </div>

            <p className={styles.bookName}>{bookTitle}</p>

            <AnimatePresence mode="wait">
                {mode === "choice" && (
                    <motion.div
                        key="choice"
                        className={styles.choiceGrid}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <button
                            className={styles.choiceBtn}
                            onClick={handleCreateRoom}
                        >
                            <div className={styles.choiceIcon}>
                                <Plus size={24} />
                            </div>
                            <span className={styles.choiceTitle}>Create Room</span>
                            <span className={styles.choiceDesc}>
                                Start a new reading session and invite friends
                            </span>
                        </button>

                        <button
                            className={styles.choiceBtn}
                            onClick={() => setMode("join")}
                        >
                            <div className={styles.choiceIcon}>
                                <Share2 size={24} />
                            </div>
                            <span className={styles.choiceTitle}>Join Room</span>
                            <span className={styles.choiceDesc}>
                                Enter a code to join an existing session
                            </span>
                        </button>
                    </motion.div>
                )}

                {mode === "create" && (
                    <motion.div
                        key="create"
                        className={styles.createPanel}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <p className={styles.createLabel}>Your Room Code</p>
                        <div className={styles.codeDisplay}>
                            {generatedCode.split("").map((char, i) => (
                                <span key={i} className={styles.codeChar}>
                                    {char}
                                </span>
                            ))}
                        </div>

                        <button
                            className={styles.copyBtn}
                            onClick={handleCopyCode}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? "Copied!" : "Copy Code"}
                        </button>

                        <p className={styles.shareHint}>
                            Share this code with friends so they can join your reading session
                        </p>

                        <button
                            className={styles.startBtn}
                            onClick={handleStartRoom}
                        >
                            Start Reading Together
                        </button>

                        <button
                            className={styles.backLink}
                            onClick={() => setMode("choice")}
                        >
                            ← Back
                        </button>
                    </motion.div>
                )}

                {mode === "join" && (
                    <motion.div
                        key="join"
                        className={styles.joinPanel}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <p className={styles.joinLabel}>Enter Room Code</p>
                        <input
                            type="text"
                            value={roomCode}
                            onChange={(e) => {
                                setRoomCode(e.target.value.toUpperCase());
                                setError("");
                            }}
                            placeholder="XXXXXX"
                            maxLength={6}
                            className={styles.codeInput}
                            autoFocus
                        />

                        {error && <p className={styles.error}>{error}</p>}

                        <button
                            className={styles.joinBtn}
                            onClick={handleJoinRoom}
                            disabled={roomCode.length !== 6}
                        >
                            Join Room
                        </button>

                        <button
                            className={styles.backLink}
                            onClick={() => setMode("choice")}
                        >
                            ← Back
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
