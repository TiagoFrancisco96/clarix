'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import './admin.css';

/* ── Types ── */
interface ServiceCheck {
    name: string;
    status: 'ok' | 'error' | 'warning' | 'unconfigured';
    latency?: number;
    message?: string;
    provider?: string;
}

interface EnvCheck {
    name: string;
    set: boolean;
    masked: string;
    category: string;
}

interface DbCheck {
    name: string;
    status: 'ok' | 'error';
    rowCount?: number;
    message?: string;
}

interface FeatureCheck {
    name: string;
    route: string;
    status: 'ready' | 'blocked';
    deps: string[];
    category: string;
}

interface HealthData {
    timestamp: string;
    services: ServiceCheck[];
    envVars: EnvCheck[];
    database: DbCheck[];
    features: FeatureCheck[];
}

type Tab = 'overview' | 'services' | 'env' | 'database' | 'features' | 'flows';

/* ── Flow Test Types ── */
interface TestStep {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'pass' | 'fail';
    time?: number;
    error?: string;
}

interface TestFlow {
    id: string;
    name: string;
    description: string;
    steps: TestStep[];
}

/* ── Component ── */
export default function AdminPage() {
    const [data, setData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [flows, setFlows] = useState<TestFlow[]>(getInitialFlows());
    const [runningFlow, setRunningFlow] = useState<string | null>(null);

    const fetchHealth = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/health');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error('Failed to fetch health:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
    }, [fetchHealth]);

    /* ── Summary counts ── */
    const serviceOk = data?.services.filter(s => s.status === 'ok').length ?? 0;
    const serviceError = data?.services.filter(s => s.status === 'error').length ?? 0;
    const featureReady = data?.features.filter(f => f.status === 'ready').length ?? 0;
    const featureBlocked = data?.features.filter(f => f.status === 'blocked').length ?? 0;
    const dbOk = data?.database.filter(d => d.status === 'ok').length ?? 0;

    /* ── Flow test runner ── */
    async function runFlow(flowId: string) {
        if (runningFlow) return;
        setRunningFlow(flowId);

        const flowIndex = flows.findIndex(f => f.id === flowId);
        if (flowIndex === -1) return;

        const flow = { ...flows[flowIndex] };
        const updatedSteps = [...flow.steps];

        for (let i = 0; i < updatedSteps.length; i++) {
            // Mark current step as running
            updatedSteps[i] = { ...updatedSteps[i], status: 'running' };
            setFlows(prev => {
                const copy = [...prev];
                copy[flowIndex] = { ...flow, steps: [...updatedSteps] };
                return copy;
            });

            const start = Date.now();

            try {
                await executeTestStep(updatedSteps[i].id);
                updatedSteps[i] = { ...updatedSteps[i], status: 'pass', time: Date.now() - start };
            } catch (err) {
                updatedSteps[i] = {
                    ...updatedSteps[i],
                    status: 'fail',
                    time: Date.now() - start,
                    error: (err as Error).message,
                };
                // Mark remaining as pending
                for (let j = i + 1; j < updatedSteps.length; j++) {
                    updatedSteps[j] = { ...updatedSteps[j], status: 'pending' };
                }
                break;
            }

            setFlows(prev => {
                const copy = [...prev];
                copy[flowIndex] = { ...flow, steps: [...updatedSteps] };
                return copy;
            });
        }

        setFlows(prev => {
            const copy = [...prev];
            copy[flowIndex] = { ...flow, steps: [...updatedSteps] };
            return copy;
        });
        setRunningFlow(null);
    }

    async function executeTestStep(stepId: string): Promise<void> {
        switch (stepId) {
            case 'auth-check': {
                const res = await fetch('/api/auth/get-session');
                if (!res.ok) throw new Error('Session check failed');
                const d = await res.json();
                if (!d?.session) throw new Error('No active session');
                return;
            }
            case 'drive-list': {
                const res = await fetch('/api/drive');
                if (!res.ok) throw new Error(`Drive API returned ${res.status}`);
                return;
            }
            case 'notifications-list': {
                const res = await fetch('/api/notifications');
                if (!res.ok) throw new Error(`Notifications API returned ${res.status}`);
                return;
            }
            case 'creations-list': {
                const res = await fetch('/api/creations?tool=chat');
                if (!res.ok) throw new Error(`Creations API returned ${res.status}`);
                return;
            }
            case 'chat-ping': {
                // Just check the chat page loads (quick check)
                const res = await fetch('/chat', { method: 'HEAD' });
                if (!res.ok) throw new Error(`Chat page returned ${res.status}`);
                return;
            }
            case 'image-page': {
                const res = await fetch('/image', { method: 'HEAD' });
                if (!res.ok) throw new Error(`Image page returned ${res.status}`);
                return;
            }
            case 'video-page': {
                const res = await fetch('/video', { method: 'HEAD' });
                if (!res.ok) throw new Error(`Video page returned ${res.status}`);
                return;
            }
            case 'music-page': {
                const res = await fetch('/music', { method: 'HEAD' });
                if (!res.ok) throw new Error(`Music page returned ${res.status}`);
                return;
            }
            case 'drive-page': {
                const res = await fetch('/drive', { method: 'HEAD' });
                if (!res.ok) throw new Error(`Drive page returned ${res.status}`);
                return;
            }
            case 'settings-page': {
                const res = await fetch('/settings', { method: 'HEAD' });
                if (!res.ok) throw new Error(`Settings page returned ${res.status}`);
                return;
            }
            case 'image-gen-ping': {
                const res = await fetch('/api/image/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: 'dryRun', model: 'flux-schnell' }),
                });
                if (!res.ok) throw new Error(`Image API returned ${res.status}`);
                return;
            }
            case 'music-gen-ping': {
                const res = await fetch('/api/music/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: 'dryRun', model: 'suno' }),
                });
                if (!res.ok) throw new Error(`Music API returned ${res.status}`);
                return;
            }
            case 'video-gen-ping': {
                const res = await fetch('/api/video/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: 'dryRun', model: 'kling-3' }),
                });
                if (!res.ok) throw new Error(`Video API returned ${res.status}`);
                return;
            }
            case 'creation-save-db': {
                const res = await fetch('/api/creations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tool: 'docs',
                        title: 'E2E Flow Test Document',
                        content: '# E2E Flow Test\nThis document was successfully generated and verified by the automated E2E Flow Tester.',
                    }),
                });
                if (!res.ok) throw new Error(`Creations POST returned ${res.status}`);
                const data = await res.json();
                if (!data.success || !data.creationId) throw new Error('Invalid creations save response');
                (window as unknown as Record<string, string>)._e2eCreationId = data.creationId;
                (window as unknown as Record<string, string>)._e2eDriveFileId = data.driveFileId;
                return;
            }
            case 'drive-upload-test': {
                const formData = new FormData();
                const file = new File(['Clarix E2E Test Content'], 'clarix-e2e-test.txt', { type: 'text/plain' });
                formData.append('file', file);
                formData.append('folder', 'documents');
                const res = await fetch('/api/drive', {
                    method: 'POST',
                    body: formData,
                });
                if (!res.ok) throw new Error(`Drive POST returned ${res.status}`);
                const data = await res.json();
                if (!data.success || !data.fileId) throw new Error('Invalid upload response');
                (window as unknown as Record<string, string>)._e2eUploadedFileId = data.fileId;
                return;
            }
            case 'drive-limit-check': {
                const formData = new FormData();
                const hugeBlob = new Blob([new Uint8Array(60 * 1024 * 1024)], { type: 'application/octet-stream' });
                formData.append('file', hugeBlob, 'huge-file.bin');
                const res = await fetch('/api/drive', {
                    method: 'POST',
                    body: formData,
                });
                if (res.status !== 413) {
                    throw new Error(`Expected size-limit block (413), but got status ${res.status}`);
                }
                return;
            }
            case 'drive-delete-cleanup': {
                const fileId = (window as unknown as Record<string, string>)._e2eUploadedFileId;
                if (fileId) {
                    const res = await fetch('/api/drive', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileId, permanent: true }),
                    });
                    if (!res.ok) throw new Error(`Drive DELETE returned ${res.status}`);
                }
                const creationId = (window as unknown as Record<string, string>)._e2eCreationId;
                if (creationId) {
                    await fetch('/api/creations', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ creationId }),
                    });
                }
                return;
            }
            default:
                // Generic wait to simulate
                await new Promise(r => setTimeout(r, 300));
                return;
        }
    }

    function resetFlows() {
        setFlows(getInitialFlows());
    }

    const tabs: { id: Tab; label: string; count?: number }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'services', label: 'Services', count: data?.services.length },
        { id: 'env', label: 'Environment', count: data?.envVars.length },
        { id: 'database', label: 'Database', count: dbOk },
        { id: 'features', label: 'Features', count: data?.features.length },
        { id: 'flows', label: 'Flow Tester' },
    ];

    return (
        <div className="admin">
            {/* Header */}
            <div className="admin__header">
                <div className="admin__header-left">
                    <div className="admin__icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="admin__title">Admin Panel</h1>
                        <p className="admin__subtitle">
                            System health · Feature status · Flow testing
                            {data && <> · Last checked {new Date(data.timestamp).toLocaleTimeString()}</>}
                        </p>
                    </div>
                </div>

                <button
                    className={`admin__refresh-btn ${loading ? 'loading' : ''}`}
                    onClick={fetchHealth}
                    disabled={loading}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                    </svg>
                    {loading ? 'Checking...' : 'Refresh'}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="admin__summary">
                <div className="admin__stat admin__stat--ok">
                    <div className="admin__stat-value">{serviceOk}</div>
                    <div className="admin__stat-label">Services Online</div>
                </div>
                <div className="admin__stat admin__stat--error">
                    <div className="admin__stat-value">{serviceError}</div>
                    <div className="admin__stat-label">Services Down</div>
                </div>
                <div className="admin__stat admin__stat--warning">
                    <div className="admin__stat-value">{featureReady}/{(data?.features.length ?? 0)}</div>
                    <div className="admin__stat-label">Features Ready</div>
                </div>
                <div className="admin__stat admin__stat--total">
                    <div className="admin__stat-value">{dbOk}</div>
                    <div className="admin__stat-label">DB Tables OK</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="admin__tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`admin__tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                        {tab.count !== undefined && <> ({tab.count})</>}
                    </button>
                ))}
            </div>

            {/* Loading state */}
            {loading && !data && (
                <div className="admin__section">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="admin__skeleton admin__skeleton--row" />
                    ))}
                </div>
            )}

            {/* Tab content */}
            {data && (
                <>
                    {/* ── Overview ── */}
                    {activeTab === 'overview' && (
                        <>
                            <div className="admin__section">
                                <div className="admin__section-header">
                                    <h2 className="admin__section-title">
                                        🌐 External Services
                                        <span className="admin__section-badge">{data.services.length}</span>
                                    </h2>
                                </div>
                                <div className="admin__services">
                                    {data.services.map(svc => (
                                        <ServiceCard key={svc.name} service={svc} />
                                    ))}
                                </div>
                            </div>

                            <div className="admin__section">
                                <div className="admin__section-header">
                                    <h2 className="admin__section-title">
                                        💾 Database Tables
                                        <span className="admin__section-badge">{data.database.length}</span>
                                    </h2>
                                </div>
                                <div className="admin__db-grid">
                                    {data.database.map(db => (
                                        <div key={db.name} className={`admin__db-card admin__db-card--${db.status}`}>
                                            <div className="admin__db-name">{db.name}</div>
                                            {db.status === 'ok' ? (
                                                <>
                                                    <div className="admin__db-count">{db.rowCount?.toLocaleString()}</div>
                                                    <div className="admin__db-label">rows</div>
                                                </>
                                            ) : (
                                                <div className="admin__db-label" style={{ color: 'var(--accent-red)' }}>
                                                    {db.message || 'Error'}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="admin__section">
                                <div className="admin__section-header">
                                    <h2 className="admin__section-title">
                                        ⚡ Feature Status
                                        <span className="admin__section-badge">
                                            {featureReady} ready / {featureBlocked} blocked
                                        </span>
                                    </h2>
                                </div>
                                <div className="admin__features">
                                    {data.features.map(feat => (
                                        <FeatureCard key={`${feat.name}-${feat.route}`} feature={feat} />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Services Tab ── */}
                    {activeTab === 'services' && (
                        <div className="admin__section">
                            <div className="admin__section-header">
                                <h2 className="admin__section-title">
                                    🌐 External Service Health
                                    <span className="admin__section-badge">{data.services.length}</span>
                                </h2>
                            </div>
                            <div className="admin__services">
                                {data.services.map(svc => (
                                    <ServiceCard key={svc.name} service={svc} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Environment Tab ── */}
                    {activeTab === 'env' && (
                        <div className="admin__section">
                            <div className="admin__section-header">
                                <h2 className="admin__section-title">
                                    🔑 Environment Variables
                                    <span className="admin__section-badge">
                                        {data.envVars.filter(e => e.set).length}/{data.envVars.length} configured
                                    </span>
                                </h2>
                            </div>
                            <table className="admin__env-table">
                                <thead>
                                    <tr>
                                        <th>Variable</th>
                                        <th>Status</th>
                                        <th>Value</th>
                                        <th>Category</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.envVars.map(env => (
                                        <tr key={env.name}>
                                            <td>
                                                <span className="admin__env-name">{env.name}</span>
                                            </td>
                                            <td>
                                                <span className={`admin__env-status admin__env-status--${env.set ? 'set' : 'missing'}`}>
                                                    {env.set ? '● Set' : '○ Missing'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="admin__env-value">{env.masked}</span>
                                            </td>
                                            <td>
                                                <span className="admin__env-category">{env.category}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Database Tab ── */}
                    {activeTab === 'database' && (
                        <div className="admin__section">
                            <div className="admin__section-header">
                                <h2 className="admin__section-title">
                                    💾 Database Tables
                                    <span className="admin__section-badge">{data.database.length} tables</span>
                                </h2>
                            </div>
                            <div className="admin__db-grid">
                                {data.database.map(db => (
                                    <div key={db.name} className={`admin__db-card admin__db-card--${db.status}`}>
                                        <div className="admin__db-name">{db.name}</div>
                                        {db.status === 'ok' ? (
                                            <>
                                                <div className="admin__db-count">{db.rowCount?.toLocaleString()}</div>
                                                <div className="admin__db-label">rows</div>
                                            </>
                                        ) : (
                                            <div className="admin__db-label" style={{ color: 'var(--accent-red)' }}>
                                                {db.message || 'Error'}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Features Tab ── */}
                    {activeTab === 'features' && (
                        <div className="admin__section">
                            <div className="admin__section-header">
                                <h2 className="admin__section-title">
                                    ⚡ Feature Matrix
                                    <span className="admin__section-badge">
                                        {featureReady} ready / {featureBlocked} blocked
                                    </span>
                                </h2>
                            </div>
                            <div className="admin__features">
                                {data.features.map(feat => (
                                    <FeatureCard key={`${feat.name}-${feat.route}`} feature={feat} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Flow Tester Tab ── */}
                    {activeTab === 'flows' && (
                        <div className="admin__section">
                            <div className="admin__section-header">
                                <h2 className="admin__section-title">
                                    🧪 End-to-End Flow Tester
                                </h2>
                                <button
                                    className="admin__refresh-btn"
                                    onClick={resetFlows}
                                    disabled={!!runningFlow}
                                >
                                    Reset All
                                </button>
                            </div>

                            {flows.map(flow => (
                                <div key={flow.id} className="admin__tester" style={{ marginBottom: 'var(--space-4)' }}>
                                    <div className="admin__tester-header">
                                        <div>
                                            <div className="admin__tester-title">{flow.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {flow.description}
                                            </div>
                                        </div>
                                        <button
                                            className="admin__tester-run"
                                            onClick={() => runFlow(flow.id)}
                                            disabled={!!runningFlow}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                <polygon points="5 3 19 12 5 21 5 3" />
                                            </svg>
                                            {runningFlow === flow.id ? 'Running...' : 'Run Test'}
                                        </button>
                                    </div>
                                    <div className="admin__tester-body">
                                        <div className="admin__test-steps">
                                            {flow.steps.map((step) => (
                                                <div key={step.id} className={`admin__test-step admin__test-step--${step.status}`}>
                                                    <div className="admin__test-step-icon">
                                                        {step.status === 'pending' && '○'}
                                                        {step.status === 'running' && '◉'}
                                                        {step.status === 'pass' && '✓'}
                                                        {step.status === 'fail' && '✗'}
                                                    </div>
                                                    <div className="admin__test-step-name">
                                                        {step.name}
                                                        {step.error && (
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-red)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                                                                {step.error}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {step.time !== undefined && (
                                                        <div className="admin__test-step-time">{step.time}ms</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/* ── Sub-components ── */

function ServiceCard({ service }: { service: ServiceCheck }) {
    return (
        <div className="admin__service">
            <div className={`admin__service-indicator admin__service-indicator--${service.status}`} />
            <div className="admin__service-info">
                <div className="admin__service-name">{service.name}</div>
                {service.provider && (
                    <div className="admin__service-provider">{service.provider}</div>
                )}
                {service.message && (
                    <div className="admin__service-message">{service.message}</div>
                )}
            </div>
            {service.latency !== undefined && (
                <div className={`admin__service-latency admin__service-latency--${service.latency < 500 ? 'fast' : service.latency < 2000 ? 'normal' : 'slow'}`}>
                    {service.latency}ms
                </div>
            )}
        </div>
    );
}

function FeatureCard({ feature }: { feature: FeatureCheck }) {
    return (
        <Link href={feature.route} className="admin__feature">
            <div className={`admin__feature-status admin__feature-status--${feature.status}`}>
                {feature.status === 'ready' ? '✓' : '✗'}
            </div>
            <div className="admin__feature-info">
                <div className="admin__feature-name">{feature.name}</div>
                {feature.deps.length > 0 && (
                    <div className="admin__feature-deps">
                        {feature.deps.join(', ')}
                    </div>
                )}
            </div>
            <span className="admin__feature-category">{feature.category}</span>
            <div className="admin__feature-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </div>
        </Link>
    );
}

/* ── Initial flow definitions ── */
function getInitialFlows(): TestFlow[] {
    return [
        {
            id: 'auth-flow',
            name: 'Authentication Flow',
            description: 'Verify session, cookies, and auth API are working',
            steps: [
                { id: 'auth-check', name: 'Check active session', status: 'pending' },
                { id: 'settings-page', name: 'Load settings page', status: 'pending' },
            ],
        },
        {
            id: 'workspace-flow',
            name: 'Workspace Core',
            description: 'Test Drive, Notifications, and Creations APIs',
            steps: [
                { id: 'auth-check', name: 'Verify authentication', status: 'pending' },
                { id: 'drive-list', name: 'List Drive files (GET /api/drive)', status: 'pending' },
                { id: 'notifications-list', name: 'List Notifications (GET /api/notifications)', status: 'pending' },
                { id: 'creations-list', name: 'List Creations (GET /api/creations?tool=chat)', status: 'pending' },
                { id: 'drive-page', name: 'Load Drive page', status: 'pending' },
            ],
        },
        {
            id: 'creation-flow',
            name: 'AI Creation Pages',
            description: 'Verify all creation tool pages load correctly',
            steps: [
                { id: 'chat-ping', name: 'Load Chat page', status: 'pending' },
                { id: 'image-page', name: 'Load Image Generator page', status: 'pending' },
                { id: 'video-page', name: 'Load Video Generator page', status: 'pending' },
                { id: 'music-page', name: 'Load Music Generator page', status: 'pending' },
            ],
        },
        {
            id: 'generation-pipeline',
            name: 'AI Generation Pipeline',
            description: 'Verify all AI endpoints parsing, headers, routing and DB injection',
            steps: [
                { id: 'image-gen-ping', name: 'Test Image API dry POST', status: 'pending' },
                { id: 'music-gen-ping', name: 'Test Music API dry POST', status: 'pending' },
                { id: 'video-gen-ping', name: 'Test Video API dry POST', status: 'pending' },
                { id: 'creation-save-db', name: 'Write and register Doc creation to SQL Database', status: 'pending' },
            ],
        },
        {
            id: 'drive-storage-flow',
            name: 'Drive Operations & Limits',
            description: 'Test file uploads, filesystem sync, size blocks, and permanent deletion',
            steps: [
                { id: 'drive-upload-test', name: 'Upload text asset to Drive', status: 'pending' },
                { id: 'drive-limit-check', name: 'Assert size block on files > 50 MB (returns 413)', status: 'pending' },
                { id: 'drive-delete-cleanup', name: 'Permanent delete and disk unlink (DB cleanup)', status: 'pending' },
            ],
        },
    ];
}
