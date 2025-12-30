"use client";

import { useEffect, useState, useCallback } from "react";
import { User } from "firebase/auth";
import {
    getFirebaseAuth,
    getFirebaseDB,
    getRealtimeDB,
    getFirebaseStorage,
} from "@/lib/firebase/config";

/**
 * Hook for safe Firebase initialization
 * Handles SSR and initialization errors gracefully
 */
export function useFirebase() {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        try {
            // Check if Firebase is configured
            const auth = getFirebaseAuth();
            if (auth) {
                setIsReady(true);
            } else {
                setError(new Error("Firebase not configured. Add Firebase keys to .env.local"));
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Firebase initialization failed"));
        }
    }, []);

    return { isReady, error };
}

/**
 * Safe wrapper for Firebase operations
 * Returns null instead of throwing if Firebase isn't ready
 */
export function useSafeFirebase() {
    const { isReady, error } = useFirebase();

    const safeCall = useCallback(async <T>(
        operation: () => Promise<T>,
        fallback?: T
    ): Promise<T | null> => {
        if (!isReady) {
            console.warn("Firebase not ready, using fallback");
            return fallback ?? null;
        }

        try {
            return await operation();
        } catch (err) {
            console.error("Firebase operation failed:", err);
            return fallback ?? null;
        }
    }, [isReady]);

    return { isReady, error, safeCall };
}

/**
 * Hook for Firebase auth state with error handling
 */
export function useFirebaseAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const auth = getFirebaseAuth();
        if (!auth) {
            setLoading(false);
            return;
        }

        try {
            const { onAuthStateChanged } = require("firebase/auth");
            const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
                setUser(user);
                setLoading(false);
            }, (err: Error) => {
                setError(err);
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Auth initialization failed"));
            setLoading(false);
        }
    }, []);

    return { user, loading, error };
}

/**
 * Hook for Realtime Database connection state
 */
export function useRealtimeConnection() {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const rtdb = getRealtimeDB();
        if (!rtdb) return;

        try {
            const { ref, onValue } = require("firebase/database");
            const connectedRef = ref(rtdb, ".info/connected");
            const unsubscribe = onValue(connectedRef, (snap: { val: () => boolean }) => {
                setIsConnected(snap.val() === true);
            });

            return () => unsubscribe();
        } catch (err) {
            console.error("Realtime connection check failed:", err);
        }
    }, []);

    return isConnected;
}
