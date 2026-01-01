"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Users,
    Calendar,
    Lock,
    Globe,
    X,
    Loader2,
    Search,
} from "lucide-react";
import { PageLayout, ThemeProfileControls } from "@/components/ui";
import styles from "./page.module.css";

// Types
interface BookClub {
    id: string;
    name: string;
    description: string;
    coverImage: string;
    memberCount: number;
    isPrivate: boolean;
    currentBook?: { title: string; author: string; cover: string };
    schedule?: { day: string; time: string };
    isJoined?: boolean;
}

// Initial mock clubs
const initialClubs: BookClub[] = [
    {
        id: "1",
        name: "Fantasy Lovers",
        description: "Exploring epic fantasy worlds together",
        coverImage: "https://covers.openlibrary.org/b/id/8739161-L.jpg",
        memberCount: 12,
        isPrivate: false,
        currentBook: { title: "The Name of the Wind", author: "Patrick Rothfuss", cover: "https://covers.openlibrary.org/b/id/8739161-L.jpg" },
        schedule: { day: "Sundays", time: "7:00 PM" },
        isJoined: false,
    },
    {
        id: "2",
        name: "Sci-Fi Explorers",
        description: "Hard science fiction enthusiasts",
        coverImage: "https://covers.openlibrary.org/b/id/10389354-L.jpg",
        memberCount: 8,
        isPrivate: true,
        currentBook: { title: "Project Hail Mary", author: "Andy Weir", cover: "https://covers.openlibrary.org/b/id/10389354-L.jpg" },
        schedule: { day: "Saturdays", time: "3:00 PM" },
        isJoined: false,
    },
    {
        id: "3",
        name: "Classic Literature",
        description: "Timeless works that shaped the world",
        coverImage: "https://covers.openlibrary.org/b/id/8231992-L.jpg",
        memberCount: 15,
        isPrivate: false,
        currentBook: { title: "Pride and Prejudice", author: "Jane Austen", cover: "https://covers.openlibrary.org/b/id/8231992-L.jpg" },
        schedule: { day: "Wednesdays", time: "8:00 PM" },
        isJoined: true,
    },
];

export default function ClubsPage() {
    const [clubs, setClubs] = useState<BookClub[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem("storyline_clubs");
            return saved ? JSON.parse(saved) : initialClubs;
        }
        return initialClubs;
    });
    const [selectedClub, setSelectedClub] = useState<BookClub | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);

    // Create club form state
    const [newClub, setNewClub] = useState({
        name: "",
        description: "",
        isPrivate: false,
        schedule: { day: "Sundays", time: "7:00 PM" },
    });

    // Save clubs to localStorage when they change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem("storyline_clubs", JSON.stringify(clubs));
        }
    }, [clubs]);

    // Save clubs to localStorage
    const saveClubs = (updated: BookClub[]) => {
        setClubs(updated);
        localStorage.setItem("storyline_clubs", JSON.stringify(updated));
    };

    // Create new club
    const handleCreateClub = () => {
        if (!newClub.name.trim()) return;

        const club: BookClub = {
            id: Date.now().toString(),
            name: newClub.name,
            description: newClub.description,
            coverImage: `https://api.dicebear.com/7.x/shapes/svg?seed=${newClub.name}`,
            memberCount: 1,
            isPrivate: newClub.isPrivate,
            schedule: newClub.schedule,
            isJoined: true,
        };

        saveClubs([club, ...clubs]);
        setShowCreateModal(false);
        setNewClub({ name: "", description: "", isPrivate: false, schedule: { day: "Sundays", time: "7:00 PM" } });
    };

    // Join/leave club
    const toggleJoin = (clubId: string) => {
        const updated = clubs.map(c => {
            if (c.id === clubId) {
                return {
                    ...c,
                    isJoined: !c.isJoined,
                    memberCount: c.isJoined ? c.memberCount - 1 : c.memberCount + 1,
                };
            }
            return c;
        });
        saveClubs(updated);
        if (selectedClub?.id === clubId) {
            setSelectedClub(updated.find(c => c.id === clubId) || null);
        }
    };

    // Filter clubs
    const filteredClubs = clubs.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const myClubs = clubs.filter(c => c.isJoined);
    const discoverClubs = filteredClubs.filter(c => !c.isJoined);

    return (
        <PageLayout>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <h1>Book Clubs</h1>
                    <ThemeProfileControls />
                </div>
                <div className={styles.searchRow}>
                    <div className={styles.searchBox}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search clubs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                        <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
                            <Plus size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className={styles.loadingState}>
                    <Loader2 size={40} className={styles.spinner} />
                </div>
            ) : (
                <>
                    {/* My Clubs */}
                    {myClubs.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>My Clubs</h2>
                            <div className={styles.clubGrid}>
                                {myClubs.map((club) => (
                                    <motion.div
                                        key={club.id}
                                        className={`${styles.clubCard} ${styles.clubCardJoined}`}
                                        onClick={() => setSelectedClub(club)}
                                        whileHover={{ y: -4 }}
                                    >
                                        <div className={styles.clubCover}>
                                            <img src={club.coverImage} alt="" />
                                            <div className={styles.clubBadge}>
                                                {club.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                                            </div>
                                        </div>
                                        <div className={styles.clubContent}>
                                            <h3 className={styles.clubName}>{club.name}</h3>
                                            <p className={styles.clubDesc}>{club.description}</p>
                                            <div className={styles.clubMeta}>
                                                <span><Users size={14} /> {club.memberCount}</span>
                                                {club.schedule && <span><Calendar size={14} /> {club.schedule.day}</span>}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Discover Clubs */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Discover Clubs</h2>
                        {discoverClubs.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Users size={48} />
                                <p>No clubs to discover. Create one!</p>
                            </div>
                        ) : (
                            <div className={styles.clubGrid}>
                                {discoverClubs.map((club) => (
                                    <motion.div
                                        key={club.id}
                                        className={styles.clubCard}
                                        onClick={() => setSelectedClub(club)}
                                        whileHover={{ y: -4 }}
                                    >
                                        <div className={styles.clubCover}>
                                            <img src={club.coverImage} alt="" />
                                            <div className={styles.clubBadge}>
                                                {club.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                                            </div>
                                        </div>
                                        <div className={styles.clubContent}>
                                            <h3 className={styles.clubName}>{club.name}</h3>
                                            <p className={styles.clubDesc}>{club.description}</p>
                                            <div className={styles.clubMeta}>
                                                <span><Users size={14} /> {club.memberCount}</span>
                                                {club.schedule && <span><Calendar size={14} /> {club.schedule.day}</span>}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}

            {/* Club Detail Modal */}
            <AnimatePresence>
                {selectedClub && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedClub(null)}
                    >
                        <motion.div
                            className={styles.clubDetailModal}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <button className={styles.closeBtn} onClick={() => setSelectedClub(null)}>
                                <X size={20} />
                            </button>
                            <div className={styles.detailHeader}>
                                <img src={selectedClub.coverImage} alt="" className={styles.detailCover} />
                                <div className={styles.detailInfo}>
                                    <h2>{selectedClub.name}</h2>
                                    <p>{selectedClub.description}</p>
                                    <div className={styles.detailMeta}>
                                        <span><Users size={16} /> {selectedClub.memberCount} members</span>
                                        {selectedClub.schedule && (
                                            <span><Calendar size={16} /> {selectedClub.schedule.day} at {selectedClub.schedule.time}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {selectedClub.currentBook && (
                                <div className={styles.currentBook}>
                                    <h3>📖 Currently Reading</h3>
                                    <div className={styles.bookCard}>
                                        <img src={selectedClub.currentBook.cover} alt="" />
                                        <div>
                                            <strong>{selectedClub.currentBook.title}</strong>
                                            <span>{selectedClub.currentBook.author}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                className={`${styles.joinBtn} ${selectedClub.isJoined ? styles.joinBtnLeave : ""}`}
                                onClick={() => toggleJoin(selectedClub.id)}
                            >
                                {selectedClub.isJoined ? "Leave Club" : "Join Club"}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Club Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            className={styles.createModal}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h2>Create a Book Club</h2>
                            <div className={styles.formGroup}>
                                <label>Club Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Fantasy Adventures"
                                    value={newClub.name}
                                    onChange={e => setNewClub({ ...newClub, name: e.target.value })}
                                    className={styles.formInput}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Description</label>
                                <textarea
                                    placeholder="What's your club about?"
                                    value={newClub.description}
                                    onChange={e => setNewClub({ ...newClub, description: e.target.value })}
                                    className={styles.formTextarea}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Meeting Day</label>
                                <select
                                    value={newClub.schedule.day}
                                    onChange={e => setNewClub({ ...newClub, schedule: { ...newClub.schedule, day: e.target.value } })}
                                    className={styles.formSelect}
                                >
                                    {["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"].map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formCheck}>
                                <input
                                    type="checkbox"
                                    id="private"
                                    checked={newClub.isPrivate}
                                    onChange={e => setNewClub({ ...newClub, isPrivate: e.target.checked })}
                                />
                                <label htmlFor="private">Make this club private (invite only)</label>
                            </div>
                            <div className={styles.formActions}>
                                <button className={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button className={styles.submitBtn} onClick={handleCreateClub} disabled={!newClub.name.trim()}>
                                    Create Club
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageLayout>
    );
}
