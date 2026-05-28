import Link from 'next/link';
import '../info-page.css';

export const metadata = {
    title: 'Privacy Policy — Clarix AI',
    description: 'How Clarix AI collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
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
                <span className="info-page__badge">Legal</span>
                <h1 className="info-page__title">Privacy Policy</h1>
                <p className="info-page__subtitle">Last updated: February 1, 2026</p>

                <h2>1. Information We Collect</h2>
                <p>We collect information you provide directly, such as your name, email address, and payment information when you create an account or subscribe to our services.</p>
                <p>We also collect usage data such as prompts submitted, tools used, and session duration to improve our service quality. This data is aggregated and anonymized.</p>

                <h2>2. How We Use Your Information</h2>
                <ul>
                    <li>To provide, maintain, and improve our AI services</li>
                    <li>To process transactions and manage your account</li>
                    <li>To send you service updates and security alerts</li>
                    <li>To analyze aggregate usage patterns (never individual content)</li>
                </ul>

                <h2>3. Data Protection</h2>
                <p>Your prompts and AI-generated content are encrypted end-to-end. We never use your content to train AI models. We are SOC 2 Type II compliant and undergo annual third-party security audits.</p>

                <h2>4. Data Sharing</h2>
                <p>We do not sell your personal information. We share data only with the AI companies that power your requests (OpenAI, Anthropic, Google, etc.), and they are contractually prohibited from using this data for training.</p>

                <h2>5. Data Retention</h2>
                <p>You can delete your account and all associated data at any time from your settings. Upon account deletion, all data is permanently removed within 30 days.</p>

                <h2>6. Cookies</h2>
                <p>We use essential cookies for authentication and session management. We do not use tracking cookies or third-party advertising cookies.</p>

                <h2>7. Your Rights</h2>
                <p>You have the right to access, correct, or delete your personal data. You may also request a copy of all data we hold about you. To exercise these rights, contact privacy@Clarix.ai.</p>

                <h2>8. Contact</h2>
                <p>For privacy-related questions, reach out to <strong style={{ color: '#d4a843' }}>privacy@Clarix.ai</strong>.</p>
            </div>
        </div>
    );
}
