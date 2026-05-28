'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

/* ── Types ── */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration: number;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType, duration?: number) => void;
    toasts: Toast[];
}

const ToastContext = createContext<ToastContextValue>({
    toast: () => {},
    toasts: [],
});

export const useToast = () => useContext(ToastContext);

/* ── Provider ── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setToasts(prev => [...prev.slice(-4), { id, type, message, duration }]); // Max 5 toasts

        const timer = setTimeout(() => removeToast(id), duration);
        timersRef.current.set(id, timer);
    }, [removeToast]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            timersRef.current.forEach(timer => clearTimeout(timer));
        };
    }, []);

    const icons: Record<ToastType, string> = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
    };

    return (
        <ToastContext.Provider value={{ toast, toasts }}>
            {children}

            {/* Toast Container */}
            <div className="toast-container" role="alert" aria-live="polite">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`toast toast--${t.type}`}
                        onClick={() => removeToast(t.id)}
                    >
                        <span className="toast__icon">{icons[t.type]}</span>
                        <span className="toast__message">{t.message}</span>
                        <button className="toast__close" aria-label="Dismiss">×</button>

                        {/* Auto-dismiss progress bar */}
                        <div
                            className="toast__progress"
                            style={{ animationDuration: `${t.duration}ms` }}
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
