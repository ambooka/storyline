"use client";

import { forwardRef, InputHTMLAttributes, ReactNode, useState } from "react";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    success?: string;
    hint?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

/**
 * Reusable Input Component
 * Consistent styling with validation states.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            error,
            success,
            hint,
            leftIcon,
            rightIcon,
            type = "text",
            className = "",
            ...props
        },
        ref
    ) => {
        const [showPassword, setShowPassword] = useState(false);
        const isPassword = type === "password";
        const inputType = isPassword ? (showPassword ? "text" : "password") : type;

        const hasError = !!error;
        const hasSuccess = !!success;

        return (
            <div className={`${styles.wrapper} ${className}`}>
                {label && <label className={styles.label}>{label}</label>}
                <div
                    className={`${styles.inputWrapper} ${hasError ? styles.error : ""} ${hasSuccess ? styles.success : ""}`}
                >
                    {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
                    <input
                        ref={ref}
                        type={inputType}
                        className={styles.input}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            className={styles.passwordToggle}
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    )}
                    {rightIcon && !isPassword && (
                        <span className={styles.rightIcon}>{rightIcon}</span>
                    )}
                    {hasError && !isPassword && (
                        <span className={styles.statusIcon}>
                            <AlertCircle size={18} />
                        </span>
                    )}
                    {hasSuccess && !isPassword && (
                        <span className={styles.statusIcon}>
                            <CheckCircle size={18} />
                        </span>
                    )}
                </div>
                {(error || success || hint) && (
                    <span
                        className={`${styles.message} ${hasError ? styles.errorText : ""} ${hasSuccess ? styles.successText : ""}`}
                    >
                        {error || success || hint}
                    </span>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
