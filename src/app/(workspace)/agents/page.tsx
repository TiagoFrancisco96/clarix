'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FEATURED_AGENT, AGENTS } from '@/lib/agents';
import './agents.css';

const CATEGORIES = ['All', 'Productivity', 'Creative', 'Development', 'Research', 'Marketing', 'Sales', 'Data'];

export default function AgentsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const filteredAgents = AGENTS.filter(agent => {
        const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || agent.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleUseAgent = (agentId: string) => {
        router.push(`/chat?agent=${agentId}`);
    };

    return (
        <div className="agents-page">
            <div className="agents-page__header">
                <div className="agents-page__title">🤖 Agent Marketplace</div>
                <div className="agents-page__subtitle">Browse and use ready-made AI agents that handle tasks for you — no setup needed.</div>
            </div>

            {/* Toolbar */}
            <div className="agents-page__toolbar">
                <div className="agents-page__search">
                    <span className="agents-page__search-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </span>
                    <input
                        className="agents-page__search-input"
                        placeholder="Search agents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="agents-page__categories">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            className={`agents-page__category ${selectedCategory === cat ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <Link href="/agents/new" className="agents-page__create">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14m-7-7h14" /></svg>
                    Create Agent
                </Link>
            </div>

            {/* Featured Agent */}
            <div className="agents-page__featured">
                <div className="agents-page__featured-icon" style={{ background: FEATURED_AGENT.gradient }}>
                    {FEATURED_AGENT.icon}
                </div>
                <div className="agents-page__featured-info">
                    <span className="agents-page__featured-badge">⭐ Featured</span>
                    <div className="agents-page__featured-name">{FEATURED_AGENT.name}</div>
                    <div className="agents-page__featured-desc">{FEATURED_AGENT.description}</div>
                    <div className="agents-page__featured-stats">
                        <span className="agents-page__featured-stat"><strong>{FEATURED_AGENT.uses}</strong> uses</span>
                        <span className="agents-page__featured-stat"><strong>⭐ {FEATURED_AGENT.rating}</strong> rating</span>
                    </div>
                </div>
                <button className="agents-page__featured-cta" onClick={() => handleUseAgent(FEATURED_AGENT.id)}>Use Agent →</button>
            </div>

            {/* Agent Grid */}
            <div className="agents-page__grid">
                {filteredAgents.map(agent => (
                    <div key={agent.id} className="agent-card">
                        <div className="agent-card__header">
                            <div className="agent-card__icon" style={{ background: agent.gradient }}>
                                {agent.icon}
                            </div>
                            <div className="agent-card__info">
                                <div className="agent-card__name">{agent.name}</div>
                                <div className="agent-card__category">{agent.category}</div>
                            </div>
                        </div>
                        <div className="agent-card__desc">{agent.description}</div>
                        <div className="agent-card__footer">
                            <div className="agent-card__stats">
                                <span>{agent.uses} uses</span>
                                <span>⭐ {agent.rating}</span>
                            </div>
                            <button className="agent-card__use" onClick={() => handleUseAgent(agent.id)}>Use Agent</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
