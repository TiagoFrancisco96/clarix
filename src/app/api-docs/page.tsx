import Link from 'next/link';
import '../info-page.css';

export const metadata = {
    title: 'API Reference — Clarix AI',
    description: 'Integrate Clarix AI into your applications with our REST API.',
};

export default function ApiDocsPage() {
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
                <span className="info-page__badge">Developer</span>
                <h1 className="info-page__title">API Reference</h1>
                <p className="info-page__subtitle">Integrate Clarix AI into your applications with our RESTful API. Available on Pro and Enterprise plans.</p>

                <h2>Authentication</h2>
                <p>All API requests require a Bearer token. Generate your API key from the <Link href="/settings" style={{ color: '#d4a843' }}>Settings</Link> page.</p>

                <h2>Base URL</h2>
                <p><code style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', fontSize: '0.85rem' }}>https://api.Clarix.ai/v1</code></p>

                <h2>Endpoints</h2>

                <h3>POST /chat/completions</h3>
                <p>Send a prompt and receive an AI-generated response. Supports all models and MoA routing.</p>

                <h3>POST /images/generations</h3>
                <p>Generate images from text descriptions. Supports multiple styles and resolutions.</p>

                <h3>POST /audio/speech</h3>
                <p>Convert text to natural-sounding speech for podcasts and audio content.</p>

                <h3>POST /code/completions</h3>
                <p>Get code completions, explanations, and debugging assistance.</p>

                <h3>GET /models</h3>
                <p>List all available AI models with their capabilities and current status.</p>

                <h2>Rate Limits</h2>
                <ul>
                    <li><strong>Pro:</strong> 1,000 requests/minute</li>
                    <li><strong>Enterprise:</strong> Custom limits</li>
                </ul>

                <h2>SDKs</h2>
                <p>Official SDKs are available for JavaScript/TypeScript, Python, Go, and Ruby. Install via your package manager:</p>
                <p><code style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', fontSize: '0.85rem' }}>npm install @Clarix/sdk</code></p>

                <h2>Support</h2>
                <p>For API support, contact <strong style={{ color: '#d4a843' }}>api-support@Clarix.ai</strong> or visit our <Link href="/status" style={{ color: '#d4a843' }}>status page</Link>.</p>
            </div>
        </div>
    );
}
