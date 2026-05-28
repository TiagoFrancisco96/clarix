import Link from 'next/link';
import '../info-page.css';

export const metadata = {
    title: 'Terms of Service — Clarix AI',
    description: 'Terms and conditions for using Clarix AI services.',
};

export default function TermsPage() {
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
                <h1 className="info-page__title">Terms of Service</h1>
                <p className="info-page__subtitle">Last updated: February 1, 2026</p>

                <h2>1. Acceptance of Terms</h2>
                <p>By accessing or using Clarix AI (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

                <h2>2. Description of Service</h2>
                <p>Clarix AI provides an AI-powered workspace that includes chat, image generation, document creation, code assistance, music composition, video editing, and other AI tools. The Service uses multiple AI providers (like OpenAI, Google, and Anthropic) and automatically picks the best one for your task.</p>

                <h2>3. User Accounts</h2>
                <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use the Service.</p>

                <h2>4. Acceptable Use</h2>
                <p>You agree not to use the Service to:</p>
                <ul>
                    <li>Generate content that is illegal, harmful, or violates third-party rights</li>
                    <li>Attempt to reverse-engineer, decompile, or extract source code from the Service</li>
                    <li>Circumvent usage limits or access controls</li>
                    <li>Use automated systems to access the Service without authorization</li>
                </ul>

                <h2>5. Content Ownership</h2>
                <p>You retain ownership of all content you create using the Service. Clarix AI does not claim any intellectual property rights over your generated content. You grant us a limited license to process your content solely for the purpose of providing the Service.</p>

                <h2>6. Credits and Billing</h2>
                <p>Free accounts receive 50 credits per month. Pro subscriptions are billed monthly or annually. Credits do not expire and roll over between billing periods. Refunds are available within 14 days of purchase.</p>

                <h2>7. Limitation of Liability</h2>
                <p>The Service is provided &ldquo;as is&rdquo; without warranties of any kind. Clarix AI shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>

                <h2>8. Termination</h2>
                <p>We may suspend or terminate your account if you violate these Terms. You may delete your account at any time from your settings.</p>

                <h2>9. Changes to Terms</h2>
                <p>We may update these Terms from time to time. We will notify you of material changes via email or in-app notification.</p>

                <h2>10. Contact</h2>
                <p>For questions about these Terms, contact <strong style={{ color: '#d4a843' }}>legal@Clarix.ai</strong>.</p>
            </div>
        </div>
    );
}
