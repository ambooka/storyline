"use client";

import { Search, X } from "lucide-react";
import styles from "./SearchBar.module.css";

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onSubmit?: () => void;
    className?: string;
}

export function SearchBar({
    value,
    onChange,
    placeholder = "Search...",
    onSubmit,
    className = "",
}: SearchBarProps) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit?.();
    };

    return (
        <form onSubmit={handleSubmit} className={`${styles.searchWrapper} ${className}`}>
            <Search size={18} className={styles.searchIcon} />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={styles.searchInput}
            />
            {value && (
                <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => onChange("")}
                >
                    <X size={16} />
                </button>
            )}
        </form>
    );
}
