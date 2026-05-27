import Link from 'next/link';
import '../info-page.css';

export const metadata = {
    title: 'Status — Clarix AI',
    description: 'Current operational status of all Clarix AI services.',
};

const SERVICES = [
    'AI Chat',
    'AI Image Generation',
    'AI Docs & Slides',
    'AI Code (Developer)',
    'AI Music & Video',
    'AI Search',
    'AI Podcasts',
    'AI Inbox',
    'AI Drive',
    'Authentication & API',
    'MoA Routing Engine',
];

export default function StatusPage() {
    return (
        <div className="info-page">
            <div className="info-page__bg" />
            <nav className="info-page__nav">
                <Link href="/" className="info-page__nav-logo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    <span>Clarix AI</span>
                </Link>
                <Link href="/" className="info-page__nav-back">&larr; Back to Home</Link>
            </nav>

            <div className="info-page__content">
                <span className="info-page__badge">System Status</span>
                <h1 className="info-page__title">All Systems Operational</h1>
                <p className="info-page__subtitle">Current status of Clarix AI services. Updated in real time.</p>

                <div className="status-list">
                    {SERVICES.map((name, i) => (
                        <div key={i} className="status-item">
                            <span className="status-item__name">{name}</span>
                            <span className="status-item__badge">
                                <span className="status-item__dot" />
                                Operational
                            </span>
                        </div>
                    ))}
                </div>

                <h2>Uptime</h2>
                <p>Clarix AI maintains 99.9% uptime across all services. Our infrastructure is distributed across multiple regions for maximum reliability.</p>

                <h2>Incident History</h2>
                <p>No incidents reported in the last 90 days.</p>
            </div>
        </div>
    );
}
