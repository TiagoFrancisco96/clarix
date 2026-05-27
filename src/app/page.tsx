'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from '@/lib/auth-client';
import './home.css';

/* ── Floating Particle Canvas ── */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; hue: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 12000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.5 + 0.1,
          hue: Math.random() * 60 + 25,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.opacity})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[j].x - p.x;
          const dy = particles[j].y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(40, 70%, 60%, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animId = requestAnimationFrame(draw);
    };

    resize();
    initParticles();
    draw();

    const handleResize = () => { resize(); initParticles(); };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize); };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}

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

/* ── 2026 Model Lineup ── */
const AI_MODELS = [
  { name: 'GPT-5.5', provider: 'OpenAI', score: 51 },
  { name: 'Claude Opus 4.7', provider: 'Anthropic', score: 50 },
  { name: 'Grok 4.3', provider: 'xAI', score: 49 },
  { name: 'Gemini 2.5 Pro', provider: 'Google', score: 48 },
  { name: 'DeepSeek V4', provider: 'DeepSeek', score: 42 },
  { name: 'Llama 4 Maverick', provider: 'Meta', score: 40 },
];

/* ── Tool Data ── */
const TOOLS = [
  { href: '/chat', label: 'AI Chat', icon: '\ud83d\udcac', desc: 'Multi-model conversations', color: '#d4a843', glow: 'rgba(212,168,67,0.3)' },
  { href: '/image', label: 'AI Image', icon: '\ud83c\udfa8', desc: 'Generate stunning visuals', color: '#4ade80', glow: 'rgba(74,222,128,0.3)' },
  { href: '/docs', label: 'AI Docs', icon: '\ud83d\udcc4', desc: 'AI-powered documents', color: '#4a9eff', glow: 'rgba(74,158,255,0.3)' },
  { href: '/slides', label: 'AI Slides', icon: '\ud83d\udcca', desc: 'Presentations in seconds', color: '#f59e0b', glow: 'rgba(245,158,11,0.3)' },
  { href: '/sheets', label: 'AI Sheets', icon: '\ud83d\udcc8', desc: 'Data analysis & charts', color: '#10b981', glow: 'rgba(16,185,129,0.3)' },
  { href: '/developer', label: 'AI Dev', icon: '\u26a1', desc: 'Code with intelligence', color: '#a78bfa', glow: 'rgba(167,139,250,0.3)' },
  { href: '/designer', label: 'AI Design', icon: '\u2728', desc: 'UI/UX generation', color: '#c4956a', glow: 'rgba(196,149,106,0.3)' },
  { href: '/music', label: 'AI Music', icon: '\ud83c\udfb5', desc: 'Compose & produce', color: '#f472b6', glow: 'rgba(244,114,182,0.3)' },
  { href: '/video', label: 'AI Video', icon: '\ud83c\udfac', desc: 'Create & edit videos', color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)' },
  { href: '/meeting-notes', label: 'AI Notes', icon: '\ud83c\udfa4', desc: 'Meeting transcription', color: '#06b6d4', glow: 'rgba(6,182,212,0.3)' },
  { href: '/agents', label: 'Agents', icon: '\ud83e\udd16', desc: 'Autonomous AI agents', color: '#6366f1', glow: 'rgba(99,102,241,0.3)' },
  { href: '/drive', label: 'AI Drive', icon: '\u2601\ufe0f', desc: 'Intelligent file storage', color: '#64748b', glow: 'rgba(100,116,139,0.3)' },
  { href: '/search', label: 'AI Search', icon: '\ud83d\udd0d', desc: 'Deep research & analysis', color: '#14b8a6', glow: 'rgba(20,184,166,0.3)' },
  { href: '/podcasts', label: 'AI Podcasts', icon: '\ud83c\udf99\ufe0f', desc: 'Generate audio episodes', color: '#f97316', glow: 'rgba(249,115,22,0.3)' },
  { href: '/inbox', label: 'AI Inbox', icon: '\ud83d\udcec', desc: 'Smart email management', color: '#ec4899', glow: 'rgba(236,72,153,0.3)' },
];

/* ── Testimonials ── */
const TESTIMONIALS = [
  {
    quote: 'Clarix replaced 6 different tools for our team. The MoA routing is genuinely magic -- it just picks the right model every time.',
    name: 'Sarah Linden',
    role: 'Head of Product',
    company: 'NovaTech',
    avatar: 'SL',
    color: '#e74c3c',
  },
  {
    quote: 'We cut our content production time by 70%. Going from research to slides to a podcast in one place is incredible.',
    name: 'Marcus Wei',
    role: 'VP Engineering',
    company: 'Arclight',
    avatar: 'MW',
    color: '#3498db',
  },
  {
    quote: 'Finally an AI platform that takes security seriously. SOC 2 compliance and zero data training made our legal team happy.',
    name: 'Elena Rossi',
    role: 'CISO',
    company: 'Meridian Labs',
    avatar: 'ER',
    color: '#2ecc71',
  },
];

/* ── FAQ Data ── */
const FAQS = [
  {
    q: 'What is Mixture of Agents (MoA)?',
    a: 'MoA is our proprietary routing system that analyzes your prompt and automatically selects the best AI model for the task. It can also blend responses from multiple models to produce a superior answer -- better than any single model alone.',
  },
  {
    q: 'Is my data used to train AI models?',
    a: 'Absolutely not. Your data is encrypted end-to-end and never used for model training. We are SOC 2 compliant and all data is stored in enterprise-grade infrastructure with strict access controls.',
  },
  {
    q: 'How does the credit system work?',
    a: 'You start with 200 free credits every month. Each AI operation costs credits depending on the model and task complexity — chat costs 1-25 credits, images 25-50, and premium tools like video generation cost more. Unused credits roll over.',
  },
  {
    q: 'What happens when I run out of credits?',
    a: 'You can purchase additional credit packs anytime from your account settings — starting at just $5 for 2,500 credits. Or upgrade your plan for a larger monthly allowance. Credits never expire.',
  },
  {
    q: 'What AI models are available?',
    a: 'We support GPT-5.5, Claude Opus 4.7, Gemini 2.5 Pro, Grok 4.3, DeepSeek V4, Llama 4 Maverick, and more. New models are added within days of release.',
  },
];

/* ── Comparison Data ── */
const COMPARISONS = [
  { feature: 'Multi-model access', Clarix: true, others: false },
  { feature: 'Mixture of Agents routing', Clarix: true, others: false },
  { feature: 'All-in-one workspace', Clarix: true, others: false },
  { feature: 'AI Image generation', Clarix: true, others: true },
  { feature: 'AI Code assistant', Clarix: true, others: true },
  { feature: 'AI Docs & Slides', Clarix: true, others: false },
  { feature: 'AI Music & Video', Clarix: true, others: false },
  { feature: 'Zero data training', Clarix: true, others: false },
  { feature: 'Affordable credit pricing', Clarix: true, others: false },
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
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const modelsRef = useScrollReveal();
  const toolsRef = useScrollReveal();
  const featuresRef = useScrollReveal();
  const testimonialsRef = useScrollReveal();
  const ctaRef = useScrollReveal();
  const statsRef = useScrollReveal();
  const howRef = useScrollReveal();
  const compareRef = useScrollReveal();
  const pricingRef = useScrollReveal();
  const faqRef = useScrollReveal();

  const placeholders = [
    'Generate a landing page for my startup...',
    'Create a photorealistic sunset over Mars...',
    'Write and debug a Python API server...',
    'Compose ambient music for a sci-fi game...',
    'Analyze this dataset and create charts...',
    'Design a mobile app interface...',
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
    setShowLoginModal(true);
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
        <div className="home-bg__grid" />
        <ParticleField />
        <GlowOrb className="orb-1" />
        <GlowOrb className="orb-2" />
        <GlowOrb className="orb-3" />
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
            <span>Powered by Multi-Agent AI</span>
          </div>

          <h1 className="hero__title">
            <span className="hero__title-line">The Future of</span>
            <span className="hero__title-line hero__title-gradient">AI Workspace</span>
            <span className="hero__title-line hero__title-subtle">is Here.</span>
          </h1>

          <p className="hero__desc">
            One platform. Every AI model. Infinite possibilities.<br />
            Create, code, design, and build &mdash; with the world&apos;s most powerful AI tools.
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
                    onChange={(e) => setPromptValue(e.target.value)}
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
              <span className="hero__trust-number"><AnimCounter target={7} suffix="+" /></span>
              <span>AI Models</span>
            </div>
            <div className="hero__trust-divider" />
            <div className="hero__trust-item">
              <span className="hero__trust-number"><AnimCounter target={15} suffix="+" /></span>
              <span>AI Tools</span>
            </div>
            <div className="hero__trust-divider" />
            <div className="hero__trust-item">
              <span className="hero__trust-number">&infin;</span>
              <span>Possibilities</span>
            </div>
          </div>
        </section>

        {/* ── Gradient Divider ── */}
        <div className="gradient-divider" />

        {/* ── Stats Row ── */}
        <section className="stats-section reveal" ref={statsRef as React.RefObject<HTMLElement>}>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-card__number"><AnimCounter target={1} suffix="M+" /></span>
              <span className="stat-card__label">Prompts Processed</span>
              <div className="stat-card__icon">&#x26A1;</div>
            </div>
            <div className="stat-card">
              <span className="stat-card__number"><AnimCounter target={150} suffix="+" /></span>
              <span className="stat-card__label">Countries</span>
              <div className="stat-card__icon">&#x1F30D;</div>
            </div>
            <div className="stat-card">
              <span className="stat-card__number"><AnimCounter target={99} suffix=".9%" /></span>
              <span className="stat-card__label">Uptime</span>
              <div className="stat-card__icon">&#x2705;</div>
            </div>
            <div className="stat-card">
              <span className="stat-card__number"><AnimCounter target={200} prefix="<" suffix="ms" /></span>
              <span className="stat-card__label">Response Time</span>
              <div className="stat-card__icon">&#x1F3CE;&#xFE0F;</div>
            </div>
          </div>
        </section>

        {/* ── Gradient Divider ── */}
        <div className="gradient-divider" />

        {/* ── How it Works ── */}
        <section className="how-section reveal" id="how" ref={howRef as React.RefObject<HTMLElement>}>
          <div className="how-section__header">
            <span className="section-label">Simple as 1-2-3</span>
            <h2 className="section-title">How It Works</h2>
          </div>
          <div className="how-grid">
            <div className="how-step">
              <div className="how-step__number">1</div>
              <div className="how-step__connector" />
              <h3 className="how-step__title">Enter Your Prompt</h3>
              <p className="how-step__desc">Type anything &mdash; a question, a creative brief, a code task, or an image description.</p>
            </div>
            <div className="how-step">
              <div className="how-step__number">2</div>
              <div className="how-step__connector" />
              <h3 className="how-step__title">MoA Routes Intelligently</h3>
              <p className="how-step__desc">Our Mixture of Agents system analyzes your prompt and selects the optimal model or blend of models.</p>
            </div>
            <div className="how-step">
              <div className="how-step__number">3</div>
              <h3 className="how-step__title">Get Superior Results</h3>
              <p className="how-step__desc">Receive a response that outperforms any single model. Iterate, refine, and export in any format.</p>
            </div>
          </div>
        </section>

        {/* ── Gradient Divider ── */}
        <div className="gradient-divider" />

        {/* ── Models Ticker ── */}
        <section className="models-section reveal" id="models" ref={modelsRef as React.RefObject<HTMLElement>}>
          <div className="models-section__header">
            <span className="section-label">2026 Intelligence Index</span>
            <h2 className="section-title">Best-in-Class Models. All in One Place.</h2>
          </div>
          <div className="models-marquee">
            <div className="models-marquee__track">
              {[...AI_MODELS, ...AI_MODELS].map((m, i) => (
                <div key={i} className="model-chip">
                  <span className="model-chip__score">{m.score}</span>
                  <div className="model-chip__info">
                    <span className="model-chip__name">{m.name}</span>
                    <span className="model-chip__provider">{m.provider}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Gradient Divider ── */}
        <div className="gradient-divider" />

        {/* ── Tool Grid ── */}
        <section className="tools-section reveal" id="tools" ref={toolsRef as React.RefObject<HTMLElement>}>
          <div className="tools-section__header">
            <span className="section-label">Explore the Suite</span>
            <h2 className="section-title">Everything You Need. One Place.</h2>
          </div>
          <div className="tools-grid">
            {TOOLS.map((tool, i) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="tool-card"
                style={{
                  '--tool-color': tool.color,
                  '--tool-glow': tool.glow,
                  animationDelay: `${i * 60}ms`,
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

        {/* ── Gradient Divider ── */}
        <div className="gradient-divider" />

        {/* ── Feature Highlights ── */}
        <section className="features-section reveal" id="features" ref={featuresRef as React.RefObject<HTMLElement>}>
          <div className="feature-card feature-card--wide">
            <div className="feature-card__glow" />
            <div className="feature-card__content">
              <span className="feature-card__label">Mixture of Agents</span>
              <h3 className="feature-card__title">Auto-routes to GPT-5.5, Claude Opus 4.7, Gemini 2.5 Pro &amp; more</h3>
              <p className="feature-card__desc">
                Our MoA pipeline routes each prompt to the best-performing model in real time,
                then synthesizes a superior answer. Better than any single model.
              </p>
            </div>
            <div className="feature-card__visual">
              <div className="moa-visual">
                <div className="moa-visual__center">MoA</div>
                <div className="moa-visual__orbit moa-visual__orbit--1"><span>GPT-5.5</span></div>
                <div className="moa-visual__orbit moa-visual__orbit--2"><span>Opus 4.7</span></div>
                <div className="moa-visual__orbit moa-visual__orbit--3"><span>Gemini 2.5</span></div>
                <div className="moa-visual__orbit moa-visual__orbit--4"><span>Grok 4.3</span></div>
              </div>
            </div>
          </div>

          <div className="feature-row">
            <div className="feature-card">
              <div className="feature-card__glow" />
              <span className="feature-card__label">Security</span>
              <h3 className="feature-card__title">Enterprise-Grade Privacy</h3>
              <p className="feature-card__desc">
                End-to-end encryption. Your data never trains models. SOC 2 compliant.
              </p>
              <div className="feature-card__icon-row">
                <span>&#x1F512;</span><span>&#x1F6E1;&#xFE0F;</span><span>&#x2705;</span>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-card__glow" />
              <span className="feature-card__label">Credits</span>
              <h3 className="feature-card__title">Pay For What You Use</h3>
              <p className="feature-card__desc">
                Flexible credit system — start free, upgrade or buy packs as you grow. Credits never expire.
              </p>
              <div className="feature-card__price-row">
                <div className="price-tag">Free <span>200 credits</span></div>
                <div className="price-tag price-tag--gold">Plus <span>12K credits</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Gradient Divider ── */}
        <div className="gradient-divider" />

        {/* ── Comparison Table ── */}
        <section className="compare-section reveal" id="compare" ref={compareRef as React.RefObject<HTMLElement>}>
          <div className="compare-section__header">
            <span className="section-label">Why Clarix?</span>
            <h2 className="section-title">Clarix vs. The Rest</h2>
          </div>
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="compare-table__highlight">Clarix AI</th>
                  <th>Others</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISONS.map((c, i) => (
                  <tr key={i}>
                    <td>{c.feature}</td>
                    <td className="compare-table__highlight">{c.Clarix ? <span className="compare-check">&#x2713;</span> : <span className="compare-x">&#x2717;</span>}</td>
                    <td>{c.others ? <span className="compare-check compare-check--dim">&#x2713;</span> : <span className="compare-x">&#x2717;</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Gradient Divider ── */}
        <div className="gradient-divider" />

        {/* ── Pricing ── */}
        <section className="pricing-section reveal" id="pricing" ref={pricingRef as React.RefObject<HTMLElement>}>
          <div className="pricing-section__header">
            <span className="section-label">Simple Pricing</span>
            <h2 className="section-title">Start Free. Scale As You Grow.</h2>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <span className="pricing-card__name">Free</span>
              <div className="pricing-card__price">$0<span>/month</span></div>
              <ul className="pricing-card__features">
                <li>&#x2713; 200 credits per month</li>
                <li>&#x2713; Access to all AI tools</li>
                <li>&#x2713; 3 AI models</li>
                <li>&#x2713; Community support</li>
                <li>&#x2713; 1 GB Drive storage</li>
              </ul>
              <Link href="/chat" className="pricing-card__btn">Get Started</Link>
            </div>
            <div className="pricing-card">
              <span className="pricing-card__name">Plus</span>
              <div className="pricing-card__price">$25<span>/month</span></div>
              <ul className="pricing-card__features">
                <li>&#x2713; 12,000 credits/month</li>
                <li>&#x2713; Access to all AI tools</li>
                <li>&#x2713; All premium models</li>
                <li>&#x2713; MoA routing</li>
                <li>&#x2713; Priority queue</li>
                <li>&#x2713; 50 GB Drive storage</li>
              </ul>
              <Link href="/chat" className="pricing-card__btn">Upgrade to Plus</Link>
            </div>
            <div className="pricing-card pricing-card--featured">
              <div className="pricing-card__badge">Most Popular</div>
              <span className="pricing-card__name">Pro</span>
              <div className="pricing-card__price">$49<span>/month</span></div>
              <ul className="pricing-card__features">
                <li>&#x2713; 30,000 credits/month</li>
                <li>&#x2713; All premium models</li>
                <li>&#x2713; MoA routing</li>
                <li>&#x2713; Priority support</li>
                <li>&#x2713; API access</li>
                <li>&#x2713; 100 GB Drive storage</li>
                <li>&#x2713; Custom agents</li>
              </ul>
              <Link href="/chat" className="pricing-card__btn pricing-card__btn--gold">Start Pro Trial</Link>
            </div>
            <div className="pricing-card">
              <span className="pricing-card__name">Enterprise</span>
              <div className="pricing-card__price">$249<span>/month</span></div>
              <ul className="pricing-card__features">
                <li>&#x2713; 200,000 credits/month</li>
                <li>&#x2713; Everything in Pro</li>
                <li>&#x2713; SSO &amp; SAML</li>
                <li>&#x2713; Dedicated support</li>
                <li>&#x2713; 500 GB Drive storage</li>
                <li>&#x2713; SLA guarantee</li>
                <li>&#x2713; Team collaboration</li>
              </ul>
              <Link href="/contact" className="pricing-card__btn">Contact Sales</Link>
            </div>
          </div>
        </section>

        {/* ── Gradient Divider ── */}
        <div className="gradient-divider" />

        {/* ── Testimonials ── */}
        <section className="testimonials-section reveal" id="testimonials" ref={testimonialsRef as React.RefObject<HTMLElement>}>
          <div className="testimonials-section__header">
            <span className="section-label">What People Say</span>
            <h2 className="section-title">Loved by Teams Everywhere</h2>
          </div>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card" style={{ animationDelay: `${i * 120}ms` }}>
                <div className="testimonial-card__quote-mark">&ldquo;</div>
                <p className="testimonial-card__text">{t.quote}</p>
                <div className="testimonial-card__author">
                  <div className="testimonial-card__avatar" style={{ background: t.color }}>{t.avatar}</div>
                  <div className="testimonial-card__info">
                    <span className="testimonial-card__name">{t.name}</span>
                    <span className="testimonial-card__role">{t.role}, {t.company}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Gradient Divider ── */}
        <div className="gradient-divider" />

        {/* ── FAQ ── */}
        <section className="faq-section reveal" id="faq" ref={faqRef as React.RefObject<HTMLElement>}>
          <div className="faq-section__header">
            <span className="section-label">Common Questions</span>
            <h2 className="section-title">Frequently Asked Questions</h2>
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
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cta-section reveal" ref={ctaRef as React.RefObject<HTMLElement>}>
          <div className="cta-section__glow" />
          <h2 className="cta-section__title">Ready to build the future?</h2>
          <p className="cta-section__desc">Start with 200 free credits. No credit card required.</p>
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
              <p className="home-footer__tagline">The most powerful AI workspace for creators, developers, and teams.</p>
              <div className="home-footer__newsletter">
                <input type="email" placeholder="Enter your email" className="home-footer__newsletter-input" />
                <button className="home-footer__newsletter-btn">Subscribe</button>
              </div>
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
              <Link href="/changelog">Changelog</Link>
              <Link href="/status">Status</Link>
              <Link href="/blog">Blog</Link>
            </div>

            <div className="home-footer__col">
              <h4>Company</h4>
              <Link href="/about">About</Link>
              <Link href="/careers">Careers</Link>
              <Link href="/contact">Contact</Link>
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
                <span className="login-modal__prompt-mode">Mode: {activeMode === 'research' ? '&#x1F50D; Research' : '&#x26A1; Create'}</span>
              </div>
            )}
            <div className="login-modal__buttons">
              <button
                className="login-modal__btn login-modal__btn--google"
                disabled={loginLoading}
                onClick={async () => {
                  setLoginLoading(true);
                  await signIn.social({ provider: 'google', callbackURL: '/chat' });
                  setLoginLoading(false);
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
