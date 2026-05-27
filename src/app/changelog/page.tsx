import Link from 'next/link';
import '../info-page.css';

export const metadata = {
    title: 'Changelog — Clarix AI',
    description: 'See what\'s new in Clarix AI. Product updates, new features, and improvements.',
};

const ENTRIES = [
    { date: 'Feb 10, 2026', tag: 'New Feature', title: 'AI Inbox — Smart Email Management', desc: 'Manage, draft, and respond to emails with AI-powered suggestions and automation.' },
    { date: 'Feb 6, 2026', tag: 'Improvement', title: 'MoA 2.0 Routing Engine', desc: 'Completely rewritten routing engine with 23% better output quality and 40% faster model selection.' },
    { date: 'Feb 3, 2026', tag: 'New Model', title: 'GPT-5.5 & Claude Opus 4.7 Added', desc: 'Both models now available across all tools. MoA automatically routes to them for optimal tasks.' },
    { date: 'Jan 28, 2026', tag: 'New Feature', title: 'AI Podcasts', desc: 'Generate professional podcast episodes from any text, document, or topic. Multiple voices and styles.' },
    { date: 'Jan 22, 2026', tag: 'Improvement', title: 'Drive Storage Upgrade', desc: 'Free tier upgraded to 5 GB. Pro users now get 100 GB with intelligent file organization.' },
    { date: 'Jan 15, 2026', tag: 'New Feature', title: 'AI Search — Deep Research', desc: 'Multi-source research assistant that synthesizes information from across the web with citations.' },
];

export default function ChangelogPage() {
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
                <span className="info-page__badge">Changelog</span>
                <h1 className="info-page__title">What&apos;s New</h1>
                <p className="info-page__subtitle">The latest updates, features, and improvements to Clarix AI.</p>

                <div className="info-card-grid">
                    {ENTRIES.map((e, i) => (
                        <div key={i} className="info-card">
                            <span className="info-card__tag">{e.tag}</span>
                            <h3 className="info-card__title">{e.title}</h3>
                            <p className="info-card__desc">{e.desc}</p>
                            <span className="info-card__meta">{e.date}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
