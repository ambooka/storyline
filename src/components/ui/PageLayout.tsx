"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import styles from "./PageLayout.module.css";

interface PageLayoutProps {
    children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
    return (
        <div className={styles.layout}>
            <Sidebar />
            <main className={styles.main}>{children}</main>
            <MobileNav />
        </div>
    );
}
