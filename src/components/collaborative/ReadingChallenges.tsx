"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Target,
    Trophy,
    Clock,
    Users,
    CheckCircle,
    Star,
    Flame,
    ChevronDown,
    ChevronUp,
    Plus,
} from "lucide-react";
import styles from "./ReadingChallenges.module.css";

interface Challenge {
    id: string;
    title: string;
    description: string;
    type: "chapter" | "time" | "pages" | "streak";
    target: number;
    current: number;
    deadline: Date;
    reward: number; // XP
    participants: string[];
    isCompleted: boolean;
}

interface ReadingChallengesProps {
    roomId: string;
    challenges: Challenge[];
    userId: string;
    onCreateChallenge: (challenge: Omit<Challenge, "id" | "current" | "isCompleted">) => void;
    onJoinChallenge: (challengeId: string) => void;
}

const CHALLENGE_TEMPLATES = [
    {
        title: "Chapter Sprint",
        description: "Finish the next chapter by tonight!",
        type: "chapter" as const,
        target: 1,
        reward: 50,
    },
    {
        title: "Reading Marathon",
        description: "Read for 30 minutes together",
        type: "time" as const,
        target: 30,
        reward: 75,
    },
    {
        title: "Page Turner",
        description: "Read 50 pages as a group",
        type: "pages" as const,
        target: 50,
        reward: 100,
    },
    {
        title: "Daily Streak",
        description: "Read together 3 days in a row",
        type: "streak" as const,
        target: 3,
        reward: 150,
    },
];

/**
 * Reading Challenges
 * Gamified challenges for group reading sessions.
 */
export function ReadingChallenges({
    roomId,
    challenges,
    userId,
    onCreateChallenge,
    onJoinChallenge,
}: ReadingChallengesProps) {
    const [expanded, setExpanded] = useState(false);
    const [showCreate, setShowCreate] = useState(false);

    const activeChallenges = challenges.filter((c) => !c.isCompleted);
    const completedChallenges = challenges.filter((c) => c.isCompleted);

    const getProgress = (challenge: Challenge) =>
        Math.min((challenge.current / challenge.target) * 100, 100);

    const getTimeRemaining = (deadline: Date) => {
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();
        if (diff <= 0) return "Expired";
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
        return `${hours}h ${minutes}m`;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "chapter": return Target;
            case "time": return Clock;
            case "pages": return Star;
            case "streak": return Flame;
            default: return Target;
        }
    };

    const handleCreateFromTemplate = (template: typeof CHALLENGE_TEMPLATES[0]) => {
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + 24);

        onCreateChallenge({
            ...template,
            deadline,
            participants: [userId],
        });
        setShowCreate(false);
    };

    return (
        <div className={styles.container}>
            <button
                className={`${styles.toggleBtn} ${expanded ? styles.toggleBtnActive : ""}`}
                onClick={() => setExpanded(!expanded)}
            >
                <Trophy size={16} />
                Challenges
                {activeChallenges.length > 0 && (
                    <span className={styles.badge}>{activeChallenges.length}</span>
                )}
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        className={styles.panel}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {/* Active Challenges */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h4>Active Challenges</h4>
                                <button
                                    className={styles.createBtn}
                                    onClick={() => setShowCreate(!showCreate)}
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            {/* Create new challenge */}
                            <AnimatePresence>
                                {showCreate && (
                                    <motion.div
                                        className={styles.templates}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        {CHALLENGE_TEMPLATES.map((template, idx) => {
                                            const Icon = getTypeIcon(template.type);
                                            return (
                                                <button
                                                    key={idx}
                                                    className={styles.templateBtn}
                                                    onClick={() => handleCreateFromTemplate(template)}
                                                >
                                                    <Icon size={16} />
                                                    <div>
                                                        <strong>{template.title}</strong>
                                                        <span>+{template.reward} XP</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {activeChallenges.length === 0 ? (
                                <p className={styles.empty}>No active challenges. Create one!</p>
                            ) : (
                                <div className={styles.challengeList}>
                                    {activeChallenges.map((challenge) => {
                                        const Icon = getTypeIcon(challenge.type);
                                        const progress = getProgress(challenge);
                                        const isParticipating = challenge.participants.includes(userId);

                                        return (
                                            <div key={challenge.id} className={styles.challengeCard}>
                                                <div className={styles.challengeHeader}>
                                                    <div className={styles.challengeIcon}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <div className={styles.challengeInfo}>
                                                        <h5>{challenge.title}</h5>
                                                        <span className={styles.deadline}>
                                                            <Clock size={10} />
                                                            {getTimeRemaining(challenge.deadline)}
                                                        </span>
                                                    </div>
                                                    <span className={styles.reward}>+{challenge.reward} XP</span>
                                                </div>

                                                <p className={styles.challengeDesc}>{challenge.description}</p>

                                                <div className={styles.progressSection}>
                                                    <div className={styles.progressBar}>
                                                        <motion.div
                                                            className={styles.progressFill}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <span className={styles.progressText}>
                                                        {challenge.current}/{challenge.target}
                                                    </span>
                                                </div>

                                                <div className={styles.challengeFooter}>
                                                    <div className={styles.participants}>
                                                        <Users size={12} />
                                                        {challenge.participants.length}
                                                    </div>
                                                    {!isParticipating && (
                                                        <button
                                                            className={styles.joinBtn}
                                                            onClick={() => onJoinChallenge(challenge.id)}
                                                        >
                                                            Join
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Completed Challenges */}
                        {completedChallenges.length > 0 && (
                            <div className={styles.section}>
                                <h4>Completed</h4>
                                <div className={styles.completedList}>
                                    {completedChallenges.slice(0, 3).map((challenge) => (
                                        <div key={challenge.id} className={styles.completedCard}>
                                            <CheckCircle size={16} className={styles.checkIcon} />
                                            <span>{challenge.title}</span>
                                            <span className={styles.rewardEarned}>+{challenge.reward} XP</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
