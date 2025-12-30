"use client";

import { ReactNode, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.css";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: "sm" | "md" | "lg" | "full";
    showClose?: boolean;
    closeOnOverlay?: boolean;
    closeOnEscape?: boolean;
}

/**
 * Reusable Modal Component
 * Accessible modal with animations and keyboard support.
 */
export function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = "md",
    showClose = true,
    closeOnOverlay = true,
    closeOnEscape = true,
}: ModalProps) {
    // Handle escape key
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape" && closeOnEscape) {
            onClose();
        }
    }, [onClose, closeOnEscape]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, handleEscape]);

    if (typeof window === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className={styles.wrapper}>
                    {/* Overlay */}
                    <motion.div
                        className={styles.overlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeOnOverlay ? onClose : undefined}
                    />

                    {/* Modal */}
                    <motion.div
                        className={`${styles.modal} ${styles[size]}`}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={title ? "modal-title" : undefined}
                    >
                        {(title || showClose) && (
                            <div className={styles.header}>
                                {title && <h2 id="modal-title">{title}</h2>}
                                {showClose && (
                                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        )}
                        <div className={styles.content}>{children}</div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
