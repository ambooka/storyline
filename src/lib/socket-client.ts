'use client';

import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';
import type {
    User,
    Room,
    ReadingPosition,
    Reaction,
    ChatMessage,
    ServerToClientEvents,
    ClientToServerEvents,
} from './socket-server';

// Re-export types for convenience
export type { User, Room, ReadingPosition, Reaction, ChatMessage };

// Socket instance (singleton)
let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

// Get or create socket connection
export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
            path: '/api/socket',
            autoConnect: false,
        });
    }
    return socket;
}

// Connect with user authentication
export function connectSocket(user: User): void {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
        s.emit('auth' as keyof ClientToServerEvents, user as never);
    }
}

// Disconnect socket
export function disconnectSocket(): void {
    if (socket?.connected) {
        socket.disconnect();
    }
}

// ========== Zustand Store for Real-time State ==========
interface SocialState {
    // Connection
    isConnected: boolean;
    currentUser: User | null;

    // Room
    currentRoom: Room | null;
    availableRooms: Room[];

    // Positions (ghost avatars)
    memberPositions: Map<string, ReadingPosition>;

    // Reactions
    reactions: Map<string, Reaction[]>; // key: paragraphIndex

    // Chat
    messages: ChatMessage[];
    typingUsers: string[];

    // Actions
    setCurrentUser: (user: User) => void;
    setConnected: (connected: boolean) => void;
    setCurrentRoom: (room: Room | null) => void;
    updateMemberPosition: (position: ReadingPosition) => void;
    removeMember: (userId: string) => void;
    addReaction: (reaction: Reaction) => void;
    removeReaction: (reactionId: string) => void;
    addMessage: (message: ChatMessage) => void;
    setTypingUser: (userId: string) => void;
    clearTypingUser: (userId: string) => void;
    reset: () => void;
}

export const useSocialStore = create<SocialState>((set, get) => ({
    isConnected: false,
    currentUser: null,
    currentRoom: null,
    availableRooms: [],
    memberPositions: new Map(),
    reactions: new Map(),
    messages: [],
    typingUsers: [],

    setCurrentUser: (user) => set({ currentUser: user }),
    setConnected: (connected) => set({ isConnected: connected }),
    setCurrentRoom: (room) => set({ currentRoom: room }),

    updateMemberPosition: (position) => {
        const positions = new Map(get().memberPositions);
        positions.set(position.userId, position);
        set({ memberPositions: positions });
    },

    removeMember: (userId) => {
        const positions = new Map(get().memberPositions);
        positions.delete(userId);
        set({ memberPositions: positions });

        // Also update room members if we have a room
        const room = get().currentRoom;
        if (room) {
            set({
                currentRoom: {
                    ...room,
                    members: room.members.filter((m) => m.id !== userId),
                },
            });
        }
    },

    addReaction: (reaction) => {
        const reactions = new Map(get().reactions);
        const key = String(reaction.paragraphIndex);
        const existing = reactions.get(key) || [];
        reactions.set(key, [...existing, reaction]);
        set({ reactions });
    },

    removeReaction: (reactionId) => {
        const reactions = new Map(get().reactions);
        for (const [key, list] of reactions.entries()) {
            const filtered = list.filter((r) => r.id !== reactionId);
            if (filtered.length !== list.length) {
                reactions.set(key, filtered);
                break;
            }
        }
        set({ reactions });
    },

    addMessage: (message) => {
        set({ messages: [...get().messages, message] });
    },

    setTypingUser: (userId) => {
        if (!get().typingUsers.includes(userId)) {
            set({ typingUsers: [...get().typingUsers, userId] });
        }
        // Auto-clear after 3 seconds
        setTimeout(() => get().clearTypingUser(userId), 3000);
    },

    clearTypingUser: (userId) => {
        set({ typingUsers: get().typingUsers.filter((id) => id !== userId) });
    },

    reset: () =>
        set({
            isConnected: false,
            currentRoom: null,
            memberPositions: new Map(),
            reactions: new Map(),
            messages: [],
            typingUsers: [],
        }),
}));

// ========== Socket Event Handlers (call once on app init) ==========
export function initSocketListeners(): void {
    const s = getSocket();
    const store = useSocialStore.getState();

    s.on('connect', () => {
        useSocialStore.setState({ isConnected: true });
    });

    s.on('disconnect', () => {
        useSocialStore.setState({ isConnected: false });
    });

    // Room events
    s.on('room:joined', (room) => {
        useSocialStore.setState({ currentRoom: room });
    });

    s.on('room:left', () => {
        useSocialStore.setState({ currentRoom: null, memberPositions: new Map() });
    });

    s.on('room:member-joined', (user) => {
        const room = useSocialStore.getState().currentRoom;
        if (room && !room.members.find((m) => m.id === user.id)) {
            useSocialStore.setState({
                currentRoom: { ...room, members: [...room.members, user] },
            });
        }
    });

    s.on('room:member-left', (userId) => {
        useSocialStore.getState().removeMember(userId);
    });

    s.on('room:updated', (room) => {
        useSocialStore.setState({ currentRoom: room });
    });

    // Position events
    s.on('position:updated', (position) => {
        useSocialStore.getState().updateMemberPosition(position);
    });

    s.on('position:sync', (cfi) => {
        // Dispatch custom event for reader to handle
        window.dispatchEvent(new CustomEvent('storyline:sync-position', { detail: { cfi } }));
    });

    // Reaction events
    s.on('reaction:added', (reaction) => {
        useSocialStore.getState().addReaction(reaction);
    });

    s.on('reaction:removed', (reactionId) => {
        useSocialStore.getState().removeReaction(reactionId);
    });

    // Chat events
    s.on('chat:message', (message) => {
        useSocialStore.getState().addMessage(message);
    });

    s.on('chat:typing', (userId) => {
        useSocialStore.getState().setTypingUser(userId);
    });

    s.on('error', (message) => {
        console.error('Socket error:', message);
    });
}

// ========== Helper Hooks ==========
export function useSocket() {
    return getSocket();
}

export function useSocialConnection(user: User | null) {
    const { isConnected, setCurrentUser } = useSocialStore();

    // Connect when user is available
    if (user && !isConnected) {
        setCurrentUser(user);
        connectSocket(user);
        initSocketListeners();
    }

    return { isConnected };
}
