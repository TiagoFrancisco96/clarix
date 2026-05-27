import Link from 'next/link';
import '../info-page.css';

export const metadata = {
    title: 'Blog — Clarix AI',
    description: 'The latest news, updates, and insights from the Clarix AI team.',
};

const POSTS = [
    {
        tag: 'Product',
        title: 'Introducing Mixture of Agents 2.0',
        desc: 'Our next-generation routing system now blends outputs from up to 4 models simultaneously, producing answers that outperform any single model by 23%.',
        date: 'Feb 8, 2026',
    },
    {
        tag: 'Engineering',
        title: 'How We Achieved Sub-200ms Latency',
        desc: 'A deep dive into edge caching, speculative decoding, and the infrastructure decisions that make Clarix AI feel instant.',
        date: 'Feb 3, 2026',
    },
    {
        tag: 'AI Models',
        title: 'GPT-5.5 & Claude Opus 4.7: What They Mean for You',
        desc: 'We added both models on launch day. Here\'s what they\'re best at and how MoA uses them together.',
        date: 'Jan 28, 2026',
    },
    {
        tag: 'Security',
        title: 'SOC 2 Compliance: Our Journey',
        desc: 'How we built a zero-trust architecture from day one that makes enterprise security teams happy.',
        date: 'Jan 19, 2026',
    },
    {
        tag: 'Product',
        title: 'AI Podcasts: From Text to Audio in 60 Seconds',
        desc: 'Generate professional-quality podcast episodes from any content. Here\'s how we built it.',
        date: 'Jan 12, 2026',
    },
    {
        tag: 'Community',
        title: '1 Million Prompts Processed',
        desc: 'We hit a major milestone. Here\'s what we learned from analyzing aggregate usage patterns.',
        date: 'Jan 5, 2026',
    },
];

export default function BlogPage() {
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
                <span className="info-page__badge">Blog</span>
                <h1 className="info-page__title">Latest from Clarix</h1>
                <p className="info-page__subtitle">Product updates, engineering deep dives, and insights from the team.</p>

                <div className="info-card-grid">
                    {POSTS.map((post, i) => (
                        <div key={i} className="info-card">
                            <span className="info-card__tag">{post.tag}</span>
                            <h3 className="info-card__title">{post.title}</h3>
                            <p className="info-card__desc">{post.desc}</p>
                            <span className="info-card__meta">{post.date}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
