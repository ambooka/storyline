import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt?: string;
}

export interface ReadingStats {
    totalPagesRead: number;
    totalBooksFinished: number;
    totalTimeMinutes: number;
    averagePagesPerDay: number;
    favoriteGenre: string;
    longestSession: number;
}

interface GamificationState {
    // XP & Level
    xp: number;
    level: number;
    xpToNextLevel: number;

    // Streaks
    currentStreak: number;
    longestStreak: number;
    lastReadDate: string | null;

    // Badges
    badges: Badge[];
    recentlyUnlocked: Badge | null;

    // Stats
    stats: ReadingStats;

    // Actions
    addXP: (amount: number) => void;
    updateStreak: () => void;
    unlockBadge: (badge: Badge) => void;
    dismissBadgeNotification: () => void;
    updateStats: (updates: Partial<ReadingStats>) => void;
    resetProgress: () => void;
}

// Calculate level from XP (level = floor(sqrt(xp / 100)) + 1)
function calculateLevel(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// Calculate XP needed for next level
function xpForLevel(level: number): number {
    return level * level * 100;
}

const initialStats: ReadingStats = {
    totalPagesRead: 0,
    totalBooksFinished: 0,
    totalTimeMinutes: 0,
    averagePagesPerDay: 0,
    favoriteGenre: '',
    longestSession: 0,
};

export const useGamificationStore = create<GamificationState>()(
    persist(
        (set, get) => ({
            xp: 0,
            level: 1,
            xpToNextLevel: 100,
            currentStreak: 0,
            longestStreak: 0,
            lastReadDate: null,
            badges: [],
            recentlyUnlocked: null,
            stats: initialStats,

            addXP: (amount: number) => {
                const currentXP = get().xp;
                const newXP = currentXP + amount;
                const newLevel = calculateLevel(newXP);
                const xpToNext = xpForLevel(newLevel) - newXP;

                set({
                    xp: newXP,
                    level: newLevel,
                    xpToNextLevel: xpToNext > 0 ? xpToNext : xpForLevel(newLevel + 1) - newXP,
                });
            },

            updateStreak: () => {
                const { lastReadDate, currentStreak, longestStreak } = get();
                const today = new Date().toDateString();
                const yesterday = new Date(Date.now() - 86400000).toDateString();

                if (lastReadDate === today) {
                    // Already read today, no change
                    return;
                }

                let newStreak = 1;
                if (lastReadDate === yesterday) {
                    // Continue streak
                    newStreak = currentStreak + 1;
                }

                const newLongest = Math.max(newStreak, longestStreak);

                set({
                    currentStreak: newStreak,
                    longestStreak: newLongest,
                    lastReadDate: today,
                });

                // Check for streak badges
                const badges = get().badges;
                if (newStreak >= 7 && !badges.find(b => b.name === 'On Fire')) {
                    get().unlockBadge({
                        id: 'on-fire',
                        name: 'On Fire',
                        description: '7-day reading streak',
                        icon: '🔥',
                    });
                }
                if (newStreak >= 30 && !badges.find(b => b.name === 'Streak Master')) {
                    get().unlockBadge({
                        id: 'streak-master',
                        name: 'Streak Master',
                        description: '30-day reading streak',
                        icon: '🏆',
                    });
                }
            },

            unlockBadge: (badge: Badge) => {
                const exists = get().badges.find(b => b.id === badge.id);
                if (exists) return;

                const newBadge = {
                    ...badge,
                    unlockedAt: new Date().toISOString(),
                };

                set({
                    badges: [...get().badges, newBadge],
                    recentlyUnlocked: newBadge,
                });

                // Add badge XP reward
                get().addXP(25);
            },

            dismissBadgeNotification: () => {
                set({ recentlyUnlocked: null });
            },

            updateStats: (updates: Partial<ReadingStats>) => {
                set({
                    stats: { ...get().stats, ...updates },
                });
            },

            resetProgress: () => {
                set({
                    xp: 0,
                    level: 1,
                    xpToNextLevel: 100,
                    currentStreak: 0,
                    longestStreak: 0,
                    lastReadDate: null,
                    badges: [],
                    recentlyUnlocked: null,
                    stats: initialStats,
                });
            },
        }),
        {
            name: 'storyline-gamification',
        }
    )
);
