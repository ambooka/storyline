"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, Moon, Smartphone, User } from "lucide-react";
import styles from "./ThemeProfileControls.module.css";

type ThemeType = 'light' | 'dark' | 'oled';

export function ThemeProfileControls() {
    const [theme, setTheme] = useState<ThemeType>('light');

    useEffect(() => {
        const saved = localStorage.getItem('theme') as ThemeType;
        if (saved) {
            setTheme(saved);
            document.documentElement.setAttribute('data-theme', saved);
        } else {
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

    const getThemeIcon = (t: ThemeType) => {
        switch (t) {
            case 'light': return Sun;
            case 'dark': return Moon;
            case 'oled': return Smartphone;
        }
    };

    return (
        <div className={styles.controls}>
            {/* Theme Switcher */}
            <div className={styles.themeSwitcher}>
                {(['light', 'dark', 'oled'] as ThemeType[]).map((t) => {
                    const Icon = getThemeIcon(t);
                    return (
                        <button
                            key={t}
                            className={`${styles.themeBtn} ${theme === t ? styles.active : ''}`}
                            onClick={() => handleThemeChange(t)}
                            aria-label={`${t} theme`}
                            title={`${t.charAt(0).toUpperCase() + t.slice(1)} theme`}
                        >
                            <Icon size={16} />
                        </button>
                    );
                })}
            </div>

            {/* Profile Button */}
            <Link href="/profile" className={styles.profileBtn}>
                <User size={18} />
            </Link>
        </div>
    );
}
