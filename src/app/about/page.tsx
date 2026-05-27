import Link from 'next/link';
import '../info-page.css';

export const metadata = {
    title: 'About — Clarix AI',
    description: 'Learn about Clarix AI, our mission to democratize AI tools, and the team behind the platform.',
};

export default function AboutPage() {
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
                <span className="info-page__badge">Our Story</span>
                <h1 className="info-page__title">Building the Future of AI Workspaces</h1>
                <p className="info-page__subtitle">
                    Clarix AI was founded with a simple belief: everyone deserves access to the world&apos;s best AI models in one unified workspace &mdash; without complexity, lock-in, or compromise.
                </p>

                <h2>Our Mission</h2>
                <p>
                    We&apos;re building the most powerful all-in-one AI platform that routes every task to the best model automatically. Our proprietary Mixture of Agents (MoA) technology means you never have to choose between models &mdash; Clarix chooses for you.
                </p>

                <h2>Our Values</h2>
                <div className="values-grid">
                    <div className="value-card">
                        <div className="value-card__icon">&#x26A1;</div>
                        <div className="value-card__title">Speed</div>
                        <div className="value-card__desc">Sub-200ms response times. We obsess over every millisecond.</div>
                    </div>
                    <div className="value-card">
                        <div className="value-card__icon">&#x1F512;</div>
                        <div className="value-card__title">Privacy</div>
                        <div className="value-card__desc">Your data is never used for training. Period. SOC 2 compliant.</div>
                    </div>
                    <div className="value-card">
                        <div className="value-card__icon">&#x1F30D;</div>
                        <div className="value-card__title">Accessibility</div>
                        <div className="value-card__desc">Available in 150+ countries. Built for everyone.</div>
                    </div>
                    <div className="value-card">
                        <div className="value-card__icon">&#x2728;</div>
                        <div className="value-card__title">Excellence</div>
                        <div className="value-card__desc">We ship the best product, not the fastest MVP.</div>
                    </div>
                </div>

                <h2>Leadership</h2>
                <p>Clarix AI is led by a team of AI researchers, product designers, and engineers from leading technology companies. We&apos;re backed by world-class investors and driven by the mission to make AI accessible to every creator, developer, and team.</p>

                <h2>Join Us</h2>
                <p>We&apos;re always looking for exceptional people to join us. Check out our <Link href="/careers" style={{ color: '#d4a843' }}>open positions</Link>.</p>
            </div>
        </div>
    );
}
