'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCreations } from '@/hooks/useCreations';
import { useToast } from '@/components/Toast';
import './docs.css';

/* ── Types ── */
interface DocTemplate {
    id: string;
    name: string;
    icon: string;
    description: string;
    content: string;
}

const TEMPLATES: DocTemplate[] = [
    { id: 'blank', name: 'Blank', icon: '📄', description: 'Start from scratch', content: '' },
    { id: 'resume', name: 'Resume', icon: '📋', description: 'Professional resume', content: '# Your Name\n\n**Email:** your@email.com | **Phone:** (555) 123-4567 | **Location:** City, State\n\n---\n\n## Professional Summary\n\nExperienced professional with expertise in...\n\n## Experience\n\n### Senior Role — Company Name\n*Jan 2023 – Present*\n\n- Led cross-functional team of 8 engineers\n- Increased system performance by 40%\n- Implemented CI/CD pipeline\n\n### Mid-Level Role — Previous Company\n*Jun 2020 – Dec 2022*\n\n- Developed key features for flagship product\n- Mentored junior developers\n\n## Education\n\n**Bachelor of Science in Computer Science**\nUniversity Name — 2020\n\n## Skills\n\nJavaScript, TypeScript, React, Node.js, Python, AWS, Docker' },
    { id: 'blog', name: 'Blog Post', icon: '✍️', description: 'Engaging article', content: '# Your Blog Post Title\n\n*By Author Name — February 2026*\n\n## Introduction\n\nHook your reader with a compelling opening...\n\n## Main Points\n\n### Point One\n\nElaborate on your first key idea...\n\n### Point Two\n\nDevelop your second argument...\n\n## Conclusion\n\nWrap up with a call to action or key takeaway.' },
    { id: 'report', name: 'Report', icon: '📊', description: 'Business report', content: '# Quarterly Report — Q4 2025\n\n**Prepared by:** Your Name\n**Date:** February 2026\n\n---\n\n## Executive Summary\n\nBrief overview of key findings...\n\n## Key Metrics\n\n| Metric | Q3 2025 | Q4 2025 | Change |\n|--------|---------|---------|--------|\n| Revenue | $1.2M | $1.5M | +25% |\n| Users | 10K | 15K | +50% |\n\n## Analysis\n\nDetailed analysis of the quarter...\n\n## Recommendations\n\n1. Focus on user retention\n2. Expand to new markets\n3. Invest in product development' },
    { id: 'proposal', name: 'Proposal', icon: '💼', description: 'Project proposal', content: '# Project Proposal\n\n## Overview\n\nBrief description of the proposed project...\n\n## Problem Statement\n\nWhat problem does this solve?\n\n## Proposed Solution\n\nHow will we solve it?\n\n## Timeline\n\n- **Phase 1:** Research (2 weeks)\n- **Phase 2:** Development (4 weeks)\n- **Phase 3:** Testing (2 weeks)\n\n## Budget\n\nEstimated cost: $XX,XXX\n\n## Expected Outcomes\n\nWhat success looks like...' },
    { id: 'letter', name: 'Cover Letter', icon: '✉️', description: 'Job application letter', content: '# Cover Letter\n\nDear Hiring Manager,\n\nI am writing to express my interest in the [Position] role at [Company]...\n\n## Why Me\n\nWith X years of experience in...\n\n## What I Bring\n\n- Deep expertise in...\n- Proven track record of...\n- Passion for...\n\nI would welcome the opportunity to discuss how my background aligns with your needs.\n\nBest regards,\nYour Name' },
];

const AI_ACTIONS = [
    { id: 'generate', label: 'Write', icon: '✨', desc: 'Generate content from a prompt' },
    { id: 'expand', label: 'Expand', icon: '📝', desc: 'Elaborate on selected text' },
    { id: 'summarize', label: 'Summarize', icon: '📌', desc: 'Condense the content' },
    { id: 'improve', label: 'Polish', icon: '💎', desc: 'Improve clarity and flow' },
    { id: 'translate', label: 'Translate', icon: '🌍', desc: 'Translate to another language' },
    { id: 'tone', label: 'Change Tone', icon: '🎭', desc: 'Make it formal, casual, etc.' },
];

/* ── Main Docs Page ── */
export default function DocsPage() {
    const [documents, setDocuments] = useState<Array<{ id: string; title: string; content: string; updatedAt: number }>>([]);
    const [activeDocId, setActiveDocId] = useState<string | null>(null);
    const [showTemplates, setShowTemplates] = useState(true);
    const [showAiMenu, setShowAiMenu] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiWorking, setIsAiWorking] = useState(false);
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const aiMenuRef = useRef<HTMLDivElement>(null);

    // Persistence
    const { creations, isLoading: isLoadingDocs, saveCreation } = useCreations('docs');
    const { toast } = useToast();

    const activeDoc = documents.find((d) => d.id === activeDocId);

    // Load saved docs on mount
    useEffect(() => {
        if (!isLoadingDocs && creations.length > 0 && documents.length === 0) {
            const savedDocs = creations.map(c => ({
                id: c.id,
                title: c.title,
                content: c.content,
                updatedAt: new Date(c.created_at).getTime(),
            }));
            const timer = setTimeout(() => {
                setDocuments(savedDocs);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isLoadingDocs, creations, documents]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
                setShowAiMenu(false);
            }
        };
        if (showAiMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAiMenu]);

    const createFromTemplate = useCallback((template: DocTemplate) => {
        const now = Date.now();
        const doc = {
            id: `doc-${now}`,
            title: template.id === 'blank' ? 'Untitled Document' : template.name,
            content: template.content,
            updatedAt: now,
        };
        setDocuments((prev) => [doc, ...prev]);
        setActiveDocId(doc.id);
        setShowTemplates(false);
        // Save to server
        saveCreation({ title: doc.title, content: doc.content });
    }, [saveCreation]);

    const updateContent = useCallback((content: string) => {
        const now = Date.now();
        setDocuments((prev) =>
            prev.map((d) =>
                d.id === activeDocId ? { ...d, content, updatedAt: now } : d
            )
        );
    }, [activeDocId]);

    const updateTitle = useCallback((title: string) => {
        const now = Date.now();
        setDocuments((prev) =>
            prev.map((d) =>
                d.id === activeDocId ? { ...d, title, updatedAt: now } : d
            )
        );
    }, [activeDocId]);

    const handleAiAction = async (actionId: string) => {
        if (!activeDoc) return;
        setIsAiWorking(true);
        setShowAiMenu(false);

        const systemPrompts: Record<string, string> = {
            generate: `You are a document writing assistant. Generate content based on the user's prompt. Output clean text suitable for a markdown document. Do not include code fences or "here is" preamble.`,
            expand: `You are a writing assistant. Expand and elaborate on the following text with more detail, examples, and depth. Output only the expanded text.`,
            summarize: `You are a writing assistant. Summarize the following text concisely. Start with "> **Summary:**" followed by the key points.`,
            improve: `You are a writing assistant. Improve the clarity, flow, and professionalism of the following text. Output only the improved version.`,
            translate: `You are a translator. Translate the following text to French. Output only the translation.`,
            tone: `You are a writing assistant. Rewrite the following text in a casual, friendly tone. Output only the rewritten version.`,
        };

        const userContent = actionId === 'generate'
            ? aiPrompt || 'Write a paragraph about this topic.'
            : activeDoc.content;

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompts[actionId] || systemPrompts.generate },
                        { role: 'user', content: userContent },
                    ],
                    model: 'auto',
                }),
            });

            if (res.status === 402) {
                toast('You\'re out of credits. Upgrade in Settings → Subscription.', 'warning');
                setIsAiWorking(false);
                return;
            }

            let fullText = '';
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'chunk') fullText += data.text;
                            if (data.type === 'done' && data.fullText) fullText = data.fullText;
                        } catch { /* skip */ }
                    }
                }
            }

            const addition = actionId === 'improve' || actionId === 'tone' || actionId === 'translate'
                ? fullText   // replace content
                : `\n\n${fullText}`; // append content

            const newContent = actionId === 'improve' || actionId === 'tone' || actionId === 'translate'
                ? fullText
                : activeDoc.content + `\n\n${fullText}`;

            updateContent(newContent);
            saveCreation({ title: activeDoc.title, content: newContent });
        } catch (err) {
            console.error('[Docs AI] Error:', err);
            updateContent(activeDoc.content + '\n\n*AI generation failed. Please try again.*');
        } finally {
            setAiPrompt('');
            setIsAiWorking(false);
        }
    };

    // Template Selection View
    if (showTemplates && !activeDocId) {
        return (
            <div className="docs-templates animate-fade-in-up">
                <div className="docs-templates__header">
                    <h2>Start a Document</h2>
                    <p>Choose a template to get started or create from scratch</p>
                </div>
                <div className="docs-templates__grid">
                    {TEMPLATES.map((t) => (
                        <button
                            key={t.id}
                            className="docs-template-card"
                            onClick={() => createFromTemplate(t)}
                        >
                            <span className="docs-template-card__icon">{t.icon}</span>
                            <span className="docs-template-card__name">{t.name}</span>
                            <span className="docs-template-card__desc">{t.description}</span>
                        </button>
                    ))}
                </div>

                {documents.length > 0 && (
                    <div className="docs-templates__recent">
                        <h3>Recent Documents</h3>
                        <div className="docs-recent-list">
                            {documents.map((doc) => (
                                <button
                                    key={doc.id}
                                    className="docs-recent-item"
                                    onClick={() => {
                                        setActiveDocId(doc.id);
                                        setShowTemplates(false);
                                    }}
                                >
                                    <span className="docs-recent-item__icon">📄</span>
                                    <div className="docs-recent-item__info">
                                        <span className="docs-recent-item__title">{doc.title}</span>
                                        <span className="docs-recent-item__date">
                                            {new Date(doc.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Editor View
    return (
        <div className="docs-editor">
            {/* Toolbar */}
            <div className="docs-toolbar">
                <button
                    className="docs-toolbar__back"
                    onClick={() => {
                        setActiveDocId(null);
                        setShowTemplates(true);
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    All Docs
                </button>

                <div className="docs-toolbar__spacer" />

                {/* AI Button */}
                <div className="docs-toolbar__ai-wrapper" ref={aiMenuRef}>
                    <button
                        className="docs-toolbar__ai-btn"
                        onClick={() => setShowAiMenu(!showAiMenu)}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        AI Assist
                    </button>

                    {showAiMenu && (
                        <div className="docs-ai-menu">
                            <div className="docs-ai-menu__prompt-area">
                                <input
                                    className="docs-ai-menu__prompt"
                                    placeholder="Tell AI what to write..."
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && aiPrompt.trim()) {
                                            handleAiAction('generate');
                                        }
                                    }}
                                    autoFocus
                                />
                            </div>
                            <div className="docs-ai-menu__actions">
                                {AI_ACTIONS.map((action) => (
                                    <button
                                        key={action.id}
                                        className="docs-ai-menu__action"
                                        onClick={() => handleAiAction(action.id)}
                                    >
                                        <span>{action.icon}</span>
                                        <div>
                                            <span className="docs-ai-menu__action-label">{action.label}</span>
                                            <span className="docs-ai-menu__action-desc">{action.desc}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <button className="docs-toolbar__action" title="Export" onClick={() => { if (!activeDoc) return; const blob = new Blob([`# ${activeDoc.title}\n\n${activeDoc.content}`], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${activeDoc.title.replace(/\s+/g, '-').toLowerCase()}.md`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                </button>
            </div>

            {/* AI working indicator */}
            {isAiWorking && (
                <div className="docs-ai-bar">
                    <div className="docs-ai-bar__spinner" />
                    <span>AI is writing...</span>
                </div>
            )}

            {/* Title */}
            <input
                className="docs-editor__title"
                value={activeDoc?.title || ''}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Untitled Document"
            />

            {/* Content Editor */}
            <textarea
                ref={editorRef}
                className="docs-editor__content"
                value={activeDoc?.content || ''}
                onChange={(e) => updateContent(e.target.value)}
                placeholder="Start writing... (Supports Markdown)"
            />

            {/* Status bar */}
            <div className="docs-statusbar">
                <span>{(activeDoc?.content || '').split(/\s+/).filter(Boolean).length} words</span>
                <span>·</span>
                <span>{(activeDoc?.content || '').length} characters</span>
                <span>·</span>
                <span>Markdown</span>
                <div className="docs-statusbar__spacer" />
                <span className="docs-statusbar__credits">⚡ 2 credits per AI action</span>
            </div>
        </div>
    );
}
