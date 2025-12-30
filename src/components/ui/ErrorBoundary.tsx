"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import styles from "./ErrorBoundary.module.css";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: string;
}

/**
 * Global Error Boundary
 * Catches JavaScript errors anywhere in the child component tree.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: "" };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: error.message };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Error caught by boundary:", error, errorInfo);
        // In production, send to error tracking service
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: "" });
    };

    handleGoHome = () => {
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className={styles.container}>
                    <div className={styles.content}>
                        <div className={styles.iconWrapper}>
                            <AlertTriangle size={48} />
                        </div>
                        <h2>Something went wrong</h2>
                        <p className={styles.message}>
                            We encountered an unexpected error. Don't worry, your reading progress is saved.
                        </p>
                        {process.env.NODE_ENV === "development" && this.state.errorInfo && (
                            <pre className={styles.errorDetails}>
                                {this.state.errorInfo}
                            </pre>
                        )}
                        <div className={styles.actions}>
                            <button className={styles.retryBtn} onClick={this.handleRetry}>
                                <RefreshCw size={18} />
                                Try Again
                            </button>
                            <button className={styles.homeBtn} onClick={this.handleGoHome}>
                                <Home size={18} />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
