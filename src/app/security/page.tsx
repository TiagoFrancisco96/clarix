import Link from 'next/link';
import '../info-page.css';

export const metadata = {
    title: 'Security — Clarix AI',
    description: 'How Clarix AI protects your data with enterprise-grade security.',
};

export default function SecurityPage() {
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
                <span className="info-page__badge">Trust &amp; Safety</span>
                <h1 className="info-page__title">Enterprise-Grade Security</h1>
                <p className="info-page__subtitle">Your data security is our top priority. Here&apos;s how we protect it.</p>

                <div className="values-grid">
                    <div className="value-card">
                        <div className="value-card__icon">&#x1F512;</div>
                        <div className="value-card__title">End-to-End Encryption</div>
                        <div className="value-card__desc">All data encrypted in transit (TLS 1.3) and at rest (AES-256).</div>
                    </div>
                    <div className="value-card">
                        <div className="value-card__icon">&#x1F6E1;&#xFE0F;</div>
                        <div className="value-card__title">SOC 2 Type II</div>
                        <div className="value-card__desc">Independently audited annually for security, availability, and confidentiality.</div>
                    </div>
                    <div className="value-card">
                        <div className="value-card__icon">&#x1F6AB;</div>
                        <div className="value-card__title">Zero Data Training</div>
                        <div className="value-card__desc">Your content is never used to train AI models. Guaranteed by contract.</div>
                    </div>
                    <div className="value-card">
                        <div className="value-card__icon">&#x1F310;</div>
                        <div className="value-card__title">GDPR Compliant</div>
                        <div className="value-card__desc">Full compliance with EU data protection regulations.</div>
                    </div>
                </div>

                <h2>Infrastructure</h2>
                <p>Clarix AI runs on enterprise-grade cloud infrastructure with multi-region redundancy. We maintain separate compute environments for processing and storage, ensuring your data is never co-located with other customers.</p>

                <h2>Access Controls</h2>
                <p>All internal access to production systems requires multi-factor authentication, VPN, and role-based permissions. Access is logged and audited. No Clarix employee can access your content without explicit authorization.</p>

                <h2>Incident Response</h2>
                <p>Our security team operates 24/7 monitoring with automated threat detection. In the unlikely event of a security incident, we commit to notifying affected users within 72 hours.</p>

                <h2>Responsible Disclosure</h2>
                <p>If you discover a security vulnerability, please report it to <strong style={{ color: '#d4a843' }}>security@Clarix.ai</strong>. We offer a bug bounty program for qualifying reports.</p>
            </div>
        </div>
    );
}
