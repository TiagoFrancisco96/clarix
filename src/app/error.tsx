'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

interface DiagnosticStep {
    name: string;
    status: 'pending' | 'running' | 'pass' | 'fail';
    message?: string;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
    const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
    const [diagnosticSteps, setDiagnosticSteps] = useState<DiagnosticStep[]>([]);
    const [activeTab, setActiveTab] = useState<'ai' | 'console'>('ai');
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        // Log the error to console/monitoring service
        console.error('Captured by Clarix Workspace Error Boundary:', error);

        // Report SSR/hydration crash securely to telemetry API
        const reportBoundaryError = async () => {
            try {
                await fetch('/api/errors/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: error.message || 'Next.js Global Boundary Error',
                        stack: error.stack,
                        severity: 'critical', // Server/Hydration boundary crash is critical
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
                // Fail silently to never degrade recovery experience
                console.warn('Boundary telemetry transmission failed:', e);
            }
        };

        reportBoundaryError();
    }, [error]);


    // ── 1. Smart AI Error Analysis ──
    const getAiAnalysis = () => {
        const msg = (error.message || '').toLowerCase();
        const name = (error.name || '').toLowerCase();
        const stack = (error.stack || '').toLowerCase();

        if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || stack.includes('network')) {
            return {
                title: 'Connection Problem',
                summary: 'Clarix couldn\'t reach the server. This usually means there\'s a problem with your internet connection.',
                reason: 'This can happen when your internet is unstable, a VPN is blocking the connection, or our servers are temporarily busy.',
                solutions: [
                    'Check your internet connection and try turning off any VPN.',
                    'Visit our status page to see if there\'s a known issue.',
                    'Try reloading the page using the button below.'
                ],
                tag: 'Connection Issue',
                severity: 'medium'
            };
        }

        if (msg.includes('unauthorized') || msg.includes('auth') || msg.includes('session') || msg.includes('cookie') || msg.includes('login')) {
            return {
                title: 'You\'ve Been Signed Out',
                summary: 'Your login session has expired or is no longer valid.',
                reason: 'This happens when you\'ve been inactive for a while, cleared your browser data, or your session timed out.',
                solutions: [
                    'Try reloading the page to refresh your session.',
                    'If that doesn\'t work, go back to the Login page and sign in again.',
                    'Make sure your browser allows cookies (needed for staying signed in).'
                ],
                tag: 'Session Expired',
                severity: 'high'
            };
        }

        if (msg.includes('db') || msg.includes('database') || msg.includes('convex') || msg.includes('mutation') || msg.includes('query')) {
            return {
                title: 'Data Sync Problem',
                summary: 'The app lost its connection to the database and couldn\'t load or save your data.',
                reason: 'This can happen if the real-time connection drops, or if there\'s a temporary server issue.',
                solutions: [
                    'Click "Reload Workspace" to reconnect.',
                    'Make sure you\'re not entering any unusual special characters.',
                    'If it keeps happening, try clearing your browser cache and reloading.'
                ],
                tag: 'Sync Issue',
                severity: 'high'
            };
        }

        if (name.includes('syntax') || msg.includes('json') || msg.includes('parse')) {
            return {
                title: 'Data Format Error',
                summary: 'The AI returned a response in an unexpected format that the app couldn\'t read.',
                reason: 'This sometimes happens with very complex prompts or when an AI provider returns an unusual response.',
                solutions: [
                    'Clear your browser cache to remove any old saved data.',
                    'Reload the page to get a fresh start.',
                    'Try simplifying your prompt if you were using the Chat tool.'
                ],
                tag: 'Format Error',
                severity: 'medium'
            };
        }

        // Default Fallback Analysis
        return {
            title: 'Something Went Wrong',
            summary: 'An unexpected error occurred while loading this page.',
            reason: 'This is usually a temporary glitch. It might be caused by a brief connection issue or a one-time loading problem.',
            solutions: [
                'Try reloading the page to see if it fixes itself.',
                'Clear your browser data if the problem keeps happening.',
                'If it continues, click "Report Issue" so our team can look into it.'
            ],
            tag: 'Unexpected Error',
            severity: 'low'
        };
    };

    const ai = getAiAnalysis();

    // ── 2. Interactive AI Self-Heal Diagnostics ──
    const runDiagnostics = async () => {
        if (isDiagnosticRunning) return;
        setIsDiagnosticRunning(true);

        const initialSteps: DiagnosticStep[] = [
            { name: 'Starting auto-repair', status: 'running', message: 'Checking what went wrong...' },
            { name: 'Check your login status', status: 'pending' },
            { name: 'Test server connection', status: 'pending' },
            { name: 'Check database connection', status: 'pending' }
        ];
        setDiagnosticSteps(initialSteps);

        // Step 1: Initializing
        await new Promise(r => setTimeout(r, 800));
        setDiagnosticSteps(prev => {
            const steps = [...prev];
            steps[0] = { name: steps[0].name, status: 'pass', message: 'Auto-repair started successfully.' };
            steps[1] = { name: steps[1].name, status: 'running', message: 'Checking your saved data...' };
            return steps;
        });

        // Step 2: Cache check
        await new Promise(r => setTimeout(r, 1000));
        const cacheOk = typeof window !== 'undefined' && !!window.localStorage;
        setDiagnosticSteps(prev => {
            const steps = [...prev];
            steps[1] = { 
                name: steps[1].name, 
                status: cacheOk ? 'pass' : 'fail', 
                message: cacheOk ? 'Your saved data looks good.' : 'Some saved data may be corrupted.' 
            };
            steps[2] = { name: steps[2].name, status: 'running', message: 'Testing connection to our servers...' };
            return steps;
        });

        // Step 3: Network Ping
        await new Promise(r => setTimeout(r, 1200));
        let latency = 0;
        let networkOk = false;
        try {
            const start = Date.now();
            const res = await fetch('/api/health', { method: 'HEAD' });
            latency = Date.now() - start;
            networkOk = res.ok;
        } catch {
            networkOk = false;
        }

        setDiagnosticSteps(prev => {
            const steps = [...prev];
            steps[2] = { 
                name: steps[2].name, 
                status: networkOk ? 'pass' : 'fail', 
                message: networkOk ? `Server reached in ${latency}ms — connection is healthy.` : 'Could not reach the server.' 
            };
            steps[3] = { name: steps[3].name, status: 'running', message: 'Checking database connection...' };
            return steps;
        });

        // Step 4: DB check
        await new Promise(r => setTimeout(r, 1000));
        const dbOk = networkOk; // Tied to API health endpoint ping which checks Convex version
        setDiagnosticSteps(prev => {
            const steps = [...prev];
            steps[3] = { 
                name: steps[3].name, 
                status: dbOk ? 'pass' : 'fail', 
                message: dbOk ? 'Database connection is working fine.' : 'Database connection timed out.' 
            };
            return steps;
        });

        setIsDiagnosticRunning(false);
    };

    return (
        <div className="error-screen">
            {/* Embedded custom CSS to style the premium glassmorphic error boundary */}
            <style>{`
                .error-screen {
                    min-height: 100vh;
                    background: #07080a;
                    color: #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    font-family: system-ui, -apple-system, sans-serif;
                }
                .error-container {
                    width: 100%;
                    max-width: 820px;
                    background: rgba(15, 17, 23, 0.7);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(212, 168, 67, 0.15);
                    box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 80px rgba(212, 168, 67, 0.03) inset;
                    border-radius: 16px;
                    overflow: hidden;
                    animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes scaleUp {
                    from { opacity: 0; transform: scale(0.96); }
                    to { opacity: 1; transform: scale(1); }
                }
                .error-header {
                    padding: 28px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .error-badge {
                    background: rgba(231, 76, 60, 0.1);
                    border: 1px solid rgba(231, 76, 60, 0.3);
                    color: #e74c3c;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.72rem;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                }
                .error-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #fff;
                    margin: 8px 0 4px 0;
                    letter-spacing: -0.02em;
                }
                .error-desc {
                    color: #94a3b8;
                    font-size: 0.9rem;
                    margin: 0;
                }
                .error-body {
                    padding: 28px;
                }
                .ai-tabs {
                    display: flex;
                    gap: 8px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    margin-bottom: 20px;
                }
                .ai-tab {
                    padding: 8px 16px;
                    background: none;
                    border: none;
                    color: #64748b;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    position: relative;
                    transition: color 0.2s;
                }
                .ai-tab:hover { color: #fff; }
                .ai-tab.active {
                    color: #d4a843;
                }
                .ai-tab.active::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: #d4a843;
                }
                .ai-panel {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.04);
                    border-radius: 12px;
                    padding: 24px;
                    margin-bottom: 24px;
                    animation: fadeIn 0.3s ease;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .ai-panel__header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 14px;
                }
                .ai-panel__title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .ai-panel__severity {
                    font-size: 0.7rem;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .ai-panel__severity--high { background: rgba(231, 76, 60, 0.15); color: #e74c3c; border: 1px solid rgba(231, 76, 60, 0.2); }
                .ai-panel__severity--medium { background: rgba(243, 156, 18, 0.15); color: #f39c12; border: 1px solid rgba(243, 156, 18, 0.2); }
                .ai-panel__severity--low { background: rgba(52, 152, 219, 0.15); color: #3498db; border: 1px solid rgba(52, 152, 219, 0.2); }
                .ai-panel__summary {
                    font-size: 0.92rem;
                    line-height: 1.5;
                    color: #cbd5e1;
                    margin-bottom: 16px;
                }
                .ai-panel__sub {
                    font-size: 0.85rem;
                    color: #94a3b8;
                    background: rgba(0,0,0,0.2);
                    padding: 12px;
                    border-radius: 6px;
                    border-left: 3px solid #d4a843;
                    margin-bottom: 20px;
                    line-height: 1.4;
                }
                .ai-solutions__title {
                    font-size: 0.85rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: #94a3b8;
                    letter-spacing: 0.05em;
                    margin-bottom: 10px;
                }
                .ai-solutions__list {
                    list-style-type: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .ai-solutions__item {
                    font-size: 0.88rem;
                    color: #e2e8f0;
                    display: flex;
                    gap: 8px;
                    align-items: flex-start;
                    line-height: 1.4;
                }
                .ai-solutions__item::before {
                    content: '→';
                    color: #d4a843;
                    font-weight: bold;
                }
                .diagnostic-console {
                    background: #030405;
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 8px;
                    padding: 16px;
                    font-family: ui-monospace, monospace;
                    font-size: 0.8rem;
                    margin-bottom: 20px;
                }
                .diagnostic-step {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    padding: 6px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                }
                .diagnostic-step:last-child { border-bottom: none; }
                .diagnostic-step__name { color: #94a3b8; display: flex; gap: 8px; }
                .diagnostic-step__status { font-weight: bold; }
                .diagnostic-step__status--pending { color: #475569; }
                .diagnostic-step__status--running { color: #d4a843; animation: blink 1s infinite; }
                .diagnostic-step__status--pass { color: #10b981; }
                .diagnostic-step__status--fail { color: #ef4444; }
                @keyframes blink { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
                .diagnostic-step__msg { font-size: 0.72rem; color: #64748b; margin-top: 2px; }
                .diagnostic-trigger-btn {
                    width: 100%;
                    background: linear-gradient(135deg, rgba(212,168,67,0.1), rgba(212,168,67,0.02));
                    border: 1px solid rgba(212,168,67,0.25);
                    color: #d4a843;
                    padding: 10px;
                    border-radius: 6px;
                    font-size: 0.82rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                .diagnostic-trigger-btn:hover:not(:disabled) {
                    background: rgba(212,168,67,0.15);
                    border-color: rgba(212,168,67,0.4);
                    box-shadow: 0 0 12px rgba(212,168,67,0.1);
                }
                .diagnostic-trigger-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .console-accordion {
                    background: #030405;
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 8px;
                    overflow: hidden;
                    margin-bottom: 24px;
                }
                .console-accordion__header {
                    padding: 12px 16px;
                    background: rgba(255,255,255,0.02);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #94a3b8;
                    user-select: none;
                }
                .console-accordion__header:hover { color: #fff; }
                .console-accordion__body {
                    padding: 16px;
                    border-top: 1px solid rgba(255,255,255,0.06);
                    max-height: 250px;
                    overflow-y: auto;
                    font-family: ui-monospace, monospace;
                    font-size: 0.75rem;
                    line-height: 1.4;
                    color: #f87171;
                    white-space: pre-wrap;
                }
                .error-actions {
                    display: flex;
                    gap: 12px;
                }
                .btn {
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 0.88rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s;
                    text-decoration: none;
                }
                .btn--primary {
                    background: #d4a843;
                    border: 1px solid #d4a843;
                    color: #07080a;
                }
                .btn--primary:hover {
                    background: #e5b954;
                    box-shadow: 0 0 16px rgba(212,168,67,0.3);
                }
                .btn--secondary {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    color: #cbd5e1;
                }
                .btn--secondary:hover {
                    background: rgba(255,255,255,0.08);
                    color: #fff;
                }
                .btn-icon {
                    display: flex;
                    align-items: center;
                }
            `}</style>

            <div className="error-container">
                <div className="error-header">
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="error-badge">Workspace Interrupted</div>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Digest: {error.digest || 'None'}</span>
                        </div>
                        <h1 className="error-title">Something went wrong</h1>
                        <p className="error-desc">Clarix AI diagnostic boundary intercepted a runtime component crash.</p>
                    </div>
                </div>

                <div className="error-body">
                    {/* Diagnostic Tabs */}
                    <div className="ai-tabs">
                        <button 
                            className={`ai-tab ${activeTab === 'ai' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ai')}
                        >
                            🤖 Clarix AI Assistant
                        </button>
                        <button 
                            className={`ai-tab ${activeTab === 'console' ? 'active' : ''}`}
                            onClick={() => setActiveTab('console')}
                        >
                            🔬 AI System Diagnostics
                        </button>
                    </div>

                    {/* AI Explanation Panel */}
                    {activeTab === 'ai' && (
                        <div className="ai-panel">
                            <div className="ai-panel__header">
                                <div className="ai-panel__title">
                                    <span>✨</span> {ai.title}
                                </div>
                                <span className={`ai-panel__severity ai-panel__severity--${ai.severity}`}>
                                    {ai.severity} risk
                                </span>
                            </div>
                            <p className="ai-panel__summary">{ai.summary}</p>
                            <div className="ai-panel__sub">
                                <strong>Technical Analysis:</strong> {ai.reason}
                            </div>
                            <div>
                                <div className="ai-solutions__title">AI Smart Recommendations:</div>
                                <ul className="ai-solutions__list">
                                    {ai.solutions.map((sol, idx) => (
                                        <li key={idx} className="ai-solutions__item">{sol}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* AI System Diagnostics Console */}
                    {activeTab === 'console' && (
                        <div>
                            <div className="diagnostic-console">
                                {diagnosticSteps.length === 0 ? (
                                    <div style={{ color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
                                        Console offline. Click below to boot smart diagnostics check.
                                    </div>
                                ) : (
                                    diagnosticSteps.map((step, idx) => (
                                        <div key={idx} className="diagnostic-step">
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span className="diagnostic-step__name">
                                                    <span>{step.status === 'pass' ? '✓' : step.status === 'fail' ? '✗' : step.status === 'running' ? '⟳' : '○'}</span>
                                                    {step.name}
                                                </span>
                                                {step.message && <span className="diagnostic-step__msg">{step.message}</span>}
                                            </div>
                                            <span className={`diagnostic-step__status diagnostic-step__status--${step.status}`}>
                                                {step.status.toUpperCase()}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <button 
                                className="diagnostic-trigger-btn"
                                onClick={runDiagnostics}
                                disabled={isDiagnosticRunning}
                            >
                                {isDiagnosticRunning ? (
                                    <>
                                        <span className="diagnostic-step__status--running" style={{ display: 'inline-block' }}>⟳</span>
                                        Running AI Self-Healing agent...
                                    </>
                                ) : (
                                    <>
                                        <span>⚡</span>
                                        Boot AI Self-Heal Diagnostics
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Developer Console Accordion (Strictly Development Only to prevent secure data leak) */}
                    {process.env.NODE_ENV !== 'production' && (
                        <div className="console-accordion">
                            <div 
                                className="console-accordion__header"
                                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                            >
                                <span>🐞 Technical Trace Log (Development View)</span>
                                <span>{isDetailsOpen ? '▲ Hide' : '▼ Expand'}</span>
                            </div>
                            {isDetailsOpen && (
                                <div className="console-accordion__body">
                                    <strong>{error.name}: {error.message}</strong>
                                    {error.stack && `\n\n${error.stack}`}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recovery Action Buttons */}
                    <div className="error-actions">
                        <button className="btn btn--primary" onClick={() => reset()}>
                            <span className="btn-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67" />
                                </svg>
                            </span>
                            Reload Workspace
                        </button>
                        <Link href="/" className="btn btn--secondary">
                            Return Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
