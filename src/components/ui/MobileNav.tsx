"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Users, Library, BarChart2 } from "lucide-react";
import styles from "./MobileNav.module.css";

const navItems = [
    { icon: Library, label: "Explore", href: "/explore" },
    { icon: BookOpen, label: "My Books", href: "/" },
    { icon: Users, label: "Clubs", href: "/clubs" },
    { icon: BarChart2, label: "Profile", href: "/profile" },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <nav className={styles.mobileNav}>
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
