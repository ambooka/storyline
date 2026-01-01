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
    FolderOpen,
} from "lucide-react";
import { EpubParser, saveBook } from "@/lib/epub";
import styles from "./ImportModal.module.css";

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBookImported: (bookId: string) => void;
}

interface FileImportStatus {
    file: File;
    status: "pending" | "parsing" | "success" | "error";
    title?: string;
    author?: string;
    cover?: string | null;
    error?: string;
    bookId?: string;
}

type ImportState = "idle" | "processing" | "complete";

export default function ImportModal({
    isOpen,
    onClose,
    onBookImported,
}: ImportModalProps) {
    const [importState, setImportState] = useState<ImportState>("idle");
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState<FileImportStatus[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
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

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(Array.from(e.target.files));
        }
    };

    const processFiles = async (selectedFiles: File[]) => {
        // Filter only epub files
        const epubFiles = selectedFiles.filter(file => 
            file.name.endsWith('.epub') || 
            file.type === 'application/epub+zip' ||
            file.type === 'application/epub'
        );

        if (epubFiles.length === 0) {
            setError("No valid ePub files found. Please select .epub files.");
            return;
        }

        // Initialize file statuses
        const fileStatuses: FileImportStatus[] = epubFiles.map(file => ({
            file,
            status: "pending" as const,
        }));

        setFiles(fileStatuses);
        setCurrentIndex(0);
        setImportState("processing");
        setError(null);

        // Process files one by one
        for (let i = 0; i < fileStatuses.length; i++) {
            setCurrentIndex(i);
            
            // Update status to parsing
            setFiles(prev => prev.map((f, idx) => 
                idx === i ? { ...f, status: "parsing" } : f
            ));

            try {
                const parser = new EpubParser();
                const info = await parser.loadFromFile(fileStatuses[i].file);
                parser.destroy();

                // Save the book
                const savedBook = await saveBook(fileStatuses[i].file, {
                    title: info.title,
                    author: info.author,
                    cover: info.cover,
                });

                // Update status to success
                setFiles(prev => prev.map((f, idx) => 
                    idx === i ? { 
                        ...f, 
                        status: "success",
                        title: info.title,
                        author: info.author,
                        cover: info.cover,
                        bookId: savedBook.id,
                    } : f
                ));

                // Notify parent
                onBookImported(savedBook.id);

            } catch (err) {
                console.error(`Failed to import ${fileStatuses[i].file.name}:`, err);
                setFiles(prev => prev.map((f, idx) => 
                    idx === i ? { 
                        ...f, 
                        status: "error",
                        error: "Failed to parse or save book",
                    } : f
                ));
            }
        }

        setImportState("complete");
    };

    const handleClose = () => {
        setImportState("idle");
        setFiles([]);
        setCurrentIndex(0);
        setError(null);
        setDragActive(false);
        onClose();
    };

    const resetState = () => {
        setImportState("idle");
        setFiles([]);
        setCurrentIndex(0);
        setError(null);
    };

    // Use portal to render in document.body
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    const successCount = files.filter(f => f.status === "success").length;
    const errorCount = files.filter(f => f.status === "error").length;

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
                        initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
                        animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                        exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        {/* Header */}
                        <div className={styles.header}>
                            <h2 className={styles.title}>Import Books</h2>
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
                                            multiple
                                        />
                                        <div className={styles.dropIcon}>
                                            <Upload size={40} />
                                        </div>
                                        <p className={styles.dropText}>
                                            <strong>Drop your ePub files here</strong>
                                            <br />
                                            or click to browse
                                        </p>
                                        <span className={styles.dropHint}>
                                            <FolderOpen size={14} /> Select multiple files for bulk import
                                        </span>
                                    </div>

                                    {error && (
                                        <div className={styles.errorBanner}>
                                            <AlertCircle size={16} />
                                            <span>{error}</span>
                                        </div>
                                    )}

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

                            {importState === "processing" && (
                                <div className={styles.processingState}>
                                    <div className={styles.progressHeader}>
                                        <Loader2 size={24} className={styles.spinner} />
                                        <span>Importing {currentIndex + 1} of {files.length} books...</span>
                                    </div>
                                    <div className={styles.fileList}>
                                        {files.map((f, idx) => (
                                            <div key={idx} className={`${styles.fileItem} ${styles[f.status]}`}>
                                                {f.status === "pending" && <FileText size={16} />}
                                                {f.status === "parsing" && <Loader2 size={16} className={styles.spinnerSmall} />}
                                                {f.status === "success" && <CheckCircle size={16} />}
                                                {f.status === "error" && <AlertCircle size={16} />}
                                                <span className={styles.fileName}>
                                                    {f.title || f.file.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {importState === "complete" && (
                                <div className={styles.completeState}>
                                    <div className={styles.completeSummary}>
                                        {successCount > 0 && (
                                            <div className={styles.successSummary}>
                                                <CheckCircle size={32} />
                                                <span>{successCount} book{successCount !== 1 ? 's' : ''} imported</span>
                                            </div>
                                        )}
                                        {errorCount > 0 && (
                                            <div className={styles.errorSummary}>
                                                <AlertCircle size={20} />
                                                <span>{errorCount} failed</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.fileList}>
                                        {files.map((f, idx) => (
                                            <div key={idx} className={`${styles.fileItem} ${styles[f.status]}`}>
                                                {f.status === "success" && <CheckCircle size={16} />}
                                                {f.status === "error" && <AlertCircle size={16} />}
                                                <span className={styles.fileName}>
                                                    {f.title || f.file.name}
                                                </span>
                                                {f.author && <span className={styles.fileAuthor}>{f.author}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {importState === "complete" && (
                            <div className={styles.footer}>
                                <button className={styles.cancelBtn} onClick={resetState}>
                                    Import More
                                </button>
                                <button className={styles.importBtn} onClick={handleClose}>
                                    Done
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
