"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const ROUTE_STORAGE_KEY = "storyline-last-route";

// Routes that should be remembered
const PERSISTABLE_ROUTES = [
    "/explore",
    "/clubs",
    "/profile",
    "/read/",
];

// Routes that should not redirect (entry points)
const ENTRY_ROUTES = [
    "/",
    "/auth",
    "/login",
    "/signup",
];

export function RouteMemory() {
    const pathname = usePathname();
    const router = useRouter();
    const hasRestored = useRef(false);

    // Save current route to localStorage
    useEffect(() => {
        if (!pathname) return;

        // Only save routes that make sense to restore
        const shouldPersist = PERSISTABLE_ROUTES.some(route =>
            pathname === route || pathname.startsWith(route)
        );

        if (shouldPersist) {
            localStorage.setItem(ROUTE_STORAGE_KEY, pathname);
        }
    }, [pathname]);

    // Restore route on initial load (only once)
    useEffect(() => {
        if (hasRestored.current) return;
        hasRestored.current = true;

        // Only restore if we're at root/home
        if (pathname !== "/" && !ENTRY_ROUTES.includes(pathname)) {
            return;
        }

        const savedRoute = localStorage.getItem(ROUTE_STORAGE_KEY);

        if (savedRoute && savedRoute !== "/" && savedRoute !== pathname) {
            // Small delay to ensure app is ready
            const timer = setTimeout(() => {
                console.log("Restoring saved route:", savedRoute);
                router.replace(savedRoute);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [pathname, router]);

    return null;
}
