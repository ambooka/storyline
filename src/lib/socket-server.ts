import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Types for real-time events
export interface User {
    id: string;
    name: string;
    avatar: string;
}

export interface ReadingPosition {
    bookId: string;
    roomId: string;
    userId: string;
    user: User;
    cfi: string; // ePub location
    paragraphIndex: number;
    percentage: number;
    timestamp: number;
}

export interface Reaction {
    id: string;
    bookId: string;
    roomId: string;
    userId: string;
    user: User;
    cfi: string;
    paragraphIndex: number;
    emoji: '🔥' | '❤️' | '🤯' | '💡' | '😢';
    timestamp: number;
}

export interface ChatMessage {
    id: string;
    roomId: string;
    userId: string;
    user: User;
    cfi?: string; // Optional: anchored to a passage
    paragraphIndex?: number;
    content: string;
    type: 'text' | 'voice';
    voiceUrl?: string;
    timestamp: number;
}

export interface Room {
    id: string;
    name: string;
    bookId: string;
    hostId: string;
    members: User[];
    isPrivate: boolean;
    syncMode: boolean; // If true, host controls everyone's page
    createdAt: number;
}

// Socket event types
export interface ServerToClientEvents {
    // Room events
    'room:joined': (room: Room) => void;
    'room:left': (roomId: string) => void;
    'room:member-joined': (user: User) => void;
    'room:member-left': (userId: string) => void;
    'room:updated': (room: Room) => void;

    // Reading position events
    'position:updated': (position: ReadingPosition) => void;
    'position:sync': (cfi: string) => void; // Sync mode: forced navigation

    // Reaction events
    'reaction:added': (reaction: Reaction) => void;
    'reaction:removed': (reactionId: string) => void;

    // Chat events
    'chat:message': (message: ChatMessage) => void;
    'chat:typing': (userId: string) => void;

    // Error events
    'error': (message: string) => void;
}

export interface ClientToServerEvents {
    // Auth event
    'auth': (user: User) => void;

    // Room events
    'room:create': (data: { name: string; bookId: string; isPrivate: boolean }) => void;
    'room:join': (roomId: string) => void;
    'room:leave': (roomId: string) => void;
    'room:toggle-sync': (roomId: string, enabled: boolean) => void;

    // Reading position events
    'position:update': (position: Omit<ReadingPosition, 'userId' | 'user' | 'timestamp'>) => void;

    // Reaction events
    'reaction:add': (data: Omit<Reaction, 'id' | 'userId' | 'user' | 'timestamp'>) => void;
    'reaction:remove': (reactionId: string) => void;

    // Chat events
    'chat:send': (data: Omit<ChatMessage, 'id' | 'userId' | 'user' | 'timestamp'>) => void;
    'chat:typing': (roomId: string) => void;
}

// In-memory storage (replace with Redis/Supabase in production)
const rooms = new Map<string, Room>();
const positions = new Map<string, ReadingPosition>(); // key: `${roomId}:${userId}`
const reactions = new Map<string, Reaction[]>(); // key: `${bookId}:${paragraphIndex}`

export function createSocketServer(httpServer: HTTPServer): SocketIOServer {
    const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
        cors: {
            origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
        },
        path: '/api/socket',
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Store user info on the socket
        let currentUser: User | null = null;
        let currentRoomId: string | null = null;

        // Set user info (from auth token in real app)
        socket.on('auth', (user: User) => {
            currentUser = user;
        });

        // Room: Create
        socket.on('room:create', ({ name, bookId, isPrivate }) => {
            if (!currentUser) {
                socket.emit('error', 'Not authenticated');
                return;
            }

            const roomId = crypto.randomUUID();
            const room: Room = {
                id: roomId,
                name,
                bookId,
                hostId: currentUser.id,
                members: [currentUser],
                isPrivate,
                syncMode: false,
                createdAt: Date.now(),
            };

            rooms.set(roomId, room);
            socket.join(roomId);
            currentRoomId = roomId;
            socket.emit('room:joined', room);
        });

        // Room: Join
        socket.on('room:join', (roomId) => {
            if (!currentUser) {
                socket.emit('error', 'Not authenticated');
                return;
            }

            const room = rooms.get(roomId);
            if (!room) {
                socket.emit('error', 'Room not found');
                return;
            }

            // Add user to room
            if (!room.members.find((m) => m.id === currentUser!.id)) {
                room.members.push(currentUser);
            }

            socket.join(roomId);
            currentRoomId = roomId;
            socket.emit('room:joined', room);
            socket.to(roomId).emit('room:member-joined', currentUser);
        });

        // Room: Leave
        socket.on('room:leave', (roomId) => {
            if (!currentUser) return;

            const room = rooms.get(roomId);
            if (room) {
                room.members = room.members.filter((m) => m.id !== currentUser!.id);
                if (room.members.length === 0) {
                    rooms.delete(roomId);
                }
            }

            socket.leave(roomId);
            currentRoomId = null;
            socket.to(roomId).emit('room:member-left', currentUser.id);
            socket.emit('room:left', roomId);
        });

        // Room: Toggle sync mode
        socket.on('room:toggle-sync', (roomId, enabled) => {
            if (!currentUser) return;

            const room = rooms.get(roomId);
            if (room && room.hostId === currentUser.id) {
                room.syncMode = enabled;
                io.to(roomId).emit('room:updated', room);
            }
        });

        // Position: Update
        socket.on('position:update', (data) => {
            if (!currentUser || !currentRoomId) return;

            const position: ReadingPosition = {
                ...data,
                userId: currentUser.id,
                user: currentUser,
                timestamp: Date.now(),
            };

            const key = `${data.roomId}:${currentUser.id}`;
            positions.set(key, position);

            // Broadcast to room
            socket.to(data.roomId).emit('position:updated', position);

            // If sync mode and user is host, force everyone to this position
            const room = rooms.get(data.roomId);
            if (room?.syncMode && room.hostId === currentUser.id) {
                socket.to(data.roomId).emit('position:sync', data.cfi);
            }
        });

        // Reaction: Add
        socket.on('reaction:add', (data) => {
            if (!currentUser) return;

            const reaction: Reaction = {
                id: crypto.randomUUID(),
                ...data,
                userId: currentUser.id,
                user: currentUser,
                timestamp: Date.now(),
            };

            const key = `${data.bookId}:${data.paragraphIndex}`;
            const existing = reactions.get(key) || [];
            existing.push(reaction);
            reactions.set(key, existing);

            // Broadcast to room
            io.to(data.roomId).emit('reaction:added', reaction);
        });

        // Reaction: Remove
        socket.on('reaction:remove', (reactionId) => {
            // Find and remove reaction
            for (const [key, reactionList] of reactions.entries()) {
                const index = reactionList.findIndex((r) => r.id === reactionId);
                if (index !== -1) {
                    const reaction = reactionList[index];
                    if (reaction.userId === currentUser?.id) {
                        reactionList.splice(index, 1);
                        io.to(reaction.roomId).emit('reaction:removed', reactionId);
                    }
                    break;
                }
            }
        });

        // Chat: Send message
        socket.on('chat:send', (data) => {
            if (!currentUser) return;

            const message: ChatMessage = {
                id: crypto.randomUUID(),
                ...data,
                userId: currentUser.id,
                user: currentUser,
                timestamp: Date.now(),
            };

            io.to(data.roomId).emit('chat:message', message);
        });

        // Chat: Typing indicator
        socket.on('chat:typing', (roomId) => {
            if (!currentUser) return;
            socket.to(roomId).emit('chat:typing', currentUser.id);
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);

            if (currentUser && currentRoomId) {
                const room = rooms.get(currentRoomId);
                if (room) {
                    room.members = room.members.filter((m) => m.id !== currentUser!.id);
                    io.to(currentRoomId).emit('room:member-left', currentUser.id);

                    if (room.members.length === 0) {
                        rooms.delete(currentRoomId);
                    }
                }
            }
        });
    });

    return io;
}

// Helper to get active rooms for a book
export function getRoomsForBook(bookId: string): Room[] {
    return Array.from(rooms.values()).filter(
        (room) => room.bookId === bookId && !room.isPrivate
    );
}

// Helper to get positions in a room
export function getPositionsInRoom(roomId: string): ReadingPosition[] {
    return Array.from(positions.entries())
        .filter(([key]) => key.startsWith(`${roomId}:`))
        .map(([, pos]) => pos);
}

// Helper to get reactions for a paragraph
export function getReactionsForParagraph(bookId: string, paragraphIndex: number): Reaction[] {
    const key = `${bookId}:${paragraphIndex}`;
    return reactions.get(key) || [];
}
