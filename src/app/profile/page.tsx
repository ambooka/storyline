"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    BookOpen,
    TrendingUp,
    Clock,
    Flame,
    Settings,
    Edit2,
    Moon,
    Sun,
    Bell,
    LogOut,
    ChevronRight,
    Globe,
    CheckCircle,
    X,
    User,
    Mail,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { BADGES } from "@/lib/gamification";
import { getAllBooks, StoredBook } from "@/lib/epub";
import { PageLayout } from "@/components/ui";
import styles from "./page.module.css";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function ProfilePage() {
    const { user, profile, loading: authLoading, signOut } = useAuth();
    const [showSettings, setShowSettings] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [userBooks, setUserBooks] = useState<StoredBook[]>([]);
    const [loading, setLoading] = useState(true);

    // Real stats calculated from user data
    const [realStats, setRealStats] = useState({
        booksRead: 0,
        booksInProgress: 0,
        pagesRead: 0,
        hoursRead: 0,
    });

    // Load real data
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const books = await getAllBooks();
                setUserBooks(books);

                const finished = books.filter(b => b.progress >= 95).length;
                const inProgress = books.filter(b => b.progress > 0 && b.progress < 95).length;
                const totalProgress = books.reduce((sum, b) => sum + b.progress, 0);
                const estimatedPages = Math.round(totalProgress * 2.5);

                setRealStats({
                    booksRead: finished,
                    booksInProgress: inProgress,
                    pagesRead: estimatedPages,
                    hoursRead: Math.round(estimatedPages / 30),
                });
            } catch (error) {
                console.error("Failed to load profile data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();

        const savedTheme = localStorage.getItem("storyline_theme");
        if (savedTheme === "dark") setTheme("dark");
    }, []);

    // Load streak from localStorage
    const [streak, setStreak] = useState(0);
    useEffect(() => {
        const saved = localStorage.getItem("storyline_streak");
        if (saved) {
            const data = JSON.parse(saved);
            setStreak(data.count || 0);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        localStorage.setItem("storyline_theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
    };

    // Use real user data or defaults
    const displayUser = {
        displayName: user?.displayName || profile?.displayName || "Guest Reader",
        email: user?.email || "",
        avatar: user?.photoURL || profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'guest'}`,
        bio: "A passionate reader exploring worlds through books.",
    };

    const [readingGoal, setReadingGoal] = useState({ target: profile?.preferences?.readingGoal || 12, current: 0 });
    useEffect(() => {
        setReadingGoal(prev => ({ ...prev, current: realStats.booksRead }));
    }, [realStats.booksRead]);

    const goalProgress = Math.min((readingGoal.current / readingGoal.target) * 100, 100);

    const earnedBadges = BADGES.filter(badge => {
        if (badge.id === "first_book" && realStats.booksRead >= 1) return true;
        if (badge.id === "bookworm" && realStats.booksRead >= 10) return true;
        if (badge.id === "night_reader" && realStats.hoursRead >= 10) return true;
        if (badge.id === "social_reader" && realStats.booksInProgress >= 3) return true;
        return false;
    });

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error("Sign out failed:", error);
        }
    };

    // Show login prompt if not authenticated
    if (!authLoading && !user) {
        return (
            <PageLayout>
                <div className={styles.loginPrompt}>
                    <motion.div
                        className={styles.loginCard}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <User size={64} className={styles.loginIcon} />
                        <h2>Welcome to Storyline</h2>
                        <p>Sign in to track your reading progress, earn badges, and connect with other readers.</p>
                        <button
                            className={styles.signInBtn}
                            onClick={() => setShowAuthModal(true)}
                        >
                            Sign In / Sign Up
                        </button>
                    </motion.div>
                </div>
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                />
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            {/* Header */}
            <motion.div
                className={styles.header}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className={styles.headerContent}>
                    <div className={styles.avatarSection}>
                        <img src={displayUser.avatar} alt={displayUser.displayName} className={styles.avatar} />
                        <div className={styles.streakBadge}>
                            <Flame size={14} />
                            {streak}
                        </div>
                    </div>

                    <div className={styles.userInfo}>
                        <h1 className={styles.displayName}>{displayUser.displayName}</h1>
                        {displayUser.email && (
                            <p className={styles.username}>
                                <Mail size={14} /> {displayUser.email}
                            </p>
                        )}
                        <p className={styles.bio}>{displayUser.bio}</p>
                    </div>

                    <button
                        className={styles.settingsBtn}
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        {showSettings ? <X size={20} /> : <Settings size={20} />}
                    </button>
                </div>

                {/* Quick Stats */}
                <div className={styles.quickStats}>
                    <div className={styles.quickStat}>
                        <BookOpen size={18} />
                        <span className={styles.quickStatValue}>{realStats.booksRead}</span>
                        <span className={styles.quickStatLabel}>Read</span>
                    </div>
                    <div className={styles.quickStat}>
                        <Clock size={18} />
                        <span className={styles.quickStatValue}>{realStats.hoursRead}h</span>
                        <span className={styles.quickStatLabel}>Time</span>
                    </div>
                    <div className={styles.quickStat}>
                        <Flame size={18} />
                        <span className={styles.quickStatValue}>{streak}</span>
                        <span className={styles.quickStatLabel}>Streak</span>
                    </div>
                </div>
            </motion.div>

            {/* Settings Dropdown */}
            {showSettings && (
                <motion.div
                    className={styles.settingsDropdown}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                >
                    <button className={styles.settingsItem} onClick={toggleTheme}>
                        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                        <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
                        <ChevronRight size={16} />
                    </button>
                    <button className={styles.settingsItem}>
                        <Bell size={18} />
                        <span>Notifications</span>
                        <ChevronRight size={16} />
                    </button>
                    <button className={styles.settingsItem}>
                        <Globe size={18} />
                        <span>Language</span>
                        <ChevronRight size={16} />
                    </button>
                    <button
                        className={`${styles.settingsItem} ${styles.signOutBtn}`}
                        onClick={handleSignOut}
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </motion.div>
            )}

            {/* Reading Goal */}
            <motion.div
                className={styles.section}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div className={styles.sectionHeader}>
                    <h2>Reading Goal 2024</h2>
                    <button className={styles.editBtn}>
                        <Edit2 size={16} />
                    </button>
                </div>
                <motion.div className={styles.goalCard} variants={itemVariants}>
                    <div className={styles.goalProgress}>
                        <div className={styles.goalCircle}>
                            <svg viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="var(--surface-elevated)"
                                    strokeWidth="8"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="var(--accent-primary)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${goalProgress * 2.83} 283`}
                                    transform="rotate(-90 50 50)"
                                />
                            </svg>
                            <div className={styles.goalText}>
                                <span className={styles.goalCurrent}>{readingGoal.current}</span>
                                <span className={styles.goalDivider}>/</span>
                                <span className={styles.goalTarget}>{readingGoal.target}</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.goalInfo}>
                        <p className={styles.goalStatus}>
                            {readingGoal.current >= readingGoal.target
                                ? "🎉 Goal Complete!"
                                : `${readingGoal.target - readingGoal.current} books to go`}
                        </p>
                        <p className={styles.goalHint}>Keep reading to reach your goal</p>
                    </div>
                </motion.div>
            </motion.div>

            {/* Badges */}
            <motion.div
                className={styles.section}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div className={styles.sectionHeader}>
                    <h2>Badges Earned</h2>
                    <span className={styles.badgeCount}>{earnedBadges.length} / {BADGES.length}</span>
                </div>
                <motion.div className={styles.badgesGrid} variants={containerVariants}>
                    {BADGES.map((badge) => {
                        const isEarned = earnedBadges.includes(badge);
                        return (
                            <motion.div
                                key={badge.id}
                                className={`${styles.badge} ${isEarned ? styles.badgeEarned : styles.badgeLocked}`}
                                variants={itemVariants}
                            >
                                <span className={styles.badgeIcon}>{badge.icon}</span>
                                <span className={styles.badgeName}>{badge.name}</span>
                                {isEarned && <CheckCircle size={14} className={styles.badgeCheck} />}
                            </motion.div>
                        );
                    })}
                </motion.div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                className={styles.section}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <h2 className={styles.sectionTitle}>Reading Stats</h2>
                <motion.div className={styles.statsGrid} variants={containerVariants}>
                    <motion.div className={styles.statCard} variants={itemVariants}>
                        <BookOpen size={24} />
                        <span className={styles.statValue}>{realStats.booksRead}</span>
                        <span className={styles.statLabel}>Books Finished</span>
                    </motion.div>
                    <motion.div className={styles.statCard} variants={itemVariants}>
                        <TrendingUp size={24} />
                        <span className={styles.statValue}>{realStats.booksInProgress}</span>
                        <span className={styles.statLabel}>In Progress</span>
                    </motion.div>
                    <motion.div className={styles.statCard} variants={itemVariants}>
                        <Clock size={24} />
                        <span className={styles.statValue}>{realStats.hoursRead}h</span>
                        <span className={styles.statLabel}>Time Reading</span>
                    </motion.div>
                    <motion.div className={styles.statCard} variants={itemVariants}>
                        <Flame size={24} />
                        <span className={styles.statValue}>{streak}</span>
                        <span className={styles.statLabel}>Day Streak</span>
                    </motion.div>
                </motion.div>
            </motion.div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </PageLayout>
    );
}
