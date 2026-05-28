'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface TelemetryError {
    message: string;
    stack?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    component: 'frontend' | 'backend' | 'e2e';
    metadata?: string;
    timestamp: number;
}

interface TelemetryContextType {
    reportError: (params: {
        message: string;
        stack?: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        metadata?: Record<string, unknown>;
    }) => Promise<void>;
}

const TelemetryContext = createContext<TelemetryContextType | null>(null);

export function useTelemetry() {
    const context = useContext(TelemetryContext);
    if (!context) {
        throw new Error('useTelemetry must be used within a TelemetryProvider');
    }
    return context;
}

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
    const [localLogs, setLocalLogs] = useState<TelemetryError[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const reportError = async ({
        message,
        stack,
        severity = 'high',
        metadata,
    }: {
        message: string;
        stack?: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        metadata?: Record<string, unknown>;
    }) => {
        const payload = {
            message,
            stack,
            severity,
            component: 'frontend',
            metadata: JSON.stringify({
                href: typeof window !== 'undefined' ? window.location.href : '',
                userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
                ...metadata,
            }),
        };

        // Add to local state for dev floating console
        if (process.env.NODE_ENV !== 'production') {
            setLocalLogs((prev) => [
                { ...payload, component: 'frontend', timestamp: Date.now() },
                ...prev.slice(0, 49),
            ]);
        }

        try {
            await fetch('/api/errors/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        } catch (e) {
            // Fail silently on the client side so we never degrade user experience
            console.warn('Telemetry transmission failed:', e);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleError = (event: ErrorEvent) => {
            // Ignore standard hot-reloading errors that happen only in development local builds
            if (event.message?.includes('ResizeObserver') || event.message?.includes('Script error')) {
                return;
            }
            reportError({
                message: event.message || 'Unknown global client-side error',
                stack: event.error?.stack,
                severity: 'high',
                metadata: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                },
            });
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            let message = 'Unhandled Promise Rejection';
            let stack: string | undefined;

            if (reason instanceof Error) {
                message = reason.message;
                stack = reason.stack;
            } else if (typeof reason === 'string') {
                message = reason;
            } else if (reason) {
                try {
                    message = JSON.stringify(reason);
                } catch {
                    message = String(reason);
                }
            }

            reportError({
                message,
                stack,
                severity: 'high',
                metadata: {
                    type: 'promise_rejection',
                },
            });
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    const isDev = process.env.NODE_ENV !== 'production';

    return (
        <TelemetryContext.Provider value={{ reportError }}>
            {children}

            {/* Premium Telemetry Accordion/Console for non-production viewport */}
            {isDev && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '16px',
                        right: '16px',
                        zIndex: 99999,
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        maxWidth: '400px',
                        width: 'calc(100vw - 32px)',
                    }}
                >
                    {!isOpen ? (
                        localLogs.length > 0 && (
                            <button
                                onClick={() => setIsOpen(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    borderRadius: '8px',
                                    color: '#fca5a5',
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                    transition: 'all 0.2s',
                                    fontWeight: 'bold',
                                }}
                            >
                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1.5s infinite' }} />
                                Telemetry Alerts ({localLogs.length})
                            </button>
                        )
                    ) : (
                        <div
                            style={{
                                background: 'rgba(15, 23, 42, 0.95)',
                                backdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '12px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
                                color: '#e2e8f0',
                                display: 'flex',
                                flexDirection: 'column',
                                maxHeight: '350px',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    paddingBottom: '8px',
                                    marginBottom: '8px',
                                }}
                            >
                                <div style={{ fontWeight: 'bold', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>🛡️ Client Telemetry Feed</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setLocalLogs([])}
                                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '10px' }}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {localLogs.length === 0 ? (
                                    <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
                                        No unhandled exceptions caught yet.
                                    </div>
                                ) : (
                                    localLogs.map((log, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                borderLeft: '3px solid #f87171',
                                                padding: '6px 8px',
                                                borderRadius: '0 4px 4px 0',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '10px', marginBottom: '2px' }}>
                                                <span style={{ color: '#f87171', fontWeight: 'bold' }}>{log.severity.toUpperCase()}</span>
                                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <div style={{ wordBreak: 'break-all', fontWeight: 'bold', color: '#f1f5f9' }}>{log.message}</div>
                                            {log.stack && (
                                                <pre style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '9px', overflowX: 'auto', maxHeight: '60px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                                    {log.stack}
                                                </pre>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </TelemetryContext.Provider>
    );
}
