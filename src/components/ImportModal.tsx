"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Upload,
    FileText,
    Cloud,
    CheckCircle,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { EpubParser, saveBook } from "@/lib/epub";
import styles from "./ImportModal.module.css";

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBookImported: (bookId: string) => void;
}

type ImportState = "idle" | "parsing" | "success" | "error";

export default function ImportModal({
    isOpen,
    onClose,
    onBookImported,
}: ImportModalProps) {
    const [importState, setImportState] = useState<ImportState>("idle");
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [bookInfo, setBookInfo] = useState<{
        title: string;
        author: string;
        cover: string | null;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const processFile = async (file: File) => {
        // Validate file type
        const validTypes = [
            "application/epub+zip",
            "application/epub",
            ".epub",
        ];
        const isEpub =
            validTypes.includes(file.type) || file.name.endsWith(".epub");

        if (!isEpub) {
            setError("Please upload an ePub file");
            setImportState("error");
            return;
        }

        setSelectedFile(file);
        setImportState("parsing");
        setError(null);

        try {
            const parser = new EpubParser();
            const info = await parser.loadFromFile(file);
            setBookInfo({
                title: info.title,
                author: info.author,
                cover: info.cover,
            });
            parser.destroy();
            setImportState("success");
        } catch (err) {
            console.error("Failed to parse ePub:", err);
            setError("Failed to parse ePub file. Please try another file.");
            setImportState("error");
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!selectedFile || !bookInfo) return;

        setImportState("parsing");
        try {
            const savedBook = await saveBook(selectedFile, bookInfo);
            onBookImported(savedBook.id);
            handleClose();
        } catch (err) {
            console.error("Failed to save book:", err);
            setError("Failed to save book. Please try again.");
            setImportState("error");
        }
    };

    const handleClose = () => {
        setImportState("idle");
        setSelectedFile(null);
        setBookInfo(null);
        setError(null);
        setDragActive(false);
        onClose();
    };

    const resetState = () => {
        setImportState("idle");
        setSelectedFile(null);
        setBookInfo(null);
        setError(null);
    };

    // Use portal to render in document.body
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className={styles.backdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className={styles.modal}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        {/* Header */}
                        <div className={styles.header}>
                            <h2 className={styles.title}>Import Book</h2>
                            <button className={styles.closeBtn} onClick={handleClose}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className={styles.content}>
                            {importState === "idle" && (
                                <>
                                    {/* Drop Zone */}
                                    <div
                                        className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ""}`}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".epub,application/epub+zip"
                                            onChange={handleFileSelect}
                                            className={styles.fileInput}
                                        />
                                        <div className={styles.dropIcon}>
                                            <Upload size={40} />
                                        </div>
                                        <p className={styles.dropText}>
                                            <strong>Drop your ePub here</strong>
                                            <br />
                                            or click to browse
                                        </p>
                                        <span className={styles.dropHint}>
                                            Supports .epub files
                                        </span>
                                    </div>

                                    {/* Divider */}
                                    <div className={styles.divider}>
                                        <span>or</span>
                                    </div>

                                    {/* Cloud Options */}
                                    <div className={styles.cloudOptions}>
                                        <button className={styles.cloudBtn} disabled>
                                            <Cloud size={20} />
                                            Google Drive
                                            <span className={styles.comingSoon}>Soon</span>
                                        </button>
                                        <button className={styles.cloudBtn} disabled>
                                            <Cloud size={20} />
                                            Dropbox
                                            <span className={styles.comingSoon}>Soon</span>
                                        </button>
                                    </div>
                                </>
                            )}

                            {importState === "parsing" && (
                                <div className={styles.stateContainer}>
                                    <Loader2 size={48} className={styles.spinner} />
                                    <p>Parsing your book...</p>
                                </div>
                            )}

                            {importState === "success" && bookInfo && (
                                <div className={styles.successState}>
                                    <div className={styles.bookPreview}>
                                        {bookInfo.cover ? (
                                            <img
                                                src={bookInfo.cover}
                                                alt={bookInfo.title}
                                                className={styles.bookCover}
                                            />
                                        ) : (
                                            <div className={styles.bookCoverPlaceholder}>
                                                <FileText size={40} />
                                            </div>
                                        )}
                                        <div className={styles.bookMeta}>
                                            <h3 className={styles.bookTitle}>{bookInfo.title}</h3>
                                            <p className={styles.bookAuthor}>{bookInfo.author}</p>
                                        </div>
                                    </div>
                                    <div className={styles.successIcon}>
                                        <CheckCircle size={24} />
                                        <span>Ready to import</span>
                                    </div>
                                </div>
                            )}

                            {importState === "error" && (
                                <div className={styles.errorState}>
                                    <AlertCircle size={48} />
                                    <p>{error}</p>
                                    <button className={styles.retryBtn} onClick={resetState}>
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {importState === "success" && (
                            <div className={styles.footer}>
                                <button className={styles.cancelBtn} onClick={resetState}>
                                    Cancel
                                </button>
                                <button className={styles.importBtn} onClick={handleImport}>
                                    Add to Library
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}
