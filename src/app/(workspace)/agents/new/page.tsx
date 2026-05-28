'use client';

import React, { useState, useRef } from 'react';
import { useToast } from '@/components/Toast';
import './agent-builder.css';

/* ── Types ── */
interface AgentTool {
    id: string;
    name: string;
    description: string;
    icon: string;
    enabled: boolean;
}

interface KnowledgeDoc {
    id: string;
    name: string;
    size: string;
}

interface TestMessage {
    id: string;
    role: 'user' | 'agent';
    content: string;
}

/* ── Constants ── */
const STEPS = [
    { id: 1, label: 'Identity', desc: 'Name & avatar' },
    { id: 2, label: 'Personality', desc: 'System prompt' },
    { id: 3, label: 'Tools', desc: 'Capabilities' },
    { id: 4, label: 'Knowledge', desc: 'Upload docs' },
    { id: 5, label: 'Test', desc: 'Try it out' },
    { id: 6, label: 'Publish', desc: 'Share it' },
];

const AVATAR_OPTIONS = ['🤖', '🧠', '⚡', '🔮', '🎯', '🦾', '🌟', '🛡️', '🔥', '🧬', '💎', '🪄', '🚀', '🎭', '🦊', '🐙'];

const DEFAULT_TOOLS: AgentTool[] = [
    { id: 'web-search', name: 'Web Search', description: 'Search the internet for real-time info', icon: '🔍', enabled: true },
    { id: 'code-exec', name: 'Code Execution', description: 'Run Python, JS, and more', icon: '💻', enabled: false },
    { id: 'image-gen', name: 'Image Generation', description: 'Generate images from descriptions', icon: '🖼️', enabled: false },
    { id: 'file-read', name: 'File Reading', description: 'Read and analyze uploaded documents', icon: '📄', enabled: true },
    { id: 'data-analysis', name: 'Data Analysis', description: 'Process spreadsheets and datasets', icon: '📊', enabled: false },
    { id: 'web-browse', name: 'Web Browsing', description: 'Visit and extract webpage content', icon: '🌐', enabled: false },
    { id: 'calculator', name: 'Calculator', description: 'Perform math and unit conversions', icon: '🧮', enabled: true },
    { id: 'api-calls', name: 'API Integration', description: 'Make HTTP requests to external APIs', icon: '🔗', enabled: false },
];

const SAMPLE_TEST_MESSAGES: TestMessage[] = [
    { id: 't1', role: 'user', content: 'What can you help me with?' },
    { id: 't2', role: 'agent', content: 'Hello! I\'m your custom AI agent. Based on my configuration, I can help you with web searches, reading documents, and performing calculations. What would you like to do?' },
];

/* ── Component ── */
export default function NewAgentPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [agentName, setAgentName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('🤖');
    const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant. Be concise, accurate, and friendly. Always cite your sources when providing information.');
    const [tools, setTools] = useState<AgentTool[]>(DEFAULT_TOOLS);
    const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([
        { id: 'k1', name: 'company-faq.pdf', size: '245 KB' },
        { id: 'k2', name: 'product-docs.md', size: '128 KB' },
    ]);
    const [testMessages, setTestMessages] = useState<TestMessage[]>(SAMPLE_TEST_MESSAGES);
    const [testInput, setTestInput] = useState('');
    const [description, setDescription] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const toggleTool = (toolId: string) => {
        setTools(prev => prev.map(t => t.id === toolId ? { ...t, enabled: !t.enabled } : t));
    };

    const removeDoc = (docId: string) => {
        setKnowledgeDocs(prev => prev.filter(d => d.id !== docId));
    };

    const sendTestMessage = () => {
        if (!testInput.trim()) return;
        const userMsg: TestMessage = { id: `t${Date.now()}`, role: 'user', content: testInput };
        setTestMessages(prev => [...prev, userMsg]);
        setTestInput('');

        // Simulate agent reply
        setTimeout(() => {
            const responses = [
                'I found some relevant information. Let me break that down for you...',
                'Great question! Based on the knowledge base documents I have access to, here\'s what I can tell you...',
                'I\'ve searched the web and combined it with the uploaded documents. Here\'s a summary...',
                'Let me analyze that for you. According to my configuration, I can help by...',
            ];
            const agentMsg: TestMessage = {
                id: `t${Date.now() + 1}`,
                role: 'agent',
                content: responses[Math.floor(Math.random() * responses.length)],
            };
            setTestMessages(prev => [...prev, agentMsg]);
        }, 800 + Math.random() * 1200);
    };

    const goNext = () => {
        if (currentStep < STEPS.length) setCurrentStep(currentStep + 1);
    };

    const goBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const enabledTools = tools.filter(t => t.enabled);

    return (
        <div className="agent-builder animate-fade-in-up">
            {/* ── Steps Sidebar ── */}
            <aside className="agent-builder__steps">
                <div className="agent-builder__steps-title">Build Your Agent</div>
                {STEPS.map(step => (
                    <button
                        key={step.id}
                        className={`agent-builder__step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
                        onClick={() => setCurrentStep(step.id)}
                    >
                        <span className="agent-builder__step-number">
                            {currentStep > step.id ? '✓' : step.id}
                        </span>
                        <div className="agent-builder__step-info">
                            <span className="agent-builder__step-label">{step.label}</span>
                            <span className="agent-builder__step-desc">{step.desc}</span>
                        </div>
                    </button>
                ))}
            </aside>

            {/* ── Main Panel ── */}
            <div className="agent-builder__main">
                <div className="agent-builder__header">
                    <div>
                        <div className="agent-builder__header-title">
                            Step {currentStep}: {STEPS[currentStep - 1].label}
                        </div>
                        <div className="agent-builder__header-subtitle">
                            {STEPS[currentStep - 1].desc}
                        </div>
                    </div>
                    <div className="agent-builder__nav-btns">
                        {currentStep > 1 && (
                            <button className="agent-builder__nav-btn agent-builder__nav-btn--back" onClick={goBack}>
                                ← Back
                            </button>
                        )}
                        {currentStep < STEPS.length ? (
                            <button className="agent-builder__nav-btn agent-builder__nav-btn--next" onClick={goNext}>
                                Next →
                            </button>
                        ) : (
                            <button className="agent-builder__nav-btn agent-builder__nav-btn--publish" onClick={() => toast(`Agent "${agentName || 'Untitled Agent'}" published successfully!`, 'success')}>
                                🚀 Publish Agent
                            </button>
                        )}
                    </div>
                </div>

                <div className="agent-builder__form">
                    {/* ── Step 1: Identity ── */}
                    {currentStep === 1 && (
                        <div className="agent-builder__form-section">
                            <div className="agent-builder__field">
                                <label className="agent-builder__label">Agent Name</label>
                                <input
                                    className="agent-builder__input"
                                    type="text"
                                    placeholder="e.g. Research Pro, Code Buddy, Writing Coach..."
                                    value={agentName}
                                    onChange={(e) => setAgentName(e.target.value)}
                                />
                            </div>

                            <div className="agent-builder__field">
                                <label className="agent-builder__label">
                                    Avatar
                                    <span className="agent-builder__label-hint">— pick an icon for your agent</span>
                                </label>
                                <div className="agent-builder__avatar-picker">
                                    {AVATAR_OPTIONS.map(emoji => (
                                        <button
                                            key={emoji}
                                            className={`agent-builder__avatar-option ${selectedAvatar === emoji ? 'selected' : ''}`}
                                            onClick={() => setSelectedAvatar(emoji)}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="agent-builder__field">
                                <label className="agent-builder__label">
                                    Description
                                    <span className="agent-builder__label-hint">— shown in the agents gallery</span>
                                </label>
                                <input
                                    className="agent-builder__input"
                                    type="text"
                                    placeholder="A brief description of what your agent does..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Step 2: Personality ── */}
                    {currentStep === 2 && (
                        <div className="agent-builder__form-section">
                            <div className="agent-builder__field">
                                <label className="agent-builder__label">
                                    System Prompt
                                    <span className="agent-builder__label-hint">— defines how your agent behaves</span>
                                </label>
                                <textarea
                                    className="agent-builder__textarea"
                                    placeholder="You are a helpful AI assistant that..."
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    rows={8}
                                />
                            </div>

                            <div className="agent-builder__field">
                                <label className="agent-builder__label">Conversation Starters</label>
                                <input
                                    className="agent-builder__input"
                                    type="text"
                                    placeholder="Suggested first message users can click..."
                                    style={{ marginBottom: 'var(--space-2)' }}
                                />
                                <input
                                    className="agent-builder__input"
                                    type="text"
                                    placeholder="Another suggestion..."
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Tools ── */}
                    {currentStep === 3 && (
                        <div className="agent-builder__form-section">
                            <div className="agent-builder__field">
                                <label className="agent-builder__label">
                                    Capabilities
                                    <span className="agent-builder__label-hint">— toggle the tools your agent can use</span>
                                </label>
                                <div className="agent-builder__tools-grid">
                                    {tools.map(tool => (
                                        <button
                                            key={tool.id}
                                            className={`agent-builder__tool ${tool.enabled ? 'active' : ''}`}
                                            onClick={() => toggleTool(tool.id)}
                                        >
                                            <span className="agent-builder__tool-icon">{tool.icon}</span>
                                            <div className="agent-builder__tool-info">
                                                <div className="agent-builder__tool-name">{tool.name}</div>
                                                <div className="agent-builder__tool-desc">{tool.description}</div>
                                            </div>
                                            <div className="agent-builder__tool-toggle" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Step 4: Knowledge Base ── */}
                    {currentStep === 4 && (
                        <div className="agent-builder__form-section">
                            <div className="agent-builder__field">
                                <label className="agent-builder__label">
                                    Knowledge Base
                                    <span className="agent-builder__label-hint">— upload documents your agent can reference</span>
                                </label>
                                <div className="agent-builder__dropzone">
                                    <div className="agent-builder__dropzone-icon">📎</div>
                                    <div className="agent-builder__dropzone-text">
                                        Drag & drop files here, or click to browse
                                    </div>
                                    <div className="agent-builder__dropzone-hint">
                                        Supports PDF, MD, TXT, CSV, JSON · Max 10 MB per file
                                    </div>
                                </div>

                                {knowledgeDocs.length > 0 && (
                                    <div className="agent-builder__docs-list">
                                        {knowledgeDocs.map(doc => (
                                            <div key={doc.id} className="agent-builder__doc">
                                                <span>📄</span>
                                                <span className="agent-builder__doc-name">{doc.name}</span>
                                                <span className="agent-builder__doc-size">{doc.size}</span>
                                                <button
                                                    className="agent-builder__doc-remove"
                                                    onClick={() => removeDoc(doc.id)}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Step 5: Test Chat ── */}
                    {currentStep === 5 && (
                        <div className="agent-builder__test-panel">
                            <div className="agent-builder__test-messages">
                                {testMessages.map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`agent-builder__test-msg agent-builder__test-msg--${msg.role}`}
                                    >
                                        {msg.content}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="agent-builder__test-input-row">
                                <input
                                    className="agent-builder__test-input"
                                    type="text"
                                    placeholder="Test your agent..."
                                    value={testInput}
                                    onChange={(e) => setTestInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendTestMessage()}
                                />
                                <button className="agent-builder__test-send" onClick={sendTestMessage}>
                                    Send
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 6: Publish ── */}
                    {currentStep === 6 && (
                        <div className="agent-builder__form-section">
                            <div className="agent-builder__field">
                                <label className="agent-builder__label">Preview</label>
                                <div className="agent-builder__preview-card">
                                    <div
                                        className="agent-builder__preview-avatar"
                                        style={{ background: 'linear-gradient(135deg, rgba(212,168,67,0.2), rgba(212,168,67,0.05))' }}
                                    >
                                        {selectedAvatar}
                                    </div>
                                    <div className="agent-builder__preview-info">
                                        <div className="agent-builder__preview-name">
                                            {agentName || 'Untitled Agent'}
                                        </div>
                                        <div className="agent-builder__preview-desc">
                                            {description || systemPrompt.slice(0, 120) + (systemPrompt.length > 120 ? '...' : '')}
                                        </div>
                                        <div className="agent-builder__preview-tools-row">
                                            {enabledTools.map(t => (
                                                <span key={t.id} className="agent-builder__preview-tool-tag">
                                                    {t.icon} {t.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="agent-builder__field">
                                <label className="agent-builder__label">
                                    Tags
                                    <span className="agent-builder__label-hint">— help users discover your agent</span>
                                </label>
                                <input
                                    className="agent-builder__input"
                                    type="text"
                                    placeholder="e.g. productivity, research, coding..."
                                />
                            </div>

                            <div className="agent-builder__field">
                                <label className="agent-builder__label">Visibility</label>
                                <div className="agent-builder__tools-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                    <button className="agent-builder__tool active" style={{ justifyContent: 'center' }}>
                                        <span className="agent-builder__tool-icon">🌍</span>
                                        <div className="agent-builder__tool-name">Public</div>
                                    </button>
                                    <button className="agent-builder__tool" style={{ justifyContent: 'center' }}>
                                        <span className="agent-builder__tool-icon">🔗</span>
                                        <div className="agent-builder__tool-name">Link Only</div>
                                    </button>
                                    <button className="agent-builder__tool" style={{ justifyContent: 'center' }}>
                                        <span className="agent-builder__tool-icon">🔒</span>
                                        <div className="agent-builder__tool-name">Private</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
