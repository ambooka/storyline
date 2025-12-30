"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Sun, Moon, Smartphone, BookOpen, User } from "lucide-react";
import styles from "./Header.module.css";

type ThemeType = 'light' | 'dark' | 'oled' | 'sepia';

export function Header() {
    const router = useRouter();
    const [theme, setTheme] = useState<ThemeType>('light');
    const [searchQuery, setSearchQuery] = useState("");

    // Load theme from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('theme') as ThemeType;
        if (saved) {
            setTheme(saved);
            document.documentElement.setAttribute('data-theme', saved);
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const defaultTheme = prefersDark ? 'dark' : 'light';
            setTheme(defaultTheme);
            document.documentElement.setAttribute('data-theme', defaultTheme);
        }
    }, []);

    const handleThemeChange = (newTheme: ThemeType) => {
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const getThemeIcon = (t: ThemeType) => {
        switch (t) {
            case 'light': return Sun;
            case 'dark': return Moon;
            case 'oled': return Smartphone;
            case 'sepia': return BookOpen;
        }
    };

    return (
        <header className={styles.header}>
            <div className={styles.headerInner}>
                {/* Logo */}
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>📚</span>
                    <span className={styles.logoText}>Storyline</span>
                </Link>

                {/* Desktop Search */}
                <form className={styles.searchWrapper} onSubmit={handleSearch}>
                    <div className={styles.searchInputWrapper}>
                        <Search className={styles.searchIcon} size={16} />
                        <input
                            type="search"
                            placeholder="Search books..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </form>

                {/* Actions */}
                <div className={styles.actions}>
                    {/* Mobile Search Button */}
                    <Link href="/explore" className={`${styles.iconBtn} ${styles.mobileSearchBtn}`}>
                        <Search size={20} />
                    </Link>

                    {/* Theme Switcher */}
                    <div className={styles.themeSwitcher}>
                        {(['light', 'dark', 'oled'] as ThemeType[]).map((t) => {
                            const Icon = getThemeIcon(t);
                            return (
                                <button
                                    key={t}
                                    className={`${styles.themeBtn} ${theme === t ? styles.active : ''}`}
                                    onClick={() => handleThemeChange(t)}
                                    aria-label={`Switch to ${t} theme`}
                                    title={`${t.charAt(0).toUpperCase() + t.slice(1)} theme`}
                                >
                                    <Icon size={16} />
                                </button>
                            );
                        })}
                    </div>

                    {/* Profile Avatar */}
                    <Link href="/profile" className={styles.avatar}>
                        <User size={18} />
                    </Link>
                </div>
            </div>
        </header>
    );
}

export default Header;
