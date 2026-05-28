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
    a: 'Clarix automatically analyzes what you\'re asking and routes your request to the AI that\'s best at that kind of task — whether it\'s writing, coding, research, or creative work. You never have to think about which model to use. It just works.',
  },
  {
    q: 'Is my data private and secure?',
    a: 'Absolutely. Your data is never shared with third parties or used to train AI models. Everything is encrypted in transit and at rest with strict access controls. We\'re built for trust.',
  },
  {
    q: 'Do I need to know anything about AI to use this?',
    a: 'Not at all. Just type what you need in plain English — like "write me a blog post" or "make a presentation about dogs" — and Clarix handles everything. No prompting skills required.',
  },
  {
    q: 'How does the credit system work?',
    a: 'You get 200 free credits every month — enough for about 100 chat messages, 20 images, or 5 videos. Each task uses a few credits based on complexity. Need more? Upgrade to Pro for 30,000 credits/mo. Credits never expire.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, instantly. There are no contracts, no cancellation fees, and no hidden charges. You stay on the free plan if you downgrade. We keep things simple because we believe the product should earn your trust, not a contract.',
  },
  {
    q: 'Why not just use ChatGPT or Claude directly?',
    a: 'You could — but you\'d need separate subscriptions for chat, images, video, music, and code ($60+/month combined). Clarix gives you all of that in one workspace with one credit system, and it automatically picks the best AI for each task. Less hassle, better results, lower cost.',
  },
];

/* ── Prompt Suggestions ── */
const PROMPT_SUGGESTIONS = [
  { label: '✨ Design a logo for my startup', mode: 'create' as const },
  { label: '📝 Write a blog post about AI trends', mode: 'research' as const },
  { label: '🎵 Compose a lo-fi study beat', mode: 'create' as const },
  { label: '📊 Create a pitch deck for investors', mode: 'create' as const },
  { label: '🔍 Compare React vs Vue for my project', mode: 'research' as const },
  { label: '🎬 Make a product demo video', mode: 'create' as const },
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
  const howRef = useScrollReveal();
  const socialRef = useScrollReveal();
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
                <button className="home-nav__cta" onClick={() => setShowLoginModal(true)}>Start My Free Trial</button>
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
            <span>Join 2,000+ creators &middot; Free forever plan</span>
          </div>

          <h1 className="hero__title">
            <span className="hero__title-line">Stop juggling apps.</span>
            <span className="hero__title-line hero__title-gradient">Start creating.</span>
          </h1>

          <p className="hero__desc">
            You&apos;re paying for ChatGPT, Midjourney, Suno, and more &mdash; separately.
            Clarix replaces them all with 15 AI tools in one workspace, for a fraction of the cost.
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
            <p className="prompt-hint">Press <kbd>Enter</kbd> to launch &middot; Mode auto-detects from your prompt</p>
            <div className="prompt-suggestions">
              {PROMPT_SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="prompt-suggestions__chip"
                  onClick={() => {
                    setPromptValue(s.label.replace(/^[^\s]+\s/, ''));
                    setActiveMode(s.mode);
                    inputRef.current?.focus();
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Powered By */}
          <div className="hero__powered-by">
            <span className="hero__powered-by-label">Powered by</span>
            <div className="hero__powered-by-logos">
              <span className="hero__provider-badge">OpenAI</span>
              <span className="hero__provider-badge">Anthropic</span>
              <span className="hero__provider-badge">Google</span>
              <span className="hero__provider-badge">DeepSeek</span>
            </div>
          </div>
        </section>

        {/* ── Models Ticker ── */}
        <section className="models-section reveal" id="models" ref={modelsRef as React.RefObject<HTMLElement>}>
          <div className="models-section__header">
            <span className="section-label">Why We&apos;re Different</span>
            <h2 className="section-title">4 world-class AIs, working together &mdash; not against each other.</h2>
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

        {/* ── How It Works ── */}
        <section className="how-section reveal" ref={howRef as React.RefObject<HTMLElement>}>
          <div className="how-section__header">
            <span className="section-label">Effortless by Design</span>
            <h2 className="section-title">From idea to result in 3 steps</h2>
          </div>
          <div className="how-steps">
            <div className="how-step">
              <div className="how-step__number">1</div>
              <h3 className="how-step__title">Describe what you need</h3>
              <p className="how-step__desc">Type in plain English &mdash; &ldquo;design a logo,&rdquo; &ldquo;write a pitch deck,&rdquo; &ldquo;compose a beat.&rdquo; No AI expertise required.</p>
            </div>
            <div className="how-step__connector">
              <svg width="40" height="2" viewBox="0 0 40 2"><line x1="0" y1="1" x2="40" y2="1" stroke="var(--accent-gold)" strokeWidth="2" strokeDasharray="4 4" opacity="0.4" /></svg>
            </div>
            <div className="how-step">
              <div className="how-step__number">2</div>
              <h3 className="how-step__title">We pick the best AI</h3>
              <p className="how-step__desc">Clarix routes to OpenAI, Anthropic, Google, or DeepSeek automatically. You get the best result without choosing a model.</p>
            </div>
            <div className="how-step__connector">
              <svg width="40" height="2" viewBox="0 0 40 2"><line x1="0" y1="1" x2="40" y2="1" stroke="var(--accent-gold)" strokeWidth="2" strokeDasharray="4 4" opacity="0.4" /></svg>
            </div>
            <div className="how-step">
              <div className="how-step__number">3</div>
              <h3 className="how-step__title">Get polished results</h3>
              <p className="how-step__desc">Text, images, videos, music, slides &mdash; ready to use. No switching tabs, no extra logins, no wasted time.</p>
            </div>
          </div>
        </section>

        {/* ── Social Proof ── */}
        <section className="social-proof reveal" ref={socialRef as React.RefObject<HTMLElement>}>
          <div className="social-proof__header">
            <span className="section-label">Don&apos;t Take Our Word for It</span>
            <h2 className="section-title">Creators and teams love Clarix</h2>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <p className="testimonial-card__quote">&ldquo;I was paying $20 for ChatGPT, $30 for Midjourney, and $10 for Suno. Clarix replaced all three for less. I save $31/month AND get better results because it auto-picks the right AI.&rdquo;</p>
              <div className="testimonial-card__author">
                <div className="testimonial-card__avatar">MR</div>
                <div>
                  <span className="testimonial-card__name">Marco R.</span>
                  <span className="testimonial-card__role">Content Creator</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <p className="testimonial-card__quote">&ldquo;The smart routing is genuinely magic. I just type what I need and it picks the right AI. Our team&apos;s content output went up 40% in the first month &mdash; without hiring anyone.&rdquo;</p>
              <div className="testimonial-card__author">
                <div className="testimonial-card__avatar">SK</div>
                <div>
                  <span className="testimonial-card__name">Sarah K.</span>
                  <span className="testimonial-card__role">Startup Founder</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <p className="testimonial-card__quote">&ldquo;I was skeptical &mdash; another AI wrapper? But this actually works. Chat, images, video, code, all in one place. The free tier alone convinced me to upgrade to Pro within a week.&rdquo;</p>
              <div className="testimonial-card__author">
                <div className="testimonial-card__avatar">JT</div>
                <div>
                  <span className="testimonial-card__name">James T.</span>
                  <span className="testimonial-card__role">Full-Stack Developer</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tool Grid ── */}
        <section className="tools-section reveal" id="features" ref={toolsRef as React.RefObject<HTMLElement>}>
          <div className="tools-section__header">
            <span className="section-label">Everything You Need</span>
            <h2 className="section-title">Stop switching tabs. Everything lives here.</h2>
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
              <h3 className="feature-card__title">The best AI for every task &mdash; chosen for you, automatically</h3>
              <p className="feature-card__desc">
                Stop guessing which AI to use. Clarix analyzes your request and sends it
                to whichever model is best at that kind of work &mdash; writing, coding,
                research, or quick answers. You just type. We handle the rest.
              </p>
              <Link href="/chat" className="feature-card__cta">
                See it in action
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </Link>
            </div>
            <div className="feature-card__visual">
              <div className="routing-visual">
                <div className="routing-visual__models">
                  <div className="routing-visual__pill">✍️ Writer</div>
                  <div className="routing-visual__pill">💻 Pro</div>
                  <div className="routing-visual__pill">📚 Research</div>
                  <div className="routing-visual__pill">⚡ Speed</div>
                </div>
                <div className="routing-visual__flow">
                  <div className="routing-visual__line" />
                  <div className="routing-visual__hub">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                  </div>
                  <div className="routing-visual__line" />
                </div>
                <div className="routing-visual__output">
                  <div className="routing-visual__pill routing-visual__pill--result">Best answer</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="pricing-section reveal" id="pricing" ref={pricingRef as React.RefObject<HTMLElement>}>
          <div className="pricing-section__header">
            <span className="section-label">Simple, Honest Pricing</span>
            <h2 className="section-title">Why pay $60+/mo for separate AI tools?</h2>
            <p className="pricing-section__subtitle">200 free credits = ~100 chat messages, ~20 images, ~5 videos, or ~3 songs. No credit card required.</p>
          </div>
          <div className="pricing-grid pricing-grid--3">
            <div className="pricing-card">
              <span className="pricing-card__name">Free</span>
              <div className="pricing-card__price">$0<span>/month</span></div>
              <ul className="pricing-card__features">
                <li>&#x2713; 200 credits per month</li>
                <li>&#x2713; Access to all 15 AI tools</li>
                <li>&#x2713; All 4 AI models</li>
                <li>&#x2713; Basic AI routing</li>
                <li>&#x2713; 1 GB Drive storage</li>
                <li>&#x2713; Community support</li>
                <li>&#x2713; No credit card needed</li>
              </ul>
              <Link href="/chat" className="pricing-card__btn">Get Started Free</Link>
            </div>
            <div className="pricing-card pricing-card--featured">
              <div className="pricing-card__badge">Most Popular</div>
              <span className="pricing-card__name">Pro</span>
              <div className="pricing-card__price">$29<span>/month</span></div>
              <ul className="pricing-card__features">
                <li>&#x2713; 30,000 credits/month</li>
                <li>&#x2713; Advanced smart routing</li>
                <li>&#x2713; Priority model access</li>
                <li>&#x2713; Developer API access</li>
                <li>&#x2713; Custom AI agents</li>
                <li>&#x2713; 100 GB Drive storage</li>
                <li>&#x2713; Priority support</li>
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
                <li>&#x2713; Dedicated account manager</li>
                <li>&#x2713; 500 GB+ Drive storage</li>
                <li>&#x2713; SLA guarantee (99.9%)</li>
                <li>&#x2713; Team collaboration tools</li>
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
          <h2 className="cta-section__title">Your next idea is waiting.</h2>
          <p className="cta-section__desc">Join 2,000+ creators already using Clarix. Start with 200 free credits &mdash; no credit card, no commitment.</p>
          <Link href="/chat" className="cta-section__btn">
            <span>Start My Free Workspace</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <div className="cta-section__trust">
            <span className="cta-section__trust-item">🔒 Your data stays private &mdash; never used for training</span>
            <span className="cta-section__trust-item">⚡ No credit card required</span>
            <span className="cta-section__trust-item">✨ Cancel anytime, keep your files</span>
          </div>
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
