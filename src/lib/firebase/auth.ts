// Firebase Authentication Utilities
"use client";

import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    onAuthStateChanged,
    User,
    updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDB } from "./config";

const googleProvider = new GoogleAuthProvider();

// User profile type
export interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    createdAt: Date;
    lastSeen: Date;
    preferences: {
        theme: "light" | "dark";
        fontSize: number;
        readingGoal: number;
    };
    stats: {
        booksRead: number;
        pagesRead: number;
        readingStreak: number;
        totalReadingTime: number;
    };
}

// Sign in with Google
export async function signInWithGoogle(): Promise<User | null> {
    const auth = getFirebaseAuth();
    if (!auth) return null;

    try {
        const result = await signInWithPopup(auth, googleProvider);
        await createOrUpdateUserProfile(result.user);
        return result.user;
    } catch (error) {
        console.error("Google sign-in error:", error);
        throw error;
    }
}

// Sign in with email/password
export async function signInWithEmail(email: string, password: string): Promise<User | null> {
    const auth = getFirebaseAuth();
    if (!auth) return null;

    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await createOrUpdateUserProfile(result.user);
        return result.user;
    } catch (error) {
        console.error("Email sign-in error:", error);
        throw error;
    }
}

// Register with email/password
export async function registerWithEmail(email: string, password: string, displayName: string): Promise<User | null> {
    const auth = getFirebaseAuth();
    if (!auth) return null;

    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        await createOrUpdateUserProfile(result.user);
        return result.user;
    } catch (error) {
        console.error("Registration error:", error);
        throw error;
    }
}

// Sign out
export async function signOut(): Promise<void> {
    const auth = getFirebaseAuth();
    if (!auth) return;

    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Sign out error:", error);
        throw error;
    }
}

// Create or update user profile in Firestore
async function createOrUpdateUserProfile(user: User): Promise<void> {
    const db = getFirebaseDB();
    if (!db) return;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // Create new user profile
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            preferences: {
                theme: "light",
                fontSize: 18,
                readingGoal: 12,
            },
            stats: {
                booksRead: 0,
                pagesRead: 0,
                readingStreak: 0,
                totalReadingTime: 0,
            },
        });
    } else {
        // Update last seen
        await setDoc(userRef, {
            lastSeen: serverTimestamp(),
        }, { merge: true });
    }
}

// Get user profile
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const db = getFirebaseDB();
    if (!db) return null;

    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return userSnap.data() as UserProfile;
        }
        return null;
    } catch (error) {
        console.error("Error getting user profile:", error);
        return null;
    }
}

// Auth state observer
export function onAuthChange(callback: (user: User | null) => void): () => void {
    const auth = getFirebaseAuth();
    if (!auth) {
        callback(null);
        return () => { };
    }
    return onAuthStateChanged(auth, callback);
}

// Get current user
export function getCurrentUser(): User | null {
    const auth = getFirebaseAuth();
    return auth?.currentUser || null;
}
