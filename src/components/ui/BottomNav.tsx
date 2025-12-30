"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, BookOpen, User, Plus } from "lucide-react";
import styles from "./BottomNav.module.css";

interface NavItem {
    href: string;
    icon: React.ElementType;
    label: string;
}

const navItems: NavItem[] = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/explore", icon: Search, label: "Explore" },
    { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
    const pathname = usePathname();

    // Don't show on reader page
    if (pathname?.startsWith("/read/")) {
        return null;
    }

    return (
        <>
            <nav className={styles.nav} aria-label="Main navigation">
                <div className={styles.navInner}>
                    {navItems.slice(0, 2).map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href ||
                            (item.href !== "/" && pathname?.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                            >
                                <span className={styles.iconWrapper}>
                                    <Icon size={20} />
                                </span>
                                <span className={styles.label}>{item.label}</span>
                            </Link>
                        );
                    })}

                    {/* Center FAB for currently reading */}
                    <div className={styles.fabWrapper}>
                        <Link href="/explore" className={styles.fab} aria-label="Find books">
                            <BookOpen size={24} />
                        </Link>
                    </div>

                    {navItems.slice(2).map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href ||
                            (item.href !== "/" && pathname?.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                            >
                                <span className={styles.iconWrapper}>
                                    <Icon size={20} />
                                </span>
                                <span className={styles.label}>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Spacer to prevent content overlap */}
            <div className={styles.navSpacer} />
        </>
    );
}

export default BottomNav;
