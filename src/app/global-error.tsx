'use client';

import React, { useEffect } from 'react';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalErrorBoundary({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        console.error('Captured by Clarix Workspace Global Error Boundary:', error);

        // Report critical boot crash to telemetry API
        const reportBoundaryError = async () => {
            try {
                await fetch('/api/errors/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: error.message || 'Next.js Global Boot Crash',
                        stack: error.stack,
                        severity: 'critical',
                        component: 'frontend',
                        metadata: JSON.stringify({
                            name: error.name,
                            digest: error.digest,
                            url: typeof window !== 'undefined' ? window.location.href : '',
                            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
                        }),
                    }),
                });
            } catch (e) {
                console.warn('Boundary telemetry transmission failed:', e);
            }
        };

        reportBoundaryError();
    }, [error]);

    return (
        <html lang="en">
            <body style={{
                margin: 0,
                padding: 0,
                background: '#07080a',
                color: '#fff',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingInline: '20px'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '580px',
                    background: 'rgba(15, 17, 23, 0.75)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(212, 168, 67, 0.15)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                    borderRadius: '16px',
                    padding: '36px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚨</div>
                    <h1 style={{
                        fontSize: '1.6rem',
                        fontWeight: 700,
                        margin: '0 0 8px 0',
                        letterSpacing: '-0.02em'
                    }}>
                        Global Workspace Collapse
                    </h1>
                    <p style={{
                        color: '#94a3b8',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        margin: '0 0 24px 0'
                    }}>
                        A critical bootstrapping error occurred in the workspace root layout. Clarix AI intercepted the thread.
                    </p>

                    {/* Developer Error Output (Dev Only) */}
                    {process.env.NODE_ENV !== 'production' && (
                        <div style={{
                            background: '#030405',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                            padding: '16px',
                            textAlign: 'left',
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: '0.72rem',
                            color: '#f87171',
                            maxHeight: '140px',
                            overflowY: 'auto',
                            marginBottom: '24px',
                            whiteSpace: 'pre-wrap'
                        }}>
                            <strong>{error.name}: {error.message}</strong>
                            {error.stack && `\n\n${error.stack}`}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button 
                            onClick={() => reset()}
                            style={{
                                background: '#d4a843',
                                border: 'none',
                                color: '#07080a',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                fontSize: '0.88rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 0 16px rgba(212, 168, 67, 0.2)'
                            }}
                        >
                            Force Restart Workspace
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
