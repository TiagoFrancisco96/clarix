'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from '@/lib/auth-client';
import './home.css';

// Removed canvas ParticleField

/* ── Glowing Orb ── */
function GlowOrb({ className }: { className: string }) {
  return <div className={`glow-orb ${className}`} />;
}

/* ── Animated Counter ── */
function AnimCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const dur = 1800;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          setCount(Math.round(target * ease));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

/* ── Scroll Reveal ── */
function useScrollReveal() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('revealed');
        obs.disconnect();
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return ref;
}

/* ── AI Models — shown in marquee with friendly labels ── */
const AI_MODELS = [
  { name: '⚡ Speed', provider: 'by DeepSeek' },
  { name: '✍️ Writer', provider: 'by OpenAI' },
  { name: '💻 Pro', provider: 'by Anthropic' },
  { name: '📚 Research', provider: 'by Google' },
];

/* ── Tool Data ── */
const TOOLS = [
  { href: '/chat', label: 'AI Chat', icon: '💬', desc: 'Ask anything, get answers instantly', color: '#d4a843', glow: 'rgba(212,168,67,0.3)' },
  { href: '/image', label: 'Image Creator', icon: '🎨', desc: 'Turn ideas into stunning images', color: '#4ade80', glow: 'rgba(74,222,128,0.3)' },
  { href: '/video', label: 'Video Maker', icon: '🎬', desc: 'Create videos from text prompts', color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)' },
  { href: '/developer', label: 'Code Assistant', icon: '⚡', desc: 'Write, fix & debug code', color: '#a78bfa', glow: 'rgba(167,139,250,0.3)' },
  { href: '/music', label: 'Music Studio', icon: '🎵', desc: 'Compose songs & soundtracks', color: '#f472b6', glow: 'rgba(244,114,182,0.3)' },
  { href: '/docs', label: 'Smart Docs', icon: '📄', desc: 'Write documents with AI help', color: '#4a9eff', glow: 'rgba(74,158,255,0.3)' },
  { href: '/slides', label: 'Slide Builder', icon: '📊', desc: 'Presentations in seconds', color: '#f59e0b', glow: 'rgba(245,158,11,0.3)' },
  { href: '/sheets', label: 'Smart Sheets', icon: '📈', desc: 'Analyze data & make charts', color: '#10b981', glow: 'rgba(16,185,129,0.3)' },
  { href: '/designer', label: 'Design Studio', icon: '✨', desc: 'Create beautiful interfaces', color: '#c4956a', glow: 'rgba(196,149,106,0.3)' },
  { href: '/agents', label: 'AI Agents', icon: '🤖', desc: 'Automate repetitive tasks', color: '#6366f1', glow: 'rgba(99,102,241,0.3)' },
  { href: '/drive', label: 'Cloud Drive', icon: '☁️', desc: 'Store & organize your files', color: '#64748b', glow: 'rgba(100,116,139,0.3)' },
  { href: '/search', label: 'Deep Search', icon: '🔍', desc: 'Research any topic in depth', color: '#14b8a6', glow: 'rgba(20,184,166,0.3)' },
  { href: '/podcasts', label: 'Podcast Creator', icon: '🎙️', desc: 'Generate audio episodes', color: '#f97316', glow: 'rgba(249,115,22,0.3)' },
  { href: '/meeting-notes', label: 'Meeting Notes', icon: '🎤', desc: 'Transcribe & summarize meetings', color: '#06b6d4', glow: 'rgba(6,182,212,0.3)' },
  { href: '/inbox', label: 'Smart Inbox', icon: '📬', desc: 'AI-powered email management', color: '#ec4899', glow: 'rgba(236,72,153,0.3)' },
];

/* ── FAQ Data ── */
const FAQS = [
  {
    q: 'How does Clarix pick the best AI for my task?',
    a: 'Clarix automatically analyzes what you\'re asking and routes your request to the AI that\'s best at that kind of task — whether it\'s writing, coding, research, or creative work. You don\'t need to choose anything. It just works.',
  },
  {
    q: 'Is my data private and secure?',
    a: 'Yes. Your data is never shared with anyone or used to train AI models. Everything is encrypted and stored with strict access controls.',
  },
  {
    q: 'Do I need to know anything about AI to use this?',
    a: 'Not at all. Just type what you need — like "write me a blog post" or "make a presentation about dogs" — and Clarix handles the rest. We use 4 best-in-class AI systems from companies like OpenAI, Google, and Anthropic, and automatically pick the right one for your task.',
  },
  {
    q: 'How does the credit system work?',
    a: 'You get 200 free credits every month — enough to try everything. Each task uses a few credits. If you need more, you can upgrade to Pro or buy extra credit packs starting at $5. Credits never expire.',
  },
];

/* ── Main Homepage ── */
export default function HomePage() {
  const [promptValue, setPromptValue] = useState('');
  const [activeMode, setActiveMode] = useState<'research' | 'create'>('research');
  const [placeholder, setPlaceholder] = useState('');
  const [phIdx, setPhIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const modelsRef = useScrollReveal();
  const toolsRef = useScrollReveal();
  const featuresRef = useScrollReveal();
  const ctaRef = useScrollReveal();
  const pricingRef = useScrollReveal();
  const faqRef = useScrollReveal();

  const placeholders = [
    'Write a blog post about healthy eating...',
    'Create a birthday invitation image...',
    'Help me plan a marketing strategy...',
    'Make a presentation about our Q3 results...',
    'Summarize this article for me...',
    'Compose background music for my video...',
  ];

  /* Typing animation */
  useEffect(() => {
    if (promptValue) return;
    const current = placeholders[phIdx];
    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      if (placeholder.length < current.length) {
        timeout = setTimeout(() => setPlaceholder(current.slice(0, placeholder.length + 1)), 40 + Math.random() * 30);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 2000);
      }
    } else {
      if (placeholder.length > 0) {
        timeout = setTimeout(() => setPlaceholder(placeholder.slice(0, -1)), 20);
      } else {
        setIsDeleting(false);
        setPhIdx((prev) => (prev + 1) % placeholders.length);
      }
    }

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholder, isDeleting, phIdx, promptValue]);

  /* Navbar scroll */
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubmit = () => {
    if (!promptValue.trim()) return;
    if (session) {
      router.push('/chat');
    } else {
      setShowLoginModal(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="home">
      {/* Animated Background */}
      <div className="home-bg">
        <div className="home-bg__mesh" />
        <div className="home-bg__aurora" />
        <GlowOrb className="orb-1" />
        <GlowOrb className="orb-2" />
      </div>

      {/* ── Sticky Navbar ── */}
      <nav className={`home-nav ${navScrolled ? 'home-nav--scrolled' : ''}`}>
        <div className="home-nav__inner">
          <Link href="/" className="home-nav__logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            <span>Clarix</span>
          </Link>

          <div className="home-nav__links">
            <button onClick={() => scrollToSection('features')}>Features</button>
            <button onClick={() => scrollToSection('models')}>Models</button>
            <button onClick={() => scrollToSection('pricing')}>Pricing</button>
            <button onClick={() => scrollToSection('faq')}>FAQ</button>
          </div>

          <div className="home-nav__actions">
            {session ? (
              <Link href="/chat" className="home-nav__cta">Go to Dashboard</Link>
            ) : (
              <>
                <button className="home-nav__login" onClick={() => setShowLoginModal(true)}>Log in</button>
                <button className="home-nav__cta" onClick={() => setShowLoginModal(true)}>Get Started</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="home-content">
        {/* ── Hero ── */}
        <section className="hero">
          <div className="hero__badge animate-float">
            <span className="hero__badge-dot" />
            <span>Free to start &middot; No credit card required</span>
          </div>

          <h1 className="hero__title">
            <span className="hero__title-line">One workspace.</span>
            <span className="hero__title-line hero__title-gradient">Every AI tool you need.</span>
          </h1>

          <p className="hero__desc">
            Write, create images, make videos, compose music, build presentations &mdash;<br />
            all powered by the world&apos;s best AI, working together for you.
          </p>

          {/* ── Interactive Prompt Bar ── */}
          <div className="prompt-container">
            <div className="prompt-bar">
              <div className="prompt-bar__glow" />
              <div className="prompt-bar__inner">
                <div className="prompt-bar__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div className="prompt-bar__text">
                  <input
                    ref={inputRef}
                    type="text"
                    className="prompt-bar__input"
                    value={promptValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPromptValue(val);

                      // ── Auto-detect mode from prompt intent ──
                      const lower = val.toLowerCase().trim();
                      if (lower.length > 3) {
                        const createPatterns = [
                          /^(create|make|generate|build|design|draw|compose|produce|craft|render)\b/,
                          /\b(image|picture|photo|illustration|artwork|logo|icon|banner|poster)\b/,
                          /\b(video|animation|clip|movie|trailer|reel)\b/,
                          /\b(song|music|beat|soundtrack|melody|audio|jingle)\b/,
                          /\b(slide|presentation|deck|ppt)\b/,
                          /\b(website|landing page|ui|mockup|wireframe|app|interface)\b/,
                          /\b(write me a|draft a|compose a|generate a)\b/,
                          /\b(ultra realistic|cinematic|4k|hd|photorealistic|anime|pixel art|watercolor|oil painting)\b/,
                        ];
                        const researchPatterns = [
                          /^(what|who|when|where|why|how|is|are|can|does|do|should|which|tell me)\b/,
                          /\b(explain|summarize|compare|analyze|research|find|search|look up|define)\b/,
                          /\b(difference between|pros and cons|advantages|disadvantages)\b/,
                          /\b(meaning of|definition of|history of|origin of)\b/,
                          /\b(help me understand|what does|how does|how do)\b/,
                        ];

                        const isCreate = createPatterns.some(p => p.test(lower));
                        const isResearch = researchPatterns.some(p => p.test(lower));

                        if (isCreate && !isResearch) {
                          setActiveMode('create');
                        } else if (isResearch && !isCreate) {
                          setActiveMode('research');
                        }
                        // If both match or neither matches, keep current mode
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={promptValue ? '' : undefined}
                  />
                  {!promptValue && (
                    <div className="prompt-bar__placeholder-anim">
                      <span>{placeholder}</span>
                      <span className="prompt-bar__cursor" />
                    </div>
                  )}
                </div>
                <div className="prompt-bar__actions">
                  <button
                    className={`prompt-bar__mode ${activeMode === 'research' ? 'prompt-bar__mode--active' : ''}`}
                    onClick={() => setActiveMode('research')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    Research
                  </button>
                  <button
                    className={`prompt-bar__mode ${activeMode === 'create' ? 'prompt-bar__mode--active' : ''}`}
                    onClick={() => setActiveMode('create')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    Create
                  </button>
                  <button className="prompt-bar__send" title="Go" onClick={handleSubmit}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <p className="prompt-hint">Press <kbd>Enter</kbd> to launch &middot; Try &quot;Create&quot; mode for generation tasks</p>
          </div>

          {/* Trust Indicators */}
          <div className="hero__trust">
            <div className="hero__trust-item">
              <span className="hero__trust-number"><AnimCounter target={4} /></span>
              <span>AI Brains</span>
            </div>
            <div className="hero__trust-divider" />
            <div className="hero__trust-item">
              <span className="hero__trust-number"><AnimCounter target={15} /></span>
              <span>Creative Tools</span>
            </div>
            <div className="hero__trust-divider" />
            <div className="hero__trust-item">
              <span className="hero__trust-number">Free</span>
              <span>To Start</span>
            </div>
          </div>
        </section>

        {/* ── Models Ticker ── */}
        <section className="models-section reveal" id="models" ref={modelsRef as React.RefObject<HTMLElement>}>
          <div className="models-section__header">
            <span className="section-label">Powered by the Best</span>
            <h2 className="section-title">4 world-class AIs, one simple workspace.</h2>
          </div>
          <div className="models-marquee">
            <div className="models-marquee__track">
              {[...AI_MODELS, ...AI_MODELS].map((m, i) => (
                <div key={i} className="model-chip">
                  <div className="model-chip__info">
                    <span className="model-chip__name">{m.name}</span>
                    <span className="model-chip__provider">{m.provider}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tool Grid ── */}
        <section className="tools-section reveal" id="features" ref={toolsRef as React.RefObject<HTMLElement>}>
          <div className="tools-section__header">
            <span className="section-label">Everything You Need</span>
            <h2 className="section-title">15 creative tools, one simple workspace.</h2>
          </div>
          <div className="tools-grid">
            {TOOLS.map((tool, i) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={`tool-card ${i < 4 ? 'tool-card--hero' : 'tool-card--compact'}`}
                style={{
                  '--tool-color': tool.color,
                  '--tool-glow': tool.glow,
                  transitionDelay: `${i * 60}ms`,
                } as React.CSSProperties}
              >
                <div className="tool-card__shine" />
                <div className="tool-card__icon">{tool.icon}</div>
                <div className="tool-card__info">
                  <span className="tool-card__name">{tool.label}</span>
                  <span className="tool-card__desc">{tool.desc}</span>
                </div>
                <div className="tool-card__arrow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Smart Routing Feature Highlight ── */}
        <section className="features-section reveal" ref={featuresRef as React.RefObject<HTMLElement>}>
          <div className="feature-card feature-card--wide">
            <div className="feature-card__glow" />
            <div className="feature-card__content">
              <span className="feature-card__label">Smart AI Routing</span>
              <h3 className="feature-card__title">The best AI for every task &mdash; chosen automatically</h3>
              <p className="feature-card__desc">
                You don&apos;t need to pick which AI to use. Clarix automatically figures out
                what you&apos;re asking for and sends your request to whichever AI is best
                at that kind of task &mdash; writing, coding, research, or quick answers.
              </p>
            </div>
            <div className="feature-card__visual">
              <div className="moa-visual">
                <div className="moa-visual__center">AI</div>
                <div className="moa-visual__orbit moa-visual__orbit--1"><span>✍️ Writer</span></div>
                <div className="moa-visual__orbit moa-visual__orbit--2"><span>💻 Pro</span></div>
                <div className="moa-visual__orbit moa-visual__orbit--3"><span>📚 Research</span></div>
                <div className="moa-visual__orbit moa-visual__orbit--4"><span>⚡ Speed</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="pricing-section reveal" id="pricing" ref={pricingRef as React.RefObject<HTMLElement>}>
          <div className="pricing-section__header">
            <span className="section-label">Simple Pricing</span>
            <h2 className="section-title">Start Free. Scale As You Grow.</h2>
          </div>
          <div className="pricing-grid pricing-grid--3">
            <div className="pricing-card">
              <span className="pricing-card__name">Free</span>
              <div className="pricing-card__price">$0<span>/month</span></div>
              <ul className="pricing-card__features">
                <li>&#x2713; 200 credits per month</li>
                <li>&#x2713; Access to all AI tools</li>
                <li>&#x2713; All 4 AI models</li>
                <li>&#x2713; 1 GB Drive storage</li>
                <li>&#x2713; Community support</li>
              </ul>
              <Link href="/chat" className="pricing-card__btn">Get Started</Link>
            </div>
            <div className="pricing-card pricing-card--featured">
              <div className="pricing-card__badge">Most Popular</div>
              <span className="pricing-card__name">Pro</span>
              <div className="pricing-card__price">$29<span>/month</span></div>
              <ul className="pricing-card__features">
                <li>&#x2713; 30,000 credits/month</li>
                <li>&#x2713; All premium AI models</li>
                <li>&#x2713; Smart AI routing</li>
                <li>&#x2713; Priority support</li>
                <li>&#x2713; Developer API access</li>
                <li>&#x2713; 100 GB Drive storage</li>
                <li>&#x2713; Custom agents</li>
              </ul>
              <Link href="/chat" className="pricing-card__btn pricing-card__btn--gold">Start Pro Trial</Link>
            </div>
            <div className="pricing-card">
              <span className="pricing-card__name">Enterprise</span>
              <div className="pricing-card__price">Custom</div>
              <ul className="pricing-card__features">
                <li>&#x2713; Unlimited credits</li>
                <li>&#x2713; Everything in Pro</li>
                <li>&#x2713; Single sign-on (SSO)</li>
                <li>&#x2713; Dedicated support</li>
                <li>&#x2713; 500 GB Drive storage</li>
                <li>&#x2713; SLA guarantee</li>
                <li>&#x2713; Team collaboration</li>
              </ul>
              <Link href="/info?tab=contact" className="pricing-card__btn">Contact Sales</Link>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="faq-section reveal" id="faq" ref={faqRef as React.RefObject<HTMLElement>}>
          <div className="faq-section__header">
            <span className="section-label">FAQ</span>
            <h2 className="section-title">Got questions?</h2>
          </div>
          <div className="faq-list">
            {FAQS.map((faq, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'faq-item--open' : ''}`}>
                <button className="faq-item__question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <svg className="faq-item__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className="faq-item__answer">
                  <div className="faq-item__answer-inner">
                    <p>{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cta-section reveal" ref={ctaRef as React.RefObject<HTMLElement>}>
          <div className="cta-section__glow" />
          <h2 className="cta-section__title">Ready to try it? It&apos;s free.</h2>
          <p className="cta-section__desc">Get 200 free credits to explore everything. No credit card needed.</p>
          <Link href="/chat" className="cta-section__btn">
            <span>Launch Workspace</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </section>

        {/* ── Footer ── */}
        <footer className="home-footer">
          <div className="home-footer__grid">
            <div className="home-footer__brand">
              <div className="home-footer__logo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                <span>Clarix AI</span>
              </div>
              <p className="home-footer__tagline">AI tools for creators, developers, and teams.</p>
            </div>

            <div className="home-footer__col">
              <h4>Product</h4>
              <Link href="/chat">AI Chat</Link>
              <Link href="/image">AI Image</Link>
              <Link href="/docs">AI Docs</Link>
              <Link href="/developer">AI Dev</Link>
              <Link href="/agents">Agents</Link>
            </div>

            <div className="home-footer__col">
              <h4>Resources</h4>
              <Link href="/api-docs">API Reference</Link>
              <Link href="/info?tab=changelog">Changelog</Link>
              <Link href="/status">Status</Link>
              <Link href="/info?tab=blog">Blog</Link>
            </div>

            <div className="home-footer__col">
              <h4>Company</h4>
              <Link href="/info?tab=about">About</Link>
              <Link href="/info?tab=careers">Careers</Link>
              <Link href="/info?tab=contact">Contact</Link>
            </div>
          </div>

          <div className="home-footer__bottom">
            <span>&copy; 2026 Clarix AI. All rights reserved.</span>
            <div className="home-footer__bottom-links">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/security">Security</Link>
            </div>
          </div>
        </footer>
      </div>

      {/* ── Login/Signup Modal ── */}
      {showLoginModal && (
        <div className="login-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="login-modal__close" onClick={() => setShowLoginModal(false)}>&times;</button>
            <div className="login-modal__glow" />
            <div className="login-modal__header">
              <div className="login-modal__logo">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              </div>
              <h2>Welcome to Clarix</h2>
              <p>Sign in to start creating with AI</p>
            </div>
            {promptValue && (
              <div className="login-modal__prompt-preview">
                <span className="login-modal__prompt-label">Your prompt</span>
                <p className="login-modal__prompt-text">&ldquo;{promptValue}&rdquo;</p>
                <span className="login-modal__prompt-mode">Mode: {activeMode === 'research' ? '🔍 Research' : '⚡ Create'}</span>
              </div>
            )}
            {loginError && (
              <div className="login-modal__error">{loginError}</div>
            )}
            <div className="login-modal__buttons">
              <button
                className="login-modal__btn login-modal__btn--google"
                disabled={loginLoading}
                onClick={async () => {
                  setLoginLoading(true);
                  setLoginError('');
                  try {
                    await signIn.social({ provider: 'google', callbackURL: '/chat' });
                  } catch (err) {
                    setLoginError(
                      err instanceof Error && err.message.includes('fetch')
                        ? 'Unable to connect to auth server. Please try again.'
                        : 'Sign-in failed. Please try again.'
                    );
                  } finally {
                    setLoginLoading(false);
                  }
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                Continue with Google
              </button>
              <div className="login-modal__divider"><span>or</span></div>
              <input
                type="email"
                className="login-modal__input"
                placeholder="Enter your email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <button
                className="login-modal__btn login-modal__btn--primary"
                disabled={loginLoading || !loginEmail.trim()}
                onClick={async () => {
                  setLoginLoading(true);
                  setLoginError('');
                  try {
                    await signIn.email({ email: loginEmail, password: '' }, {
                      onError: () => {
                        router.push(`/login?email=${encodeURIComponent(loginEmail)}`);
                      },
                      onSuccess: () => {
                        router.push('/chat');
                      },
                    });
                  } catch {
                    router.push(`/login?email=${encodeURIComponent(loginEmail)}`);
                  }
                  setLoginLoading(false);
                }}
              >
                Continue with Email
              </button>
            </div>
            <p className="login-modal__terms">By continuing, you agree to our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link></p>
          </div>
        </div>
      )}
    </div>
  );
}
