"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Users, Library, BarChart2 } from "lucide-react";
import styles from "./BottomNav.module.css";

interface NavItem {
    href: string;
    icon: React.ElementType;
    label: string;
}

// Match desktop sidebar navigation
const navItems: NavItem[] = [
    { href: "/explore", icon: Library, label: "Explore" },
    { href: "/", icon: BookOpen, label: "My Books" },
    { href: "/clubs", icon: Users, label: "Clubs" },
    { href: "/profile", icon: BarChart2, label: "Profile" },
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
                    {navItems.map((item) => {
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
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
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
