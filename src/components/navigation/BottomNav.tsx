"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Home,
    Compass,
    Users,
    User,
    Plus,
    LogIn
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./BottomNav.module.css";

interface NavItem {
    href: string;
    icon: typeof Home;
    label: string;
}

const NAV_ITEMS: NavItem[] = [
    { href: "/", icon: Home, label: "Library" },
    { href: "/explore", icon: Compass, label: "Explore" },
    { href: "/clubs", icon: Users, label: "Clubs" },
    { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
    const pathname = usePathname();
    const { user } = useAuth();

    // Don't show on reader page
    if (pathname.startsWith("/read/")) {
        return null;
    }

    return (
        <nav className={styles.bottomNav}>
            {/* Fluid glass background */}
            <div className={styles.glassBackground}>
                <div className={styles.glassShine} />
            </div>

            {/* Navigation items */}
            <div className={styles.navItems}>
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    const isProfile = item.href === "/profile";

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                        >
                            <motion.div
                                className={styles.iconWrapper}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                {isActive && (
                                    <motion.div
                                        className={styles.activeIndicator}
                                        layoutId="activeIndicator"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                {isProfile && user?.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt="Profile"
                                        className={styles.userAvatar}
                                    />
                                ) : isProfile && !user ? (
                                    <LogIn size={22} className={styles.icon} />
                                ) : (
                                    <Icon size={22} className={styles.icon} />
                                )}
                            </motion.div>
                            <span className={styles.label}>
                                {isProfile && !user ? "Sign In" : item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {/* Floating action button */}
            <motion.button
                className={styles.fab}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
                <Plus size={24} />
            </motion.button>
        </nav>
    );
}
