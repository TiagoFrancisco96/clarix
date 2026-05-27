'use client';

import React, { useState } from 'react';
import './search.css';

/* ── Types ── */
interface Source {
    id: string;
    title: string;
    url: string;
    favicon: string;
    faviconBg: string;
    relevance: number;
}

interface SearchResult {
    query: string;
    report: string;
    sources: Source[];
    followUps: string[];
    timestamp: string;
}

/* ── Sample Data ── */
const SUGGESTIONS = [
    'Best AI coding tools in 2026',
    'How do transformers work?',
    'Compare React vs Vue vs Svelte',
    'Latest breakthroughs in quantum computing',
    'How to raise Series A funding',
    'Top productivity frameworks for developers',
];

const SAMPLE_RESULT: SearchResult = {
    query: 'What are the best AI coding assistants in 2026?',
    report: `<h3>Overview</h3>
<p>The AI coding assistant landscape has evolved dramatically in 2026, with several tools emerging as clear leaders for different use cases. The market has shifted from simple autocomplete to fully autonomous agentic coding.<sup>[1]</sup></p>

<h3>Top AI Coding Assistants</h3>
<ul>
<li><strong>Claude Code (Anthropic)</strong> — Leading in autonomous coding with Claude Opus 4.7. Excels at multi-file refactoring and agentic workflows.<sup>[2]</sup></li>
<li><strong>GitHub Copilot X</strong> — Deeply integrated with VS Code and GitHub. Best for inline completions and PR reviews.<sup>[3]</sup></li>
<li><strong>Cursor AI</strong> — Purpose-built IDE with AI-first experience. Strong at codebase-aware edits and chat.<sup>[4]</sup></li>
<li><strong>Google Jules</strong> — Powered by Gemini 2.5 Pro. Excellent at understanding large codebases and generating tests.<sup>[5]</sup></li>
</ul>

<h3>Key Trends</h3>
<p>The biggest shift in 2026 is the move toward <strong>agentic coding</strong>: tools that can plan, execute, test, and iterate autonomously rather than just suggesting completions. Early benchmarks show these agents can complete 85%+ of tasks with minimal human intervention.<sup>[1]</sup></p>

<p>Pricing has also become more competitive, with most tools offering generous free tiers and team plans under $30/user/month.<sup>[3]</sup></p>`,
    sources: [
        { id: 's1', title: 'The State of AI Coding in 2026', url: 'techcrunch.com/ai-coding-2026', favicon: '📰', faviconBg: '#2ecc71', relevance: 98 },
        { id: 's2', title: 'Claude Code: Full Autonomy Review', url: 'arstechnica.com/claude-code', favicon: '🔬', faviconBg: '#9b59b6', relevance: 95 },
        { id: 's3', title: 'GitHub Copilot X: What\'s New', url: 'github.blog/copilot-x-2026', favicon: '🐙', faviconBg: '#333', relevance: 92 },
        { id: 's4', title: 'Cursor AI Deep Dive', url: 'cursor.so/blog/ai-first-ide', favicon: '⚡', faviconBg: '#3498db', relevance: 88 },
        { id: 's5', title: 'Google Jules vs The Competition', url: 'theverge.com/google-jules', favicon: '📱', faviconBg: '#e74c3c', relevance: 85 },
        { id: 's6', title: 'Agentic Coding Benchmark Results', url: 'arxiv.org/agent-coding-bench', favicon: '📄', faviconBg: '#e67e22', relevance: 82 },
    ],
    followUps: [
        'How does Claude Code compare to Cursor AI for large projects?',
        'What are the pricing differences between these tools?',
        'Which AI coding tool is best for beginners?',
        'Can AI coding assistants replace junior developers?',
    ],
    timestamp: 'Researched 8 sources in 4.2s',
};

/* ── Component ── */
export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [isDeepMode, setIsDeepMode] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [result, setResult] = useState<SearchResult | null>(null);
    const [searchHistory, setSearchHistory] = useState<string[]>([
        'How to scale a PostgreSQL database',
        'Best practices for API design',
        'TypeScript vs JavaScript performance',
    ]);

    const handleSearch = (searchQuery?: string) => {
        const q = searchQuery || query;
        if (!q.trim()) return;
        setQuery(q);
        setIsSearching(true);
        setResult(null);
        setLoadingStep(0);
        setSearchHistory(prev => [q, ...prev.filter(h => h !== q)].slice(0, 20));

        // Simulate multi-step loading
        const steps = [500, 1200, 2000, 2800];
        steps.forEach((delay, i) => {
            setTimeout(() => setLoadingStep(i + 1), delay);
        });

        setTimeout(() => {
            setResult({
                ...SAMPLE_RESULT,
                query: q,
                timestamp: `Researched ${4 + Math.floor(Math.random() * 8)} sources in ${(2 + Math.random() * 4).toFixed(1)}s`,
            });
            setIsSearching(false);
        }, 3500);
    };

    return (
        <div className="search-page animate-fade-in-up">
            {/* ── History Sidebar ── */}
            <aside className="search-sidebar">
                <div className="search-sidebar__title">Search History</div>
                {searchHistory.length === 0 ? (
                    <div className="search-sidebar__empty">No searches yet</div>
                ) : (
                    searchHistory.map((h, i) => (
                        <button
                            key={`${h}-${i}`}
                            className="search-sidebar__item"
                            onClick={() => handleSearch(h)}
                            title={h}
                        >
                            <span className="search-sidebar__item-icon">🕒</span>
                            <span className="search-sidebar__item-text">{h}</span>
                        </button>
                    ))
                )}
            </aside>

            {/* ── Main Content ── */}
            <div className="search-main">
                {/* Hero */}
                {!result && !isSearching && (
                    <div className="search-hero">
                        <h1 className="search-hero__title">🔍 AI Search</h1>
                        <p className="search-hero__subtitle">
                            Deep research powered by multiple AI models. Get cited answers, not just links.
                        </p>
                    </div>
                )}

                {/* Search Bar */}
                <div className="search-bar">
                    <div className="search-bar__input-wrap">
                        <svg className="search-bar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            className="search-bar__input"
                            type="text"
                            placeholder={isDeepMode ? 'Ask a complex research question...' : 'Search anything...'}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <button
                            className={`search-bar__mode ${isDeepMode ? 'search-bar__mode--deep' : 'search-bar__mode--quick'}`}
                            onClick={() => setIsDeepMode(!isDeepMode)}
                        >
                            {isDeepMode ? '🔬 Deep' : '⚡ Quick'}
                        </button>
                    </div>
                    <button className="search-bar__submit" onClick={() => handleSearch()}>
                        Research
                    </button>
                </div>

                {/* Suggestions */}
                {!result && !isSearching && (
                    <div className="search-suggestions">
                        {SUGGESTIONS.map(s => (
                            <button key={s} className="search-suggestion" onClick={() => handleSearch(s)}>
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                {/* Loading State */}
                {isSearching && (
                    <div className="search-loading">
                        <div className="search-loading__steps">
                            {['Analyzing query...', 'Searching web sources...', 'Reading & extracting data...', 'Synthesizing report...'].map((step, i) => (
                                <div
                                    key={step}
                                    className={`search-loading__step ${loadingStep > i + 1 ? 'search-loading__step--done' :
                                        loadingStep === i + 1 ? 'search-loading__step--active' :
                                            'search-loading__step--pending'
                                        }`}
                                >
                                    <span className="search-loading__step-icon">
                                        {loadingStep > i + 1 ? '✓' : loadingStep === i + 1 ? '⟳' : '○'}
                                    </span>
                                    {step}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="search-results">
                        <div className="search-results__header">
                            <div className="search-results__query">{result.query}</div>
                            <div className="search-results__meta">{result.timestamp}</div>
                        </div>

                        {/* AI Report */}
                        <div className="search-report">
                            <div className="search-report__badge">✨ AI Research Report</div>
                            <div
                                className="search-report__content"
                                dangerouslySetInnerHTML={{ __html: result.report }}
                            />
                            <div className="search-report__actions">
                                <button className="search-report__action search-report__action--primary">
                                    📄 Export to Docs
                                </button>
                                <button className="search-report__action search-report__action--secondary">
                                    📋 Copy
                                </button>
                                <button className="search-report__action search-report__action--secondary">
                                    🔄 Regenerate
                                </button>
                            </div>
                        </div>

                        {/* Sources */}
                        <div>
                            <div className="search-sources__title">Sources ({result.sources.length})</div>
                            <div className="search-sources__grid">
                                {result.sources.map(source => (
                                    <div key={source.id} className="search-source">
                                        <div className="search-source__favicon" style={{ background: `${source.faviconBg}20` }}>
                                            {source.favicon}
                                        </div>
                                        <div className="search-source__info">
                                            <div className="search-source__title">{source.title}</div>
                                            <div className="search-source__url">{source.url}</div>
                                        </div>
                                        <span
                                            className="search-source__relevance"
                                            style={{
                                                background: source.relevance >= 90 ? 'rgba(46,204,113,0.15)' : 'rgba(243,156,18,0.15)',
                                                color: source.relevance >= 90 ? '#2ecc71' : '#f39c12',
                                            }}
                                        >
                                            {source.relevance}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Follow-up Questions */}
                        <div>
                            <div className="search-sources__title">Follow-up Questions</div>
                            <div className="search-followups">
                                {result.followUps.map(q => (
                                    <button key={q} className="search-followup" onClick={() => handleSearch(q)}>
                                        <span className="search-followup__icon">→</span>
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
