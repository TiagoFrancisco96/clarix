'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import '../info-page.css';

type Tab = 'about' | 'careers' | 'changelog' | 'blog' | 'contact';

function InfoPageInner() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab') as Tab | null;

    const [activeTab, setActiveTab] = useState<Tab>('about');
    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactTopic, setContactTopic] = useState('support');
    const [contactMessage, setContactMessage] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Sync active tab with URL query parameter
    useEffect(() => {
        if (tabParam && ['about', 'careers', 'changelog', 'blog', 'contact'].includes(tabParam)) {
            setTimeout(() => {
                setActiveTab(tabParam);
            }, 0);
        }
    }, [tabParam]);

    useEffect(() => {
        document.title = `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} — Clarix AI`;
    }, [activeTab]);

    const handleContactSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactName || !contactEmail || !contactMessage) return;

        // Simulate successful submission
        setSubmitSuccess(true);
        setContactName('');
        setContactEmail('');
        setContactMessage('');
        setTimeout(() => setSubmitSuccess(false), 5000);
    };

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'about', label: 'About Us', icon: '⚡' },
        { id: 'careers', label: 'Careers', icon: '💼' },
        { id: 'changelog', label: 'Changelog', icon: '📅' },
        { id: 'blog', label: 'Engineering Blog', icon: '📝' },
        { id: 'contact', label: 'Contact Us', icon: '✉️' },
    ];

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

            <div className="info-page__content info-page__content--wide">
                {/* Horizontal premium tabs selection */}
                <div className="info-hub-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`info-hub-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="info-hub-tab__icon">{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab content panel */}
                <div className="info-hub-panel">
                    
                    {/* ── About Us Tab ── */}
                    {activeTab === 'about' && (
                        <div className="info-hub-section fade-in">
                            <span className="info-page__badge">Our Story</span>
                            <h1 className="info-page__title">All Your AI Tools in One Place</h1>
                            <p className="info-page__subtitle">
                                Clarix AI is an all-in-one platform that gives you access to the world&apos;s best AI tools under one simple workspace.
                            </p>

                            <h2>Our Vision</h2>
                            <p>
                                There are too many AI tools out there, and picking the right one is overwhelming. Clarix solves this by putting the 4 best AIs in one place and automatically picking the right one for your task — so you never have to think about it.
                            </p>

                            <h2>Core Values</h2>
                            <div className="values-grid" style={{ marginTop: '2rem' }}>
                                <div className="value-card">
                                    <div className="value-card__icon">⚡</div>
                                    <div className="value-card__title">Lightning Fast</div>
                                    <div className="value-card__desc">Instant responses across all tools — no waiting around.</div>
                                </div>
                                <div className="value-card">
                                    <div className="value-card__icon">🔒</div>
                                    <div className="value-card__title">Absolute Privacy</div>
                                    <div className="value-card__desc">Your conversations and files are never used for model training.</div>
                                </div>
                                <div className="value-card">
                                    <div className="value-card__icon">✨</div>
                                    <div className="value-card__title">Product Excellence</div>
                                    <div className="value-card__desc">We ship beautiful, easy-to-use software that just works.</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Careers Tab ── */}
                    {activeTab === 'careers' && (
                        <div className="info-hub-section fade-in">
                            <span className="info-page__badge">Work With Us</span>
                            <h1 className="info-page__title">Build the Future of Workspace AI</h1>
                            <p className="info-page__subtitle">
                                We are looking for product-driven engineers, researchers, and designers to build the ultimate AI operating system.
                            </p>

                            <div className="info-card-grid">
                                <div className="info-card">
                                    <div className="info-card__tag">Engineering</div>
                                    <div className="info-card__title">AI Systems Engineer</div>
                                    <div className="info-card__desc">Build and optimize the systems that connect our users to the world&apos;s best AI models, fast and reliably.</div>
                                    <div className="info-card__meta">Remote · Full-time · $160K - $220K</div>
                                </div>
                                <div className="info-card">
                                    <div className="info-card__tag">Design</div>
                                    <div className="info-card__title">Senior Product Designer (AI)</div>
                                    <div className="info-card__desc">Design state-of-the-art interactive creation tools, spreadsheets, slide editors, and agent panels.</div>
                                    <div className="info-card__meta">Remote · Full-time · $140K - $190K</div>
                                </div>
                                <div className="info-card">
                                    <div className="info-card__tag">Marketing</div>
                                    <div className="info-card__title">Developer Relations Manager</div>
                                    <div className="info-card__desc">Grow our open-source agent integration ecosystem and deliver premium technical workshops.</div>
                                    <div className="info-card__meta">Remote · Full-time · $110K - $150K</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Changelog Tab ── */}
                    {activeTab === 'changelog' && (
                        <div className="info-hub-section fade-in">
                            <span className="info-page__badge">Release Log</span>
                            <h1 className="info-page__title">Recent Shipped Updates</h1>
                            <p className="info-page__subtitle">
                                Catch up on the latest platform improvements, framework compliance upgrades, and features.
                            </p>

                            <div className="changelog-timeline">
                                <div className="timeline-item">
                                    <div className="timeline-item__badge">May 2026</div>
                                    <h3 className="timeline-item__title">v2.1 — Dynamic Status & Audits</h3>
                                    <p className="timeline-item__text">
                                        Launched a real-time health monitor that checks all AI providers are online and responding fast. Added automated testing tools directly in the admin panel.
                                    </p>
                                </div>
                                <div className="timeline-item">
                                    <div className="timeline-item__badge">April 2026</div>
                                    <h3 className="timeline-item__title">v2.0 — Smarter AI Routing</h3>
                                    <p className="timeline-item__text">
                                        Launched a smarter system that automatically picks the best AI for each task, cutting costs by 35% while delivering better answers. Added built-in audio and video creation.
                                    </p>
                                </div>
                                <div className="timeline-item">
                                    <div className="timeline-item__badge">March 2026</div>
                                    <h3 className="timeline-item__title">v1.8 — React 19 & Next.js Upgrades</h3>
                                    <p className="timeline-item__text">
                                        Major under-the-hood upgrade to make the entire workspace faster and more reliable. Improved how all tools load and respond.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Engineering Blog Tab ── */}
                    {activeTab === 'blog' && (
                        <div className="info-hub-section fade-in">
                            <span className="info-page__badge">Engineering Notes</span>
                            <h1 className="info-page__title">From the Clarix Tech Blog</h1>
                            <p className="info-page__subtitle">
                                Behind-the-scenes insights from our engineering, security, and AI teams.
                            </p>

                            <div className="info-card-grid">
                                <div className="info-card">
                                    <div className="info-card__tag">Infrastructure</div>
                                    <div className="info-card__title">How We Keep Your AI Running 24/7</div>
                                    <div className="info-card__desc">How we built a backup system that automatically switches to a different AI if one goes down — so your work is never interrupted.</div>
                                    <div className="info-card__meta">By the Engineering Team · 6 min read</div>
                                </div>
                                <div className="info-card">
                                    <div className="info-card__tag">Compliance</div>
                                    <div className="info-card__title">Your Data is Never Used for AI Training</div>
                                    <div className="info-card__desc">How we make sure none of the AI companies we work with can use your conversations or files to improve their models.</div>
                                    <div className="info-card__meta">By the Security Team · 4 min read</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Contact Us Tab ── */}
                    {activeTab === 'contact' && (
                        <div className="info-hub-section fade-in">
                            <span className="info-page__badge">Support Hub</span>
                            <h1 className="info-page__title">Get in Touch</h1>
                            <p className="info-page__subtitle">
                                Have questions about our custom team plans, custom integrations, or billing? Drop us a line.
                            </p>

                            {submitSuccess ? (
                                <div className="contact-success-msg">
                                    <span className="contact-success-icon">✓</span>
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>Message Sent Successfully!</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>We&apos;ve received your request and will respond within 4 hours.</div>
                                    </div>
                                </div>
                            ) : (
                                <form className="contact-form" onSubmit={handleContactSubmit}>
                                    <div className="contact-form__row">
                                        <div>
                                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Your Name</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Elena Rossi"
                                                value={contactName}
                                                onChange={(e) => setContactName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                                            <input
                                                type="email"
                                                required
                                                placeholder="elena@company.com"
                                                value={contactEmail}
                                                onChange={(e) => setContactEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Topic</label>
                                        <select
                                            value={contactTopic}
                                            onChange={(e) => setContactTopic(e.target.value)}
                                        >
                                            <option value="support">Technical Support</option>
                                            <option value="billing">Billing & Pricing</option>
                                            <option value="enterprise">Custom Enterprise Plan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Your Message</label>
                                        <textarea
                                            required
                                            placeholder="Write your message here..."
                                            value={contactMessage}
                                            onChange={(e) => setContactMessage(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" className="contact-form__btn">Send Message</button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Interactive Hub Styling Blocks */}
            <style jsx global>{`
                .info-page__content--wide {
                    max-width: 900px;
                }
                .info-hub-tabs {
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    gap: var(--space-2);
                    padding: 4px;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-xl);
                    margin-bottom: var(--space-8);
                    overflow-x: auto;
                }
                .info-hub-tab {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: var(--space-2) var(--space-4);
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    font-size: 0.85rem;
                    font-weight: 600;
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all var(--transition-fast);
                }
                .info-hub-tab:hover {
                    color: var(--text-primary);
                    background: rgba(255, 255, 255, 0.03);
                }
                .info-hub-tab.active {
                    color: var(--accent-gold);
                    background: rgba(212, 168, 67, 0.1);
                    border: 1px solid rgba(212, 168, 67, 0.15);
                }
                .info-hub-tab__icon {
                    font-size: 0.95rem;
                }
                .info-hub-panel {
                    min-height: 400px;
                    padding: var(--space-6) var(--space-8);
                    background: rgba(20, 20, 22, 0.4);
                    backdrop-filter: blur(20px);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-2xl);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                }
                .fade-in {
                    animation: fadeIn 0.4s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .changelog-timeline {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-6);
                    position: relative;
                    padding-left: var(--space-6);
                    margin-top: var(--space-6);
                }
                .changelog-timeline::before {
                    content: '';
                    position: absolute;
                    left: 2px;
                    top: 8px;
                    bottom: 8px;
                    width: 2px;
                    background: var(--border-subtle);
                }
                .timeline-item {
                    position: relative;
                }
                .timeline-item::before {
                    content: '';
                    position: absolute;
                    left: -27px;
                    top: 6px;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--accent-gold);
                    box-shadow: 0 0 6px var(--accent-gold);
                }
                .timeline-item__badge {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: var(--accent-gold);
                    text-transform: uppercase;
                    margin-bottom: 2px;
                }
                .timeline-item__title {
                    font-size: 1rem;
                    font-weight: 700;
                    margin: 0 0 6px 0 !important;
                }
                .timeline-item__text {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    line-height: 1.6;
                }
                .contact-success-msg {
                    display: flex;
                    align-items: center;
                    gap: var(--space-4);
                    padding: var(--space-5);
                    background: rgba(46, 204, 113, 0.05);
                    border: 1px solid rgba(46, 204, 113, 0.2);
                    border-radius: var(--radius-xl);
                    margin-top: var(--space-6);
                }
                .contact-success-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: #2ecc71;
                    color: white;
                    font-weight: 800;
                    font-size: 1rem;
                }
                @media (max-width: 768px) {
                    .info-hub-panel {
                        padding: var(--space-5) var(--space-4);
                    }
                }
            `}</style>
        </div>
    );
}

export default function InfoPage() {
    return (
        <Suspense fallback={<div className="info-page"><div className="info-page__content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="chat-input__spinner" /></div></div>}>
            <InfoPageInner />
        </Suspense>
    );
}
