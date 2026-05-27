import Link from 'next/link';
import '../info-page.css';

export const metadata = {
    title: 'Careers — Clarix AI',
    description: 'Join the Clarix AI team. We\'re building the future of AI workspaces and looking for exceptional people.',
};

const OPENINGS = [
    { tag: 'Engineering', title: 'Senior Full-Stack Engineer', desc: 'Build and scale our AI workspace platform. TypeScript, Next.js, and distributed systems experience required.', location: 'Remote (US/EU)' },
    { tag: 'Engineering', title: 'ML Infrastructure Engineer', desc: 'Design and optimize our Mixture of Agents routing pipeline. Experience with LLM inference and model orchestration.', location: 'Remote (Global)' },
    { tag: 'Design', title: 'Senior Product Designer', desc: 'Shape the future of AI interaction. Design intuitive workflows for complex multi-model experiences.', location: 'Remote (US/EU)' },
    { tag: 'Product', title: 'Product Manager — AI Tools', desc: 'Own the roadmap for our AI tools suite. Deep understanding of creator workflows and AI capabilities.', location: 'Remote (US)' },
    { tag: 'Engineering', title: 'Security Engineer', desc: 'Maintain our SOC 2 compliance and build zero-trust infrastructure. Experience with cloud security required.', location: 'Remote (Global)' },
    { tag: 'Marketing', title: 'Developer Advocate', desc: 'Build community, create content, and help developers integrate with the Clarix API.', location: 'Remote (Global)' },
];

export default function CareersPage() {
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
                <span className="info-page__badge">We&apos;re Hiring</span>
                <h1 className="info-page__title">Build the Future of AI With Us</h1>
                <p className="info-page__subtitle">We&apos;re a small, fast-moving team building the most ambitious AI workspace in the world. Fully remote, competitive equity, and the best tools money can buy.</p>

                <h2>Open Positions</h2>
                <div className="info-card-grid">
                    {OPENINGS.map((job, i) => (
                        <div key={i} className="info-card">
                            <span className="info-card__tag">{job.tag}</span>
                            <h3 className="info-card__title">{job.title}</h3>
                            <p className="info-card__desc">{job.desc}</p>
                            <span className="info-card__meta">{job.location}</span>
                        </div>
                    ))}
                </div>

                <h2>Perks &amp; Benefits</h2>
                <ul>
                    <li>Fully remote — work from anywhere in the world</li>
                    <li>Competitive salary + generous equity</li>
                    <li>Unlimited PTO with 4-week minimum</li>
                    <li>Latest hardware and any tools you need</li>
                    <li>Annual team retreats</li>
                    <li>Health, dental, and vision insurance</li>
                </ul>

                <p>Don&apos;t see your role? Email us at <strong style={{ color: '#d4a843' }}>careers@Clarix.ai</strong> &mdash; we&apos;re always open to exceptional people.</p>
            </div>
        </div>
    );
}
