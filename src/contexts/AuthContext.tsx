"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "firebase/auth";
import {
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    signOut,
    onAuthChange,
    getUserProfile,
    UserProfile,
} from "@/lib/firebase/auth";

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthChange(async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                const userProfile = await getUserProfile(firebaseUser.uid);
                setProfile(userProfile);
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSignInWithGoogle = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Google sign-in failed:", error);
            throw error;
        }
    };

    const handleSignInWithEmail = async (email: string, password: string) => {
        try {
            await signInWithEmail(email, password);
        } catch (error) {
            console.error("Email sign-in failed:", error);
            throw error;
        }
    };

    const handleRegisterWithEmail = async (email: string, password: string, displayName: string) => {
        try {
            await registerWithEmail(email, password, displayName);
        } catch (error) {
            console.error("Registration failed:", error);
            throw error;
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error("Sign out failed:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                signInWithGoogle: handleSignInWithGoogle,
                signInWithEmail: handleSignInWithEmail,
                registerWithEmail: handleRegisterWithEmail,
                signOut: handleSignOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
