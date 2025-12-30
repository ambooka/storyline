// User Profile and Gamification Types

export interface UserProfile {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    bio: string;

    // Stats
    stats: UserStats;

    // Achievements
    badges: Badge[];
    currentStreak: number;
    longestStreak: number;

    // Social
    following: string[];
    followers: string[];

    // Preferences
    favoriteGenres: string[];
    readingGoal: ReadingGoal;

    createdAt: Date;
    lastActive: Date;
}

export interface UserStats {
    booksRead: number;
    booksInProgress: number;
    pagesRead: number;
    minutesRead: number;
    highlightsCreated: number;
    reactionsGiven: number;
    roomsJoined: number;
    voiceNotesRecorded: number;
}

export interface ReadingGoal {
    type: 'daily' | 'weekly' | 'yearly';
    target: number; // pages or minutes or books
    metric: 'pages' | 'minutes' | 'books';
    current: number;
    startDate: Date;
    endDate?: Date;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: BadgeCategory;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    unlockedAt?: Date;
    progress?: number; // 0-100 for locked badges
}

export type BadgeCategory =
    | 'reading'      // Related to reading achievements
    | 'social'       // Related to social features
    | 'streak'       // Related to streaks
    | 'milestone'    // Major milestones
    | 'special';     // Special/limited time badges

// Predefined badges
export const BADGES: Omit<Badge, 'unlockedAt' | 'progress'>[] = [
    // Reading Badges
    {
        id: 'first-book',
        name: 'First Story',
        description: 'Finished your first book',
        icon: '📖',
        category: 'reading',
        tier: 'bronze',
    },
    {
        id: 'bookworm',
        name: 'Bookworm',
        description: 'Read 10 books',
        icon: '🐛',
        category: 'reading',
        tier: 'silver',
    },
    {
        id: 'bibliophile',
        name: 'Bibliophile',
        description: 'Read 50 books',
        icon: '📚',
        category: 'reading',
        tier: 'gold',
    },
    {
        id: 'literary-legend',
        name: 'Literary Legend',
        description: 'Read 100 books',
        icon: '👑',
        category: 'reading',
        tier: 'platinum',
    },

    // Streak Badges
    {
        id: 'week-warrior',
        name: 'Week Warrior',
        description: '7-day reading streak',
        icon: '🔥',
        category: 'streak',
        tier: 'bronze',
    },
    {
        id: 'month-master',
        name: 'Month Master',
        description: '30-day reading streak',
        icon: '💪',
        category: 'streak',
        tier: 'silver',
    },
    {
        id: 'dedication',
        name: 'Dedication',
        description: '100-day reading streak',
        icon: '⭐',
        category: 'streak',
        tier: 'gold',
    },
    {
        id: 'unstoppable',
        name: 'Unstoppable',
        description: '365-day reading streak',
        icon: '🏆',
        category: 'streak',
        tier: 'platinum',
    },

    // Social Badges
    {
        id: 'social-reader',
        name: 'Social Reader',
        description: 'Joined your first reading room',
        icon: '👥',
        category: 'social',
        tier: 'bronze',
    },
    {
        id: 'room-host',
        name: 'Room Host',
        description: 'Hosted 10 reading rooms',
        icon: '🎙️',
        category: 'social',
        tier: 'silver',
    },
    {
        id: 'connector',
        name: 'Connector',
        description: '50 followers',
        icon: '🤝',
        category: 'social',
        tier: 'silver',
    },
    {
        id: 'influencer',
        name: 'Influencer',
        description: '500 followers',
        icon: '✨',
        category: 'social',
        tier: 'gold',
    },

    // Milestone Badges
    {
        id: 'night-owl',
        name: 'Night Owl',
        description: 'Read for 1 hour after midnight',
        icon: '🦉',
        category: 'milestone',
        tier: 'bronze',
    },
    {
        id: 'early-bird',
        name: 'Early Bird',
        description: 'Read for 1 hour before 7am',
        icon: '🐦',
        category: 'milestone',
        tier: 'bronze',
    },
    {
        id: 'marathon',
        name: 'Marathon Reader',
        description: 'Read for 4 hours in one session',
        icon: '🏃',
        category: 'milestone',
        tier: 'gold',
    },
    {
        id: 'speed-reader',
        name: 'Speed Reader',
        description: 'Finished a book in one day',
        icon: '⚡',
        category: 'milestone',
        tier: 'silver',
    },

    // Special Badges
    {
        id: 'beta-tester',
        name: 'Beta Tester',
        description: 'Joined during beta',
        icon: '🧪',
        category: 'special',
        tier: 'gold',
    },
    {
        id: 'wrapped-2024',
        name: 'Wrapped 2024',
        description: 'Received your first Storyline Wrapped',
        icon: '🎁',
        category: 'special',
        tier: 'silver',
    },
];

// Activity Feed Types
export type ActivityType =
    | 'book_started'
    | 'book_finished'
    | 'badge_earned'
    | 'room_created'
    | 'room_joined'
    | 'highlight_added'
    | 'reaction_added'
    | 'goal_completed'
    | 'streak_milestone'
    | 'follow';

export interface Activity {
    id: string;
    userId: string;
    user: {
        id: string;
        displayName: string;
        avatar: string;
    };
    type: ActivityType;
    data: Record<string, unknown>;
    bookId?: string;
    book?: {
        title: string;
        author: string;
        cover: string;
    };
    timestamp: Date;
}

// Book Club Types
export interface BookClub {
    id: string;
    name: string;
    description: string;
    coverImage: string;
    hostId: string;
    memberIds: string[];
    isPrivate: boolean;

    // Current book
    currentBook?: {
        id: string;
        title: string;
        author: string;
        cover: string;
        startDate: Date;
        endDate?: Date;
    };

    // Schedule
    schedule?: ClubSchedule;

    // Milestones
    milestones: ClubMilestone[];

    // Polls
    polls: ClubPoll[];

    createdAt: Date;
}

export interface ClubSchedule {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    dayOfWeek?: number; // 0-6
    time?: string; // HH:MM
    timezone: string;
}

export interface ClubMilestone {
    id: string;
    title: string;
    description?: string;
    chapter?: number;
    percentage?: number;
    dueDate?: Date;
    completed: boolean;
}

export interface ClubPoll {
    id: string;
    question: string;
    options: {
        id: string;
        text: string;
        votes: string[]; // user IDs
    }[];
    createdBy: string;
    endsAt?: Date;
    isClosed: boolean;
}

// Quote Card Types
export interface QuoteCard {
    id: string;
    userId: string;
    bookId: string;
    quote: string;
    bookTitle: string;
    bookAuthor: string;
    page?: number;
    chapter?: string;
    style: QuoteCardStyle;
    createdAt: Date;
}

export type QuoteCardStyle =
    | 'minimal'
    | 'gradient'
    | 'paper'
    | 'modern'
    | 'dark';

// Storyline Wrapped Types
export interface StorylineWrapped {
    year: number;
    userId: string;

    // Reading Stats
    booksRead: number;
    pagesRead: number;
    minutesRead: number;

    // Top Books
    topBooks: {
        id: string;
        title: string;
        author: string;
        cover: string;
        rating?: number;
    }[];

    // Favorite Genre
    topGenre: string;

    // Social Stats
    roomsJoined: number;
    reactionsGiven: number;
    highlightsCreated: number;
    voiceNotesRecorded: number;

    // Streaks
    longestStreak: number;

    // Personality
    readerPersonality: string; // e.g., "Night Owl", "Speed Reader", "Social Butterfly"

    // Badges earned this year
    badgesEarned: string[];

    createdAt: Date;
}
