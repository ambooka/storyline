"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, Info, X, AlertCircle } from "lucide-react";
import styles from "./Toast.module.css";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toast: (options: Omit<Toast, "id">) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const Icon = ICONS[toast.type];

    return (
        <motion.div
            className={`${styles.toast} ${styles[toast.type]}`}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            layout
        >
            <div className={styles.iconWrapper}>
                <Icon size={20} />
            </div>
            <div className={styles.content}>
                <h4>{toast.title}</h4>
                {toast.message && <p>{toast.message}</p>}
            </div>
            <button className={styles.closeBtn} onClick={() => onRemove(toast.id)}>
                <X size={16} />
            </button>
        </motion.div>
    );
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((options: Omit<Toast, "id">) => {
        const id = Math.random().toString(36).slice(2);
        const duration = options.duration ?? 4000;

        setToasts((prev) => [...prev.slice(-4), { ...options, id }]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    const toast = useCallback((options: Omit<Toast, "id">) => addToast(options), [addToast]);
    const success = useCallback((title: string, message?: string) => addToast({ type: "success", title, message }), [addToast]);
    const error = useCallback((title: string, message?: string) => addToast({ type: "error", title, message, duration: 6000 }), [addToast]);
    const warning = useCallback((title: string, message?: string) => addToast({ type: "warning", title, message }), [addToast]);
    const info = useCallback((title: string, message?: string) => addToast({ type: "info", title, message }), [addToast]);

    return (
        <ToastContext.Provider value={{ toast, success, error, warning, info }}>
            {children}
            <div className={styles.container}>
                <AnimatePresence mode="popLayout">
                    {toasts.map((t) => (
                        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}
