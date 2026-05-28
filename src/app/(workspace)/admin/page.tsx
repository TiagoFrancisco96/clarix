'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
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

type Tab = 'overview' | 'users' | 'integrations' | 'services' | 'database' | 'features' | 'flows' | 'e2e';

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
    // Auth Check
    const currentUser = useQuery(api.auth.getOptionalUser);
    
    // Core States
    const [data, setData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [flows, setFlows] = useState<TestFlow[]>(getInitialFlows());
    const [runningFlow, setRunningFlow] = useState<string | null>(null);

    // Convex Hooks
    const recentErrors = useQuery(api.errorTracking.getRecentErrors, { limit: 30 });
    const errorStats = useQuery(api.errorTracking.getErrorStats);
    const triggerE2EAuditAction = useAction(api.aiDiagnostics.triggerE2EAudit);
    
    // Whitelisted admin operations
    const systemConfigs = useQuery(api.admin.getSystemConfigs);
    const listUsersResult = useQuery(api.admin.listUsers);
    
    const setSystemConfigMutation = useMutation(api.admin.setSystemConfig);
    const deleteSystemConfigMutation = useMutation(api.admin.deleteSystemConfig);
    const updateUserCreditsMutation = useMutation(api.admin.updateUserCredits);
    const updateUserPlanMutation = useMutation(api.admin.updateUserPlan);

    // E2E Click Audit State
    const [targetUrl, setTargetUrl] = useState('https://clarix.ai');
    const [dispatchStatus, setDispatchStatus] = useState<'pending' | 'running' | 'success' | 'error'>('pending');
    const [dispatchMessage, setDispatchMessage] = useState('');
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [expandedMeta, setExpandedMeta] = useState<Record<string, boolean>>({});

    // User Management States
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [selectedUserForCredits, setSelectedUserForCredits] = useState<any | null>(null);
    const [creditAdjustAmount, setCreditAdjustAmount] = useState<number>(1000);
    const [creditAdjustAction, setCreditAdjustAction] = useState<'add' | 'deduct' | 'set'>('add');
    const [creditAdjustReason, setCreditAdjustReason] = useState('Admin support grant');
    const [isAdjustingCredits, setIsAdjustingCredits] = useState(false);
    
    // Integrations / API Key States
    const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
    const [keyDescriptions, setKeyDescriptions] = useState<Record<string, string>>({
        OPENAI_API_KEY: 'Primary OpenAI engine key for GPT-5.4 models.',
        ANTHROPIC_API_KEY: 'Claude Sonnet 4.6 backend prompt resolver key.',
        GOOGLE_AI_API_KEY: 'Google Gemini 3.1 Pro & Imagen 4 creation key.',
        DEEPSEEK_API_KEY: 'DeepSeek V4-Flash fast & cheap prompt resolution key.',
        FAL_KEY: 'Black Forest Labs FLUX image and Kling video generation key.',
        SUNO_API_KEY: 'Suno Music generation engine key.',
        ELEVENLABS_API_KEY: 'ElevenLabs TTS & high-fidelity vocals key.',
        STRIPE_SECRET_KEY: 'Stripe payment processor secure webhook & checkout key.',
        STRIPE_PUBLISHABLE_KEY: 'Stripe client checkout public routing key.',
        STRIPE_WEBHOOK_SECRET: 'Stripe signature webhook verification key.',
        BETTER_AUTH_SECRET: 'Secure auth token validator (also enables DB overrides).'
    });
    const [savingKeyName, setSavingKeyName] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setTargetUrl(window.location.origin);
        }
    }, []);

    async function handleTriggerE2EAudit() {
        if (dispatchStatus === 'running') return;
        setDispatchStatus('running');
        setDispatchMessage('Initializing GitHub Actions virtual machine dispatcher bridge...');
        
        try {
            const result = await triggerE2EAuditAction({ siteUrl: targetUrl });
            if (result.success) {
                setDispatchStatus('success');
                setDispatchMessage(result.message || 'Successfully dispatched Playwright E2E clicks audit on GitHub Actions.');
            } else {
                setDispatchStatus('error');
                setDispatchMessage(result.error || 'Failed to dispatch workflow dispatch request.');
            }
        } catch (err) {
            setDispatchStatus('error');
            setDispatchMessage((err as Error).message);
        }
    }

    const toggleMeta = (id: string) => {
        setExpandedMeta(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const formatMetadata = (raw: string): string => {
        try {
            return JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
            return raw; 
        }
    };

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
        if (currentUser && currentUser.email) {
            const allowedAdmins = ["tiago@clarix.ai", "admin@clarix.ai", "tiagofrancisco96@gmail.com", "legal@clarix.ai"];
            if (allowedAdmins.includes(currentUser.email.toLowerCase())) {
                fetchHealth();
            }
        }
    }, [currentUser, fetchHealth]);

    /* ── E2E Flow test runner ── */
    async function runFlow(flowId: string) {
        if (runningFlow) return;
        setRunningFlow(flowId);

        const flowIndex = flows.findIndex(f => f.id === flowId);
        if (flowIndex === -1) return;

        const flow = { ...flows[flowIndex] };
        const updatedSteps = [...flow.steps];

        for (let i = 0; i < updatedSteps.length; i++) {
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
            case 'chat-gen-ping': {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [{ role: 'user', content: 'dryRun' }],
                        model: 'auto',
                    }),
                });
                if (!res.ok) throw new Error(`Chat API returned ${res.status}`);
                if (!res.body) throw new Error('Chat API returned no stream body');

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let sseText = '';
                let metaSeen = false;
                let chunkSeen = false;
                let doneSeen = false;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    sseText += decoder.decode(value, { stream: true });
                }

                for (const line of sseText.split('\n')) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data: ')) continue;
                    try {
                        const event = JSON.parse(trimmed.slice(6));
                        if (event.type === 'meta') metaSeen = true;
                        if (event.type === 'chunk') chunkSeen = true;
                        if (event.type === 'done') doneSeen = true;
                    } catch { /* skip */ }
                }

                if (!metaSeen) throw new Error('SSE stream missing meta event');
                if (!chunkSeen) throw new Error('SSE stream missing chunk event');
                if (!doneSeen) throw new Error('SSE stream missing done event');
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
                (window as any)._e2eCreationId = data.creationId;
                (window as any)._e2eDriveFileId = data.driveFileId;
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
                (window as any)._e2eUploadedFileId = data.fileId;
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
                const fileId = (window as any)._e2eUploadedFileId;
                if (fileId) {
                    const res = await fetch('/api/drive', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileId, permanent: true }),
                    });
                    if (!res.ok) throw new Error(`Drive DELETE returned ${res.status}`);
                }
                const creationId = (window as any)._e2eCreationId;
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
                await new Promise(r => setTimeout(r, 300));
                return;
        }
    }

    function resetFlows() {
        setFlows(getInitialFlows());
    }

    // Dynamic key CRUD operations
    const handleSaveConfig = async (key: string) => {
        const val = keyInputs[key];
        if (!val) return;
        setSavingKeyName(key);
        try {
            await setSystemConfigMutation({ key, value: val, description: keyDescriptions[key] });
            setKeyInputs(prev => ({ ...prev, [key]: '' }));
            fetchHealth();
        } catch (err) {
            console.error('Failed to save config key:', err);
        } finally {
            setSavingKeyName(null);
        }
    };

    const handleDeleteOverride = async (key: string) => {
        if (!confirm(`Are you sure you want to delete the database override for ${key}? It will fall back to environment variables.`)) return;
        try {
            await deleteSystemConfigMutation({ key });
            fetchHealth();
        } catch (err) {
            console.error('Failed to delete config override:', err);
        }
    };

    // User credit adjustments
    const handleAdjustCreditsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserForCredits) return;
        setIsAdjustingCredits(true);
        try {
            await updateUserCreditsMutation({
                userId: selectedUserForCredits.user_id,
                amount: creditAdjustAmount,
                action: creditAdjustAction,
                reason: creditAdjustReason,
            });
            setSelectedUserForCredits(null);
            setCreditAdjustReason('Admin support grant');
            setCreditAdjustAmount(1000);
        } catch (err) {
            console.error('Failed to adjust credits:', err);
            alert('Failed to adjust credits: ' + (err as Error).message);
        } finally {
            setIsAdjustingCredits(false);
        }
    };

    // Manual plan toggling
    const handleTogglePlan = async (userId: string, currentPlan: string) => {
        const nextPlan = currentPlan === 'pro' ? 'free' : 'pro';
        if (!confirm(`Are you sure you want to change this user's plan to ${nextPlan.toUpperCase()}? This resets credits and allocations.`)) return;
        try {
            await updateUserPlanMutation({ userId, plan: nextPlan });
        } catch (err) {
            console.error('Failed to update plan:', err);
        }
    };

    // Gating check
    if (currentUser === undefined) {
        return (
            <div className="admin__loading-container">
                <div className="admin__spinner" />
                <div style={{ marginTop: 'var(--space-4)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Loading Workspace Admin Context...
                </div>
            </div>
        );
    }

    const whitelist = ["tiago@clarix.ai", "admin@clarix.ai", "tiagofrancisco96@gmail.com", "legal@clarix.ai"];
    const isUserAdmin = currentUser && currentUser.email && whitelist.includes(currentUser.email.toLowerCase());

    if (!currentUser || !isUserAdmin) {
        return (
            <div className="admin__access-denied">
                <div className="admin__access-denied-card">
                    <div className="admin__access-denied-icon">🛑</div>
                    <h1 className="admin__access-denied-title">Access Denied</h1>
                    <p className="admin__access-denied-text">
                        This area is restricted to authenticated Clarix SRE Administrators only.
                        Your account <strong>({currentUser?.email || "anonymous"})</strong> does not possess the security clearance required to access system registers or dynamic integration keys.
                    </p>
                    <Link href="/" className="admin__access-denied-link">
                        Return to Home Workspace
                    </Link>
                </div>
            </div>
        );
    }

    // Counts
    const serviceOk = data?.services.filter(s => s.status === 'ok').length ?? 0;
    const serviceError = data?.services.filter(s => s.status === 'error').length ?? 0;
    const featureReady = data?.features.filter(f => f.status === 'ready').length ?? 0;
    const dbOk = data?.database.filter(d => d.status === 'ok').length ?? 0;

    // Filtered Users list
    const filteredUsers = listUsersResult?.filter((user: any) => {
        const query = userSearchQuery.toLowerCase();
        return (
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.user_id.toLowerCase().includes(query)
        );
    });

    const activeTabLabel = {
        overview: 'Overview',
        users: 'User Management',
        integrations: 'Integrations & Keys',
        services: 'Services Diagnostics',
        database: 'Database Tables',
        features: 'Feature Matrix',
        flows: 'Flow Tester',
        e2e: 'E2E Clicks VM',
    }[activeTab];

    return (
        <div className="admin">
            {/* Header */}
            <div className="admin__header">
                <div className="admin__header-left">
                    <div className="admin__icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="admin__title">Admin Control Panel</h1>
                        <p className="admin__subtitle">
                            System Health · Integration Settings · User Management · Diagnostics
                            {data && <> · Checked {new Date(data.timestamp).toLocaleTimeString()}</>}
                        </p>
                    </div>
                </div>

                <button
                    className={`admin__refresh-btn ${loading ? 'loading' : ''}`}
                    onClick={fetchHealth}
                    disabled={loading}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                <div className="admin__stat admin__stat--total">
                    <div className="admin__stat-value">{listUsersResult ? listUsersResult.length : '...'}</div>
                    <div className="admin__stat-label">Registered Users</div>
                </div>
                <div className="admin__stat admin__stat--warning">
                    <div className="admin__stat-value">{featureReady}/{(data?.features.length ?? 19)}</div>
                    <div className="admin__stat-label">Features Ready</div>
                </div>
                <div className="admin__stat admin__stat--total">
                    <div className="admin__stat-value">{dbOk}</div>
                    <div className="admin__stat-label">Database Tables</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="admin__tabs">
                <button className={`admin__tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                    📊 Overview & Logs
                </button>
                <button className={`admin__tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                    👥 Users ({listUsersResult ? listUsersResult.length : '...'})
                </button>
                <button className={`admin__tab ${activeTab === 'integrations' ? 'active' : ''}`} onClick={() => setActiveTab('integrations')}>
                    🔑 Integrations & Keys
                </button>
                <button className={`admin__tab ${activeTab === 'flows' ? 'active' : ''}`} onClick={() => setActiveTab('flows')}>
                    🧪 Flow Tester
                </button>
                <button className={`admin__tab ${activeTab === 'e2e' ? 'active' : ''}`} onClick={() => setActiveTab('e2e')}>
                    🌐 Clicks VM
                </button>
                <button className={`admin__tab ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
                    ⚙️ Raw Diagnostics
                </button>
            </div>

            {/* Tab content */}
            
            {/* ── Tab: Overview ── */}
            {activeTab === 'overview' && (
                <div className="admin__section animate-fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }} className="admin__overview-grid">
                        
                        {/* Left: Active Telemetry SRE Console */}
                        <div>
                            <div className="admin__section-header">
                                <h2 className="admin__section-title">
                                    🛡️ Telemetry Incident Log & SRE Alerts Feed
                                    {errorStats && (
                                        <span className="admin__section-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                                            {errorStats.total} total logs
                                        </span>
                                    )}
                                </h2>
                            </div>

                            {errorStats && errorStats.total > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                    <div className="admin__error-stat-card admin__error-stat-card--critical">
                                        <div className="admin__error-stat-val">{errorStats.severity.critical}</div>
                                        <div className="admin__error-stat-lbl">Critical</div>
                                    </div>
                                    <div className="admin__error-stat-card admin__error-stat-card--high">
                                        <div className="admin__error-stat-val">{errorStats.severity.high}</div>
                                        <div className="admin__error-stat-lbl">High Risk</div>
                                    </div>
                                    <div className="admin__error-stat-card admin__error-stat-card--medium">
                                        <div className="admin__error-stat-val">{errorStats.severity.medium}</div>
                                        <div className="admin__error-stat-lbl">Medium</div>
                                    </div>
                                    <div className="admin__error-stat-card admin__error-stat-card--total">
                                        <div className="admin__error-stat-val">{errorStats.component.e2e}</div>
                                        <div className="admin__error-stat-lbl">E2E VM Runs</div>
                                    </div>
                                </div>
                            )}

                            <div className="admin__sre-feed">
                                {!recentErrors ? (
                                    <div className="admin__sre-loading">
                                        <div className="admin__spinner admin__spinner--sm" />
                                        Streaming telemetry...
                                    </div>
                                ) : recentErrors.length === 0 ? (
                                    <div className="admin__sre-empty">
                                        🔒 Telemetry incident feed clean. Zero warnings logged.
                                    </div>
                                ) : (
                                    recentErrors.map((err) => (
                                        <div key={err._id} className={`admin__sre-item admin__sre-item--${err.severity}`}>
                                            <div className="admin__sre-header">
                                                <span className={`admin__sre-badge admin__sre-badge--${err.severity}`}>
                                                    {err.severity.toUpperCase()}
                                                </span>
                                                <span className="admin__sre-time">
                                                    🗓️ {new Date(err.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="admin__sre-message">{err.message}</div>
                                            <div className="admin__sre-details">
                                                <div className="admin__sre-details-item">
                                                    Component: <span>{err.component.toUpperCase()}</span>
                                                </div>
                                                {err.user_id && (
                                                    <div className="admin__sre-details-item">
                                                        User Context: <span>{err.user_id}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {err.stack && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                                    <button className="admin__sre-meta-btn" onClick={() => toggleMeta(err._id)}>
                                                        {expandedMeta[err._id] ? '▼ Hide Trace Log' : '▶ Show Trace Log'}
                                                    </button>
                                                    {expandedMeta[err._id] && (
                                                        <pre className="admin__sre-meta-body">{err.stack}</pre>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Right: Quick service cards summary */}
                        <div>
                            <div className="admin__section-header">
                                <h2 className="admin__section-title">🌐 Active Services</h2>
                            </div>
                            <div className="admin__services-mini">
                                {data?.services.map(svc => (
                                    <div key={svc.name} className="admin__service-mini-card">
                                        <div className={`admin__service-mini-dot admin__service-mini-dot--${svc.status}`} />
                                        <div className="admin__service-mini-info">
                                            <div className="admin__service-mini-name">{svc.name}</div>
                                            <div className="admin__service-mini-provider">{svc.provider || 'Core Component'}</div>
                                        </div>
                                        {svc.latency !== undefined && (
                                            <div className="admin__service-mini-latency">{svc.latency}ms</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* ── Tab: User Management ── */}
            {activeTab === 'users' && (
                <div className="admin__section animate-fade-in">
                    <div className="admin__section-header">
                        <h2 className="admin__section-title">👥 User Workspace Registry</h2>
                        <div className="admin__user-search-wrapper">
                            <input
                                type="text"
                                className="admin__user-search"
                                placeholder="Search by name, email, or user_id..."
                                value={userSearchQuery}
                                onChange={(e) => setUserSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {!listUsersResult ? (
                        <div style={{ padding: '36px', textAlign: 'center' }}>
                            <div className="admin__spinner" style={{ margin: '0 auto' }} />
                            <div style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Fetching User Profiles...</div>
                        </div>
                    ) : filteredUsers?.length === 0 ? (
                        <div className="admin__users-empty">
                            🔍 No users match your search query. Try another term.
                        </div>
                    ) : (
                        <div className="admin__users-table-container">
                            <table className="admin__users-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>User ID</th>
                                        <th>Active Plan</th>
                                        <th>Credits Balance</th>
                                        <th>Lifetime Usage</th>
                                        <th>Registration</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers?.map((user: any) => (
                                        <tr key={user.user_id}>
                                            <td>
                                                <div className="admin__user-profile-cell">
                                                    {user.image ? (
                                                        <img src={user.image} alt="" className="admin__user-avatar" />
                                                    ) : (
                                                        <div className="admin__user-avatar-placeholder">
                                                            {user.name.substring(0, 1).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="admin__user-name">{user.name}</span>
                                                </div>
                                            </td>
                                            <td><span className="admin__user-email">{user.email}</span></td>
                                            <td><code className="admin__user-mono">{user.user_id.substring(0, 10)}...</code></td>
                                            <td>
                                                <span className={`admin__user-plan-badge admin__user-plan-badge--${user.plan}`}>
                                                    {user.plan.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="admin__user-balance-value">
                                                    {user.balance.toLocaleString()}
                                                </span>
                                                <span className="admin__user-balance-lbl"> credits</span>
                                            </td>
                                            <td>
                                                <span className="admin__user-usage-value">
                                                    {user.lifetime_used.toLocaleString()}
                                                </span>
                                                <span className="admin__user-balance-lbl"> used</span>
                                            </td>
                                            <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <div className="admin__user-actions">
                                                    <button 
                                                        className="admin__user-action-btn admin__user-action-btn--credits"
                                                        title="Adjust Credits"
                                                        onClick={() => setSelectedUserForCredits(user)}
                                                    >
                                                        💰 Adjust Credits
                                                    </button>
                                                    <button 
                                                        className="admin__user-action-btn admin__user-action-btn--plan"
                                                        title="Toggle Plan manually"
                                                        onClick={() => handleTogglePlan(user.user_id, user.plan)}
                                                    >
                                                        🔄 Toggle Plan
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Integrations & API Keys ── */}
            {activeTab === 'integrations' && (
                <div className="admin__section animate-fade-in">
                    <div className="admin__section-header">
                        <h2 className="admin__section-title">🔑 Core Integrations & Runtime API Key Overrides</h2>
                    </div>

                    <div style={{ background: 'rgba(212, 168, 67, 0.05)', border: '1px solid rgba(212, 168, 67, 0.15)', borderRadius: '8px', padding: '16px', marginBottom: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        💡 <strong>Dynamic Overrides System</strong>: Setup or override API keys at runtime securely. The system automatically fetches configuration variables from the Convex Database override layer first. If no override exists, it gracefully falls back to the system environment variables (`.env.local` or hosting provider settings).
                    </div>

                    <div className="admin__integrations-grid">
                        
                        {/* LLMs & AI Engines */}
                        <div className="admin__integration-card">
                            <h3 className="admin__integration-card-title">🤖 LLMs & Core AI Engine Prompters</h3>
                            <div className="admin__integration-keys">
                                        {['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_AI_API_KEY', 'DEEPSEEK_API_KEY'].map(key => (
                                            <KeyInputRow
                                                key={key}
                                                keyName={key}
                                                description={keyDescriptions[key]}
                                                envCheck={data?.envVars.find(e => e.name === key)}
                                                dbCheck={systemConfigs?.find((c: any) => c.key === key)}
                                                inputValue={keyInputs[key] || ''}
                                                onInputChange={(val) => setKeyInputs(prev => ({ ...prev, [key]: val }))}
                                                onSave={() => handleSaveConfig(key)}
                                                onDelete={() => handleDeleteOverride(key)}
                                                isSaving={savingKeyName === key}
                                            />
                                        ))}
                            </div>
                        </div>

                        {/* Media Creators & Gen Generators */}
                        <div className="admin__integration-card">
                            <h3 className="admin__integration-card-title">🎨 Visual Media & Voice Generative Services</h3>
                            <div className="admin__integration-keys">
                                {['FAL_KEY', 'SUNO_API_KEY', 'ELEVENLABS_API_KEY'].map(key => (
                                    <KeyInputRow
                                        key={key}
                                        keyName={key}
                                        description={keyDescriptions[key]}
                                        envCheck={data?.envVars.find(e => e.name === key)}
                                        dbCheck={systemConfigs?.find((c: any) => c.key === key)}
                                        inputValue={keyInputs[key] || ''}
                                        onInputChange={(val) => setKeyInputs(prev => ({ ...prev, [key]: val }))}
                                        onSave={() => handleSaveConfig(key)}
                                        onDelete={() => handleDeleteOverride(key)}
                                        isSaving={savingKeyName === key}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Payments & Billing Engine */}
                        <div className="admin__integration-card">
                            <h3 className="admin__integration-card-title">💳 Payments & Billing processor (Stripe)</h3>
                            <div className="admin__integration-keys">
                                {['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'].map(key => (
                                    <KeyInputRow
                                        key={key}
                                        keyName={key}
                                        description={keyDescriptions[key]}
                                        envCheck={data?.envVars.find(e => e.name === key)}
                                        dbCheck={systemConfigs?.find((c: any) => c.key === key)}
                                        inputValue={keyInputs[key] || ''}
                                        onInputChange={(val) => setKeyInputs(prev => ({ ...prev, [key]: val }))}
                                        onSave={() => handleSaveConfig(key)}
                                        onDelete={() => handleDeleteOverride(key)}
                                        isSaving={savingKeyName === key}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Platform Auth Secure pre-shared keys */}
                        <div className="admin__integration-card">
                            <h3 className="admin__integration-card-title">🔐 Authentication Pre-Shared System Secrets</h3>
                            <div className="admin__integration-keys">
                                {['BETTER_AUTH_SECRET'].map(key => (
                                    <KeyInputRow
                                        key={key}
                                        keyName={key}
                                        description={keyDescriptions[key]}
                                        envCheck={data?.envVars.find(e => e.name === key)}
                                        dbCheck={systemConfigs?.find((c: any) => c.key === key)}
                                        inputValue={keyInputs[key] || ''}
                                        onInputChange={(val) => setKeyInputs(prev => ({ ...prev, [key]: val }))}
                                        onSave={() => handleSaveConfig(key)}
                                        onDelete={() => handleDeleteOverride(key)}
                                        isSaving={savingKeyName === key}
                                    />
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* ── Tab: Flow Tester ── */}
            {activeTab === 'flows' && (
                <div className="admin__section animate-fade-in">
                    <div className="admin__section-header">
                        <h2 className="admin__section-title">🧪 Step-by-Step E2E Pipeline Flow Tester</h2>
                        <button className="admin__refresh-btn" onClick={resetFlows} disabled={!!runningFlow}>
                            Reset Steps
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
                                <button className="admin__tester-run" onClick={() => runFlow(flow.id)} disabled={!!runningFlow}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                    {runningFlow === flow.id ? 'Testing...' : 'Run Pipeline'}
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

            {/* ── Tab: E2E Clicks VM ── */}
            {activeTab === 'e2e' && (
                <div className="admin__e2e-container animate-fade-in">
                    <div className="admin__section-header">
                        <h2 className="admin__section-title">🌐 On-Demand Playwright E2E Clicks Audit</h2>
                    </div>

                    <div className="admin__e2e-card">
                        <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                            Launch headless browser clicks VM triggers on a GitHub Actions runner serverless virtual machine to test and verify every button, tool router, and filesystem connection in the workspace.
                        </div>
                        <div className="admin__e2e-control-panel">
                            <div className="admin__e2e-input-wrapper">
                                <input
                                    type="text"
                                    className="admin__e2e-input"
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    placeholder="Target Site URL (e.g. https://clarix.ai)"
                                    disabled={dispatchStatus === 'running'}
                                />
                            </div>
                            <button
                                className="admin__e2e-trigger-btn"
                                onClick={handleTriggerE2EAudit}
                                disabled={dispatchStatus === 'running' || !targetUrl}
                            >
                                {dispatchStatus === 'running' ? 'Running...' : '⚡ Run Clicks VM'}
                            </button>
                        </div>

                        {dispatchStatus !== 'pending' && (
                            <div style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className={`admin__e2e-indicator-dot admin__e2e-indicator-dot--${dispatchStatus}`} />
                                <span style={{
                                    fontSize: '0.82rem',
                                    fontWeight: '600',
                                    color: dispatchStatus === 'success' ? 'var(--accent-green)' : dispatchStatus === 'error' ? 'var(--accent-red)' : 'var(--accent-gold)'
                                }}>
                                    {dispatchMessage}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Tab: Raw Diagnostics (Raw tabs combined) ── */}
            {['services', 'database', 'features'].includes(activeTab) && (
                <div className="admin__section animate-fade-in">
                    
                    {/* Services */}
                    {activeTab === 'services' && (
                        <>
                            <div className="admin__section-header">
                                <h2 className="admin__section-title">🌐 Live Services Status registers</h2>
                            </div>
                            <div className="admin__services">
                                {data?.services.map(svc => (
                                    <div key={svc.name} className="admin__service">
                                        <div className={`admin__service-indicator admin__service-indicator--${svc.status}`} />
                                        <div className="admin__service-info">
                                            <div className="admin__service-name">{svc.name}</div>
                                            {svc.provider && <div className="admin__service-provider">{svc.provider}</div>}
                                            {svc.message && <div className="admin__service-message">{svc.message}</div>}
                                        </div>
                                        {svc.latency !== undefined && (
                                            <div className={`admin__service-latency admin__service-latency--${svc.latency < 500 ? 'fast' : 'normal'}`}>
                                                {svc.latency}ms
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Database */}
                    {activeTab === 'database' && (
                        <>
                            <div className="admin__section-header">
                                <h2 className="admin__section-title">💾 Active Schema registers</h2>
                            </div>
                            <div className="admin__db-grid">
                                {data?.database.map(db => (
                                    <div key={db.name} className={`admin__db-card admin__db-card--${db.status}`}>
                                        <div className="admin__db-name">{db.name}</div>
                                        {db.status === 'ok' ? (
                                            <>
                                                <div className="admin__db-count">{db.rowCount?.toLocaleString() || '1'}</div>
                                                <div className="admin__db-label">Active Connection</div>
                                            </>
                                        ) : (
                                            <div className="admin__db-label" style={{ color: 'var(--accent-red)' }}>
                                                {db.message || 'Error'}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Features */}
                    {activeTab === 'features' && (
                        <>
                            <div className="admin__section-header">
                                <h2 className="admin__section-title">⚡ Feature Matrix</h2>
                            </div>
                            <div className="admin__features">
                                {data?.features.map(feat => (
                                    <Link href={feat.route} key={`${feat.name}-${feat.route}`} className="admin__feature">
                                        <div className={`admin__feature-status admin__feature-status--${feat.status}`}>
                                            {feat.status === 'ready' ? '✓' : '✗'}
                                        </div>
                                        <div className="admin__feature-info">
                                            <div className="admin__feature-name">{feat.name}</div>
                                            {feat.deps.length > 0 && <div className="admin__feature-deps">{feat.deps.join(', ')}</div>}
                                        </div>
                                        <span className="admin__feature-category">{feat.category}</span>
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}

                </div>
            )}

            {/* ── Transaction modal: Credit Adjuster ── */}
            {selectedUserForCredits && (
                <div className="admin__modal-overlay">
                    <div className="admin__modal-card animate-fade-in">
                        <div className="admin__modal-header">
                            <h3 className="admin__modal-title">💰 Credit Balance Adjuster</h3>
                            <button className="admin__modal-close" onClick={() => setSelectedUserForCredits(null)}>×</button>
                        </div>
                        <form onSubmit={handleAdjustCreditsSubmit} className="admin__modal-form">
                            
                            <div className="admin__modal-user-info">
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Adjusting credits for <strong>{selectedUserForCredits.name}</strong> ({selectedUserForCredits.email})
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Current balance: <strong>{selectedUserForCredits.balance.toLocaleString()}</strong> credits
                                </div>
                            </div>

                            <div className="admin__form-group">
                                <label className="admin__form-label">Action Type</label>
                                <select 
                                    className="admin__form-select"
                                    value={creditAdjustAction}
                                    onChange={(e: any) => setCreditAdjustAction(e.target.value)}
                                >
                                    <option value="add">➕ Add Credits (Incremental grant)</option>
                                    <option value="deduct">➖ Deduct Credits (Manual refund/usage charge)</option>
                                    <option value="set">⚙️ Set Balance (Direct absolute override)</option>
                                </select>
                            </div>

                            <div className="admin__form-group">
                                <label className="admin__form-label">Credit Amount</label>
                                <input
                                    type="number"
                                    className="admin__form-input"
                                    value={creditAdjustAmount}
                                    onChange={(e) => setCreditAdjustAmount(parseInt(e.target.value) || 0)}
                                    min={0}
                                    required
                                />
                            </div>

                            <div className="admin__form-group">
                                <label className="admin__form-label">Reason Log (required for auditing)</label>
                                <input
                                    type="text"
                                    className="admin__form-input"
                                    value={creditAdjustReason}
                                    onChange={(e) => setCreditAdjustReason(e.target.value)}
                                    placeholder="E.g., Customer support gesture, test credits, reset"
                                    required
                                />
                            </div>

                            <div className="admin__modal-actions">
                                <button 
                                    type="button" 
                                    className="admin__modal-btn admin__modal-btn--cancel"
                                    onClick={() => setSelectedUserForCredits(null)}
                                    disabled={isAdjustingCredits}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="admin__modal-btn admin__modal-btn--submit"
                                    disabled={isAdjustingCredits || creditAdjustAmount <= 0 || !creditAdjustReason}
                                >
                                    {isAdjustingCredits ? 'Adjusting...' : 'Confirm Transaction'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

/* ── Inline Row Component for Integration keys ── */
interface KeyInputRowProps {
    keyName: string;
    description: string;
    envCheck?: EnvCheck;
    dbCheck?: { masked: string; updated_at: number };
    inputValue: string;
    onInputChange: (val: string) => void;
    onSave: () => void;
    onDelete: () => void;
    isSaving: boolean;
}

function KeyInputRow({
    keyName,
    description,
    envCheck,
    dbCheck,
    inputValue,
    onInputChange,
    onSave,
    onDelete,
    isSaving
}: KeyInputRowProps) {
    const isConfiguredInEnv = envCheck?.set;
    const isOverriddenInDb = !!dbCheck;
    
    let statusClass = 'missing';
    let statusLabel = 'Missing Key';
    
    if (isConfiguredInEnv) {
        statusClass = 'env';
        statusLabel = 'Env Variable Set';
    }
    if (isOverriddenInDb) {
        statusClass = 'db';
        statusLabel = 'DB Override Set';
    }

    return (
        <div className="admin__integration-row">
            <div className="admin__integration-row-header">
                <div>
                    <code className="admin__integration-row-name">{keyName}</code>
                    <div className="admin__integration-row-desc">{description}</div>
                </div>
                <span className={`admin__integration-row-status admin__integration-row-status--${statusClass}`}>
                    {statusLabel}
                </span>
            </div>

            <div className="admin__integration-row-inputs">
                <input
                    type="password"
                    className="admin__integration-row-input"
                    placeholder={isOverriddenInDb ? `${dbCheck.masked} (Override)` : isConfiguredInEnv ? '•••••••• (Env Variable)' : 'Enter API Key value...'}
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                />
                
                <button
                    className="admin__integration-row-btn admin__integration-row-btn--save"
                    onClick={onSave}
                    disabled={isSaving || !inputValue}
                >
                    {isSaving ? 'Saving...' : 'Save to DB'}
                </button>

                {isOverriddenInDb && (
                    <button
                        className="admin__integration-row-btn admin__integration-row-btn--delete"
                        onClick={onDelete}
                    >
                        Delete Override
                    </button>
                )}
            </div>
            
            {dbCheck && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                    Override updated: {new Date(dbCheck.updated_at).toLocaleString()}
                </div>
            )}
        </div>
    );
}

/* ── Initial flow definitions ── */
function getInitialFlows(): TestFlow[] {
    return [
        {
            id: 'auth-flow',
            name: 'Authentication Pipeline Flow',
            description: 'Verify active secure sessions, Better Auth cookies, and admin credentials',
            steps: [
                { id: 'auth-check', name: 'Verify authenticated workspace session', status: 'pending' },
                { id: 'settings-page', name: 'Assert configurations page loads successfully', status: 'pending' },
            ],
        },
        {
            id: 'workspace-flow',
            name: 'Workspace Core Filesystems',
            description: 'Assert virtual Drive API lists files, notifications dispatch, and user creations list',
            steps: [
                { id: 'auth-check', name: 'Confirm SRE identification context', status: 'pending' },
                { id: 'drive-list', name: 'Query Drive lists (GET /api/drive)', status: 'pending' },
                { id: 'notifications-list', name: 'Query notification streams (GET /api/notifications)', status: 'pending' },
                { id: 'creations-list', name: 'Query user creations index (GET /api/creations)', status: 'pending' },
                { id: 'drive-page', name: 'Load workspace Filesystem Drive page', status: 'pending' },
            ],
        },
        {
            id: 'creation-flow',
            name: 'AI Generative Pages',
            description: 'Load all workspace generation page templates for the prompters',
            steps: [
                { id: 'chat-ping', name: 'Confirm prompt bar page builds', status: 'pending' },
                { id: 'image-page', name: 'Confirm Flux Schnell visual page builds', status: 'pending' },
                { id: 'video-page', name: 'Confirm Kling 3.0 video page builds', status: 'pending' },
                { id: 'music-page', name: 'Confirm Suno Music generator page builds', status: 'pending' },
            ],
        },
        {
            id: 'generation-pipeline',
            name: 'AI Generative Pipelines (Dry Runs)',
            description: 'Test all API endpoint headers, JSON parsing, routing, and pre-authorizations',
            steps: [
                { id: 'image-gen-ping', name: 'Dry generation on Fal.ai Flux endpoint (POST /api/image/generate)', status: 'pending' },
                { id: 'music-gen-ping', name: 'Dry generation on Suno endpoint (POST /api/music/generate)', status: 'pending' },
                { id: 'video-gen-ping', name: 'Dry generation on Kling endpoint (POST /api/video/generate)', status: 'pending' },
                { id: 'chat-gen-ping', name: 'Dry streaming chat response on DeepSeek V4-Flash (POST /api/chat)', status: 'pending' },
                { id: 'creation-save-db', name: 'Save generative assets to database', status: 'pending' },
            ],
        },
        {
            id: 'drive-storage-flow',
            name: 'Filesystem Storage Limits',
            description: 'Verify file uploads, size locks (returns 413 above limit), and disk unlinking',
            steps: [
                { id: 'drive-upload-test', name: 'Upload text assets to Convex file storage', status: 'pending' },
                { id: 'drive-limit-check', name: 'Verify limit blocks on assets > 50 MB (returns 413)', status: 'pending' },
                { id: 'drive-delete-cleanup', name: 'Perform secure cleanup unlinking all E2E test creations', status: 'pending' },
            ],
        },
    ];
}
