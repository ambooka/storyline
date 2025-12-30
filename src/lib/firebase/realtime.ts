// Firebase Realtime Database - Collaborative Reading
"use client";

import {
    ref,
    set,
    get,
    push,
    update,
    remove,
    onValue,
    onChildAdded,
    onChildChanged,
    onChildRemoved,
    serverTimestamp,
    DataSnapshot,
} from "firebase/database";
import { getRealtimeDB } from "./config";

// ========== Types ==========

export interface ReadingRoom {
    id: string;
    hostId: string;
    hostName: string;
    bookId: string;
    bookTitle: string;
    bookCover?: string;
    isActive: boolean;
    isPublic: boolean;
    maxParticipants: number;
    createdAt: number;
}

export interface Participant {
    id: string;
    name: string;
    avatar?: string;
    position: number; // Progress percentage
    cursor: string; // CFI location
    isActive: boolean;
    lastSeen: number;
    color: string; // Unique color for cursor
}

export interface LiveReaction {
    id: string;
    userId: string;
    userName: string;
    emoji: string;
    passage: string;
    cfi: string;
    timestamp: number;
}

export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    message: string;
    timestamp: number;
    type: "text" | "reaction" | "system";
}

// ========== Room Management ==========

// Create a new reading room
export async function createReadingRoom(room: Omit<ReadingRoom, "id" | "createdAt">): Promise<string | null> {
    const rtdb = getRealtimeDB();
    if (!rtdb) return null;

    try {
        const roomsRef = ref(rtdb, "rooms");
        const newRoomRef = push(roomsRef);
        const roomId = newRoomRef.key;

        if (!roomId) return null;

        await set(newRoomRef, {
            ...room,
            id: roomId,
            createdAt: serverTimestamp(),
        });

        return roomId;
    } catch (error) {
        console.error("Error creating room:", error);
        return null;
    }
}

// Join a reading room
export async function joinReadingRoom(roomId: string, participant: Omit<Participant, "lastSeen">): Promise<boolean> {
    const rtdb = getRealtimeDB();
    if (!rtdb) return false;

    try {
        const participantRef = ref(rtdb, `rooms/${roomId}/participants/${participant.id}`);
        await set(participantRef, {
            ...participant,
            lastSeen: serverTimestamp(),
        });
        return true;
    } catch (error) {
        console.error("Error joining room:", error);
        return false;
    }
}

// Leave a reading room
export async function leaveReadingRoom(roomId: string, participantId: string): Promise<void> {
    const rtdb = getRealtimeDB();
    if (!rtdb) return;

    try {
        const participantRef = ref(rtdb, `rooms/${roomId}/participants/${participantId}`);
        await remove(participantRef);
    } catch (error) {
        console.error("Error leaving room:", error);
    }
}

// Update reading position
export async function updateReadingPosition(
    roomId: string,
    participantId: string,
    position: number,
    cursor: string
): Promise<void> {
    const rtdb = getRealtimeDB();
    if (!rtdb) return;

    try {
        const participantRef = ref(rtdb, `rooms/${roomId}/participants/${participantId}`);
        await update(participantRef, {
            position,
            cursor,
            lastSeen: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error updating position:", error);
    }
}

// ========== Live Reactions ==========

// Send a live reaction
export async function sendReaction(roomId: string, reaction: Omit<LiveReaction, "id" | "timestamp">): Promise<void> {
    const rtdb = getRealtimeDB();
    if (!rtdb) return;

    try {
        const reactionsRef = ref(rtdb, `rooms/${roomId}/reactions`);
        const newReactionRef = push(reactionsRef);
        await set(newReactionRef, {
            ...reaction,
            id: newReactionRef.key,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error sending reaction:", error);
    }
}

// ========== Chat ==========

// Send a chat message
export async function sendChatMessage(roomId: string, message: Omit<ChatMessage, "id" | "timestamp">): Promise<void> {
    const rtdb = getRealtimeDB();
    if (!rtdb) return;

    try {
        const chatRef = ref(rtdb, `rooms/${roomId}/chat`);
        const newMessageRef = push(chatRef);
        await set(newMessageRef, {
            ...message,
            id: newMessageRef.key,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error sending message:", error);
    }
}

// ========== Real-time Listeners ==========

// Listen to room changes
export function onRoomChange(roomId: string, callback: (room: ReadingRoom | null) => void): () => void {
    const rtdb = getRealtimeDB();
    if (!rtdb) return () => { };

    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot: DataSnapshot) => {
        callback(snapshot.val());
    });

    return unsubscribe;
}

// Listen to participants
export function onParticipantsChange(
    roomId: string,
    callback: (participants: Record<string, Participant>) => void
): () => void {
    const rtdb = getRealtimeDB();
    if (!rtdb) return () => { };

    const participantsRef = ref(rtdb, `rooms/${roomId}/participants`);
    const unsubscribe = onValue(participantsRef, (snapshot: DataSnapshot) => {
        callback(snapshot.val() || {});
    });

    return unsubscribe;
}

// Listen to new reactions
export function onNewReaction(roomId: string, callback: (reaction: LiveReaction) => void): () => void {
    const rtdb = getRealtimeDB();
    if (!rtdb) return () => { };

    const reactionsRef = ref(rtdb, `rooms/${roomId}/reactions`);
    const unsubscribe = onChildAdded(reactionsRef, (snapshot: DataSnapshot) => {
        callback(snapshot.val());
    });

    return unsubscribe;
}

// Listen to chat messages
export function onChatMessage(roomId: string, callback: (message: ChatMessage) => void): () => void {
    const rtdb = getRealtimeDB();
    if (!rtdb) return () => { };

    const chatRef = ref(rtdb, `rooms/${roomId}/chat`);
    const unsubscribe = onChildAdded(chatRef, (snapshot: DataSnapshot) => {
        callback(snapshot.val());
    });

    return unsubscribe;
}

// ========== Public Rooms ==========

// Get list of public rooms
export async function getPublicRooms(): Promise<ReadingRoom[]> {
    const rtdb = getRealtimeDB();
    if (!rtdb) return [];

    try {
        const roomsRef = ref(rtdb, "rooms");
        const snapshot = await get(roomsRef);
        const rooms: ReadingRoom[] = [];

        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const room = child.val();
                if (room.isPublic && room.isActive) {
                    rooms.push(room);
                }
            });
        }

        return rooms;
    } catch (error) {
        console.error("Error getting public rooms:", error);
        return [];
    }
}

// Listen to public rooms
export function onPublicRoomsChange(callback: (rooms: ReadingRoom[]) => void): () => void {
    const rtdb = getRealtimeDB();
    if (!rtdb) return () => { };

    const roomsRef = ref(rtdb, "rooms");
    const unsubscribe = onValue(roomsRef, (snapshot: DataSnapshot) => {
        const rooms: ReadingRoom[] = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const room = child.val();
                if (room.isPublic && room.isActive) {
                    rooms.push(room);
                }
            });
        }
        callback(rooms);
    });

    return unsubscribe;
}

// Participant colors for cursors
export const PARTICIPANT_COLORS = [
    "#FF6B6B", // Red
    "#4ECDC4", // Teal
    "#45B7D1", // Blue
    "#96CEB4", // Green
    "#FFEAA7", // Yellow
    "#DDA0DD", // Plum
    "#98D8C8", // Mint
    "#F7DC6F", // Gold
];

export function getParticipantColor(index: number): string {
    return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
}

// ========== Compatibility exports for LiveReadingRoom ==========

// Send room message (wrapper for sendChatMessage)
export async function sendRoomMessage(
    roomId: string,
    userId: string,
    userName: string,
    message: string
): Promise<void> {
    await sendChatMessage(roomId, {
        userId,
        userName,
        message,
        type: "text",
    });
}

// Subscribe to room
export function subscribeToRoom(
    roomId: string,
    callback: (room: ReadingRoom | null) => void
): () => void {
    return onRoomChange(roomId, callback);
}

// Subscribe to messages
export function subscribeToMessages(
    roomId: string,
    callback: (messages: ChatMessage[]) => void
): () => void {
    const rtdb = getRealtimeDB();
    if (!rtdb) return () => { };

    const chatRef = ref(rtdb, `rooms/${roomId}/chat`);
    const unsubscribe = onValue(chatRef, (snapshot: DataSnapshot) => {
        const messages: ChatMessage[] = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                messages.push(child.val());
            });
        }
        callback(messages.sort((a, b) => a.timestamp - b.timestamp));
    });

    return unsubscribe;
}

// Subscribe to participants
export function subscribeToParticipants(
    roomId: string,
    callback: (participants: Participant[]) => void
): () => void {
    const rtdb = getRealtimeDB();
    if (!rtdb) return () => { };

    const participantsRef = ref(rtdb, `rooms/${roomId}/participants`);
    const unsubscribe = onValue(participantsRef, (snapshot: DataSnapshot) => {
        const participants: Participant[] = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                participants.push(child.val());
            });
        }
        callback(participants);
    });

    return unsubscribe;
}
