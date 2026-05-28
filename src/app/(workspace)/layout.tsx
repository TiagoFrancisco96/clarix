'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import { WelcomeModal } from '@/components/WelcomeModal';
import '@/components/welcome-modal.css';
import './workspace.css';

/* ── Navigation Structure ── */
interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    badge?: string;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

const navSections: NavSection[] = [
    {
        title: 'Create',
        items: [
            { label: 'Chat', href: '/chat', icon: <ChatNav /> },
            { label: 'Image', href: '/image', icon: <ImageNav /> },
            { label: 'Docs', href: '/docs', icon: <DocsNav /> },
            { label: 'Slides', href: '/slides', icon: <SlidesNav /> },
            { label: 'Sheets', href: '/sheets', icon: <SheetsNav /> },
        ],
    },
    {
        title: 'Research',
        items: [
            { label: 'Search', href: '/search', icon: <SearchNav /> },
            { label: 'Podcasts', href: '/podcasts', icon: <PodcastNav /> },
        ],
    },
    {
        title: 'Build',
        items: [
            { label: 'Developer', href: '/developer', icon: <DevNav /> },
            { label: 'Designer', href: '/designer', icon: <DesignerNav /> },
        ],
    },
    {
        title: 'Media',
        items: [
            { label: 'Music', href: '/music', icon: <MusicNav /> },
            { label: 'Video', href: '/video', icon: <VideoNav /> },
            { label: 'Meeting Notes', href: '/meeting-notes', icon: <MeetingNav /> },
        ],
    },
    {
        title: 'Agents',
        items: [
            { label: 'Browse Agents', href: '/agents', icon: <AgentsNav /> },
            { label: 'Create Agent', href: '/agents/new', icon: <CustomNav /> },
        ],
    },
    {
        title: 'Workspace',
        items: [
            { label: 'Drive', href: '/drive', icon: <DriveNav /> },
            { label: 'Inbox', href: '/inbox', icon: <InboxNav /> },
            { label: 'Admin', href: '/admin', icon: <AdminNav /> },
        ],
    },
];

/* ── Layout Component ── */
export default function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [creditBalance, setCreditBalance] = useState<number | null>(null);
    const [planCredits, setPlanCredits] = useState<number>(200);
    const [userPlan, setUserPlan] = useState<string>('free');

    const fetchCredits = useCallback(async () => {
        try {
            const res = await fetch('/api/credits');
            if (res.ok) {
                const data = await res.json();
                setCreditBalance(data.balance);
                setUserPlan(data.plan || 'free');
                setPlanCredits(data.plan_credits || 200);
            }
        } catch { /* silent fail */ }
    }, []);

    useEffect(() => {
        if (session?.user?.id) {
            fetchCredits();
            const interval = setInterval(fetchCredits, 30_000);
            return () => clearInterval(interval);
        }
    }, [session?.user?.id, fetchCredits]);

    // Refetch on page navigation (credits may have been spent)
    useEffect(() => {
        if (session?.user?.id) fetchCredits();
    }, [pathname, session?.user?.id, fetchCredits]);

    /* ── Keyboard shortcuts ── */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+K or Cmd+K → Navigate to search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                router.push('/search');
            }
            // Escape → close mobile menu
            if (e.key === 'Escape' && mobileOpen) {
                setMobileOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router, mobileOpen]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const currentPage = navSections
        .flatMap((s) => s.items)
        .filter((item) => pathname.startsWith(item.href))
        .sort((a, b) => b.href.length - a.href.length)[0];

    return (
        <div className="workspace-layout">
            {/* Mobile backdrop */}
            <div
                className={`sidebar-backdrop ${mobileOpen ? 'visible' : ''}`}
                onClick={() => setMobileOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
                <div className="sidebar__header">
                    <Link href="/" className="sidebar__logo">
                        <span className="sidebar__logo-icon">C</span>
                        <span>Clarix</span>
                    </Link>
                    <button
                        className="sidebar__toggle"
                        onClick={() => setCollapsed(!collapsed)}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {collapsed ? (
                                <polyline points="9 18 15 12 9 6" />
                            ) : (
                                <polyline points="15 18 9 12 15 6" />
                            )}
                        </svg>
                    </button>
                </div>

                <Link href="/" className="sidebar__new-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>New</span>
                </Link>

                <nav className="sidebar__nav">
                    {navSections.map((section) => (
                        <div key={section.title} className="sidebar__section">
                            <div className="sidebar__section-title">{section.title}</div>
                            {section.items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`sidebar__link ${pathname.startsWith(item.href) ? 'active' : ''}`}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    <span className="sidebar__link-icon">{item.icon}</span>
                                    <span className="sidebar__link-label">{item.label}</span>
                                    {item.badge && (
                                        <span className="sidebar__link-badge">{item.badge}</span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar__footer">
                    <Link href="/settings" className="sidebar__user">
                        <div className="sidebar__avatar">
                            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="sidebar__user-info">
                            <div className="sidebar__user-name">
                                {session?.user?.name || 'User'}
                            </div>
                            <div className="sidebar__user-plan">
                                {session?.user?.email || 'Free Plan'}
                            </div>
                        </div>
                    </Link>
                    {session && (
                        <button
                            className="sidebar__signout"
                            onClick={handleSignOut}
                            title="Sign out"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </button>
                    )}
                </div>
            </aside>

            {/* Main area */}
            <div className="workspace-main">
                <header className="topbar">
                    {/* Mobile hamburger */}
                    <button
                        className="topbar__action topbar__mobile-menu"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open menu"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>

                    <div className="topbar__breadcrumb">
                        <Link href="/">Home</Link>
                        {currentPage && (
                            <>
                                <span className="topbar__breadcrumb-sep">/</span>
                                <span className="topbar__breadcrumb-current">{currentPage.label}</span>
                            </>
                        )}
                    </div>

                    <div className="topbar__spacer" />

                    <div className="topbar__credits">
                        <span className="topbar__credits-icon">⚡</span>
                        <span className="topbar__credits-count">
                            {creditBalance !== null ? creditBalance.toLocaleString() : (
                                <span className="topbar__credits-skeleton" />
                            )}
                        </span>
                        <span>credits</span>
                    </div>

                    <Link href="/settings" className="topbar__action" title="Settings">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                        </svg>
                    </Link>
                </header>

                {/* Low-credit warning banner */}
                {creditBalance !== null && creditBalance < planCredits * 0.2 && creditBalance > 0 && (
                    <div className="topbar__low-credit-banner">
                        <span>⚡ You have <strong>{creditBalance}</strong> credits remaining.</span>
                        <Link href="/settings?tab=subscription">Upgrade plan →</Link>
                    </div>
                )}
                {creditBalance !== null && creditBalance <= 0 && (
                    <div className="topbar__low-credit-banner topbar__low-credit-banner--empty">
                        <span>⚠️ You’re out of credits! Generations are paused.</span>
                        <Link href="/settings?tab=subscription">Get more credits →</Link>
                    </div>
                )}

                <main className="workspace-content">
                    {children}
                </main>

                <WelcomeModal />
            </div>
        </div>
    );
}

/* ── Sidebar Nav Icons (small, 18px) ── */
function ChatNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
    );
}

function ImageNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
        </svg>
    );
}

function DocsNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    );
}

function SlidesNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
    );
}

function SheetsNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
    );
}

function DevNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
        </svg>
    );
}

function DesignerNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
        </svg>
    );
}

function MusicNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
        </svg>
    );
}

function VideoNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
    );
}

function MeetingNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" />
        </svg>
    );
}

function AgentsNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
        </svg>
    );
}

function CustomNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    );
}

function DriveNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
    );
}

function SearchNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
        </svg>
    );
}

function PodcastNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
    );
}

function InboxNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
        </svg>
    );
}

function AdminNav() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
}
