"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mail,
    Lock,
    User,
    Eye,
    EyeOff,
    ArrowRight,
    Loader2,
    BookOpen,
    Sparkles
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./AuthModal.module.css";

// Google icon
const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20">
        <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
);

type AuthMode = "login" | "signup";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: AuthMode;
}

export function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { signInWithEmail, registerWithEmail, signInWithGoogle } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === "login") {
                await signInWithEmail(email, password);
                onClose();
            } else {
                await registerWithEmail(email, password, displayName || email.split('@')[0]);
                onClose();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithGoogle();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Google sign-in failed");
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className={styles.modal}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <BookOpen size={32} />
                        <Sparkles size={16} className={styles.sparkle} />
                    </div>
                    <h2>{mode === "login" ? "Welcome Back" : "Join Storyline"}</h2>
                    <p>
                        {mode === "login"
                            ? "Continue your reading journey"
                            : "Start your social reading adventure"}
                    </p>
                </div>

                {/* Google Button */}
                <div className={styles.oauthButtons}>
                    <button
                        className={styles.oauthBtn}
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                    >
                        <GoogleIcon />
                        Continue with Google
                    </button>
                </div>

                <div className={styles.divider}>
                    <span>or continue with email</span>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    {mode === "signup" && (
                        <div className={styles.inputGroup}>
                            <User size={18} />
                            <input
                                type="text"
                                placeholder="Display name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <Mail size={18} />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <Lock size={18} />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            minLength={6}
                        />
                        <button
                            type="button"
                            className={styles.togglePassword}
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 size={20} className={styles.spinner} />
                        ) : (
                            <>
                                {mode === "login" ? "Sign In" : "Create Account"}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Links */}
                <div className={styles.footer}>
                    {mode === "login" ? (
                        <button onClick={() => setMode("signup")}>Don't have an account? Sign up</button>
                    ) : (
                        <button onClick={() => setMode("login")}>Already have an account? Sign in</button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
