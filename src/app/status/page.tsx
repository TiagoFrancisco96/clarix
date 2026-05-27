'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import '../info-page.css';

interface ServiceCheck {
    name: string;
    status: 'ok' | 'error' | 'warning' | 'unconfigured';
    latency?: number;
    message?: string;
    provider?: string;
}

interface HealthResponse {
    timestamp: string;
    status: string;
    services: ServiceCheck[];
}

export default function StatusPage() {
    const [data, setData] = useState<HealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStatus = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const res = await fetch('/api/health');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) {
            console.error('Failed to retrieve system status:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Set page title and poll status every 30 seconds
    useEffect(() => {
        document.title = 'Status — Clarix AI';
        fetchStatus();

        const interval = setInterval(() => {
            fetchStatus(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchStatus]);

    function getStatusClass(status: string) {
        if (status === 'ok') return 'ok';
        if (status === 'warning') return 'warning';
        if (status === 'error') return 'error';
        return 'unconfigured';
    }

    function getLatencyClass(latency: number) {
        if (latency < 500) return 'fast';
        if (latency < 2000) return 'normal';
        return 'slow';
    }

    return (
        <div className="info-page">
            <div className="info-page__bg" />
            <nav className="info-page__nav">
                <Link href="/" className="info-page__nav-logo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2.5">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>Clarix AI</span>
                </Link>
                <Link href="/" className="info-page__nav-back">&larr; Back to Home</Link>
            </nav>

            <div className="info-page__content">
                <span className="info-page__badge">Live System Health</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: 'var(--space-6)' }}>
                    <div>
                        <h1 className="info-page__title" style={{ margin: 0 }}>
                            {loading ? 'Evaluating Systems...' : data?.status === 'all_systems_nominal' ? 'All Systems Nominal' : 'Partial Outage'}
                        </h1>
                        <p className="info-page__subtitle" style={{ margin: '4px 0 0 0' }}>
                            {loading ? 'Analyzing provider API latencies and workspace pipelines...' : 'Dynamic operational evaluation of all external model providers.'}
                        </p>
                    </div>

                    <button
                        onClick={() => fetchStatus(false)}
                        className="info-page__nav-back"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}
                        disabled={loading || refreshing}
                    >
                        <svg 
                            width="12" 
                            height="12" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2.5" 
                            className={loading || refreshing ? 'loading-spin' : ''}
                            style={{ transition: 'transform 0.5s ease' }}
                        >
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                        </svg>
                        {loading ? 'Checking...' : refreshing ? 'Refreshing...' : 'Check Live'}
                    </button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="status-item-skeleton" />
                        ))}
                    </div>
                ) : (
                    <div className="status-list">
                        {data?.services.map((svc) => (
                            <div key={svc.name} className="status-item-dynamic">
                                <div className="status-item__left">
                                    <span className="status-item__name">{svc.name}</span>
                                    {svc.provider && <span className="status-item__provider">{svc.provider}</span>}
                                </div>
                                <div className="status-item__right">
                                    {svc.latency !== undefined && (
                                        <span className={`status-latency status-latency--${getLatencyClass(svc.latency)}`}>
                                            {svc.latency}ms
                                        </span>
                                    )}
                                    <span className={`status-badge status-badge--${getStatusClass(svc.status)}`}>
                                        <span className="status-pulse-dot" />
                                        {svc.status === 'ok' ? 'Operational' : svc.status === 'warning' ? 'Degraded' : svc.status === 'error' ? 'Outage' : 'Unconfigured'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <h2 style={{ marginTop: 'var(--space-10)' }}>Service Level Agreement (SLA)</h2>
                <p>
                    Clarix AI routes your workloads across a globally distributed mesh network of AI models. Under ordinary operations, our system maintains **99.99% uptime** with direct routing path recovery inside 100ms.
                </p>

                <h2>Dynamic Heartbeat Monitor</h2>
                <p>
                    This dashboard queries our live services every 30 seconds to fetch absolute API latency metrics. If an external model provider (like OpenAI or Google AI) is offline, our **MoA Routing Engine** automatically redirects traffic to a fallback provider in real time, keeping your active workspace fully functional.
                </p>

                {data && (
                    <div style={{ marginTop: 'var(--space-8)', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <span>Last Checked: {new Date(data.timestamp).toLocaleTimeString()}</span>
                        <span>·</span>
                        <span>Auto-refresh active</span>
                    </div>
                )}
            </div>

            {/* Custom Dynamic Styling Blocks */}
            <style jsx global>{`
                .status-item-dynamic {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--space-4) var(--space-5);
                    background: rgba(20, 20, 22, 0.55);
                    backdrop-filter: blur(16px);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-lg);
                    transition: border-color var(--transition-base), transform var(--transition-fast);
                }
                .status-item-dynamic:hover {
                    border-color: rgba(212, 168, 67, 0.15);
                    transform: translateX(2px);
                }
                .status-item__left {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .status-item__provider {
                    font-size: 0.72rem;
                    color: var(--text-muted);
                }
                .status-item__right {
                    display: flex;
                    align-items: center;
                    gap: var(--space-4);
                }
                .status-latency {
                    font-family: var(--font-mono);
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                .status-latency--fast {
                    color: #2ecc71;
                    background: rgba(46, 204, 113, 0.1);
                }
                .status-latency--normal {
                    color: #f1c40f;
                    background: rgba(241, 196, 15, 0.1);
                }
                .status-latency--slow {
                    color: #e74c3c;
                    background: rgba(231, 76, 60, 0.1);
                }
                .status-badge {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    font-size: 0.75rem;
                    font-weight: 700;
                    padding: 4px 10px;
                    border-radius: 100px;
                    border: 1px solid transparent;
                }
                .status-badge--ok {
                    color: #2ecc71;
                    background: rgba(46, 204, 113, 0.05);
                    border-color: rgba(46, 204, 113, 0.15);
                }
                .status-badge--warning {
                    color: #f1c40f;
                    background: rgba(241, 196, 15, 0.05);
                    border-color: rgba(241, 196, 15, 0.15);
                }
                .status-badge--error {
                    color: #e74c3c;
                    background: rgba(231, 76, 60, 0.05);
                    border-color: rgba(231, 76, 60, 0.15);
                }
                .status-badge--unconfigured {
                    color: var(--text-muted);
                    background: rgba(255, 255, 255, 0.03);
                    border-color: var(--border-subtle);
                }
                .status-pulse-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    position: relative;
                }
                .status-badge--ok .status-pulse-dot {
                    background: #2ecc71;
                    box-shadow: 0 0 6px #2ecc71;
                    animation: heartbeat 2s infinite ease-in-out;
                }
                .status-badge--warning .status-pulse-dot {
                    background: #f1c40f;
                    box-shadow: 0 0 6px #f1c40f;
                    animation: heartbeat 1.5s infinite ease-in-out;
                }
                .status-badge--error .status-pulse-dot {
                    background: #e74c3c;
                    box-shadow: 0 0 6px #e74c3c;
                    animation: heartbeat 0.8s infinite ease-in-out;
                }
                .status-badge--unconfigured .status-pulse-dot {
                    background: #7f8c8d;
                }
                .status-item-skeleton {
                    height: 52px;
                    border-radius: var(--radius-lg);
                    background: rgba(255, 255, 255, 0.02);
                    animation: shimmer 1.5s infinite linear;
                    background: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0.01) 25%,
                        rgba(255, 255, 255, 0.03) 50%,
                        rgba(255, 255, 255, 0.01) 75%
                    );
                    background-size: 200% 100%;
                }
                @keyframes heartbeat {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.4); opacity: 0.6; }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .loading-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
