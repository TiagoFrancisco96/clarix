'use client';

import React, { useState, useEffect } from 'react';
import { useCreations } from '@/hooks/useCreations';
import { useToast } from '@/components/Toast';
import './slides.css';

/* ── Types ── */
interface SlideContent {
    title: string;
    bullets: string[];
}

interface SlideDeck {
    id: string;
    prompt: string;
    model: string;
    theme: string;
    slides: SlideContent[];
    timestamp: number;
}

const SLIDE_MODELS = [
    { id: 'deepseek-v4-flash', name: 'DeepSeek V4-Flash', provider: 'DeepSeek', color: '#a78bfa', description: 'Fastest · budget friendly', credits: 1 },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', color: '#4285f4', description: 'Super fast · most affordable', credits: 3 },
    { id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', color: '#e8915a', description: 'Great writing · clean layouts', credits: 5 },
    { id: 'gpt-5.5', name: 'GPT-5.5', provider: 'OpenAI', color: '#10a37f', description: 'Best structure & storytelling', credits: 15 },
];

const THEMES = [
    { id: 'midnight', name: 'Midnight', gradient: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
    { id: 'ocean', name: 'Ocean', gradient: 'linear-gradient(135deg, #0c3547, #1a6b8a, #2196f3)' },
    { id: 'sunset', name: 'Sunset', gradient: 'linear-gradient(135deg, #f12711, #f5af19, #ff6b35)' },
    { id: 'forest', name: 'Forest', gradient: 'linear-gradient(135deg, #0b3d2e, #116d3e, #1db954)' },
    { id: 'lavender', name: 'Lavender', gradient: 'linear-gradient(135deg, #4a2c6e, #7b4dbd, #a78bfa)' },
    { id: 'ember', name: 'Ember', gradient: 'linear-gradient(135deg, #1a1a2e, #c4956a, #f5af19)' },
];

const SAMPLE_SLIDES: SlideContent[] = [
    { title: 'AI in 2026: The New Reality', bullets: ['Multimodal AI is now mainstream', 'Costs dropped 90% in 18 months', 'Every app is an AI app'] },
    { title: 'Key Market Trends', bullets: ['Agentic workflows replacing manual ops', 'On-device models for privacy-first use', 'AI-native companies outpacing incumbents'] },
    { title: 'Our Strategy', bullets: ['Launch Clarix AI workspace', 'Target creative professionals', 'Build model-agnostic infrastructure'] },
    { title: 'Product Roadmap', bullets: ['Q1: Core workspace tools', 'Q2: Agent marketplace', 'Q3: Enterprise features + SOC2'] },
    { title: 'Financial Projections', bullets: ['$50K ARR by month 6', 'Break-even at month 12', 'Series A readiness by Q4'] },
];

export default function SlidesPage() {
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('claude-sonnet-4.6');
    const [selectedTheme, setSelectedTheme] = useState('midnight');
    const [slideCount, setSlideCount] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);
    const [deck, setDeck] = useState<SlideDeck | null>(null);

    const currentModel = SLIDE_MODELS.find(m => m.id === selectedModel) || SLIDE_MODELS[0];
    const currentTheme = THEMES.find(t => t.id === selectedTheme) || THEMES[0];
    const { toast } = useToast();

    // Persistence
    const { creations, isLoading: isLoadingSlides, saveCreation } = useCreations('slides');

    // Load last saved deck on mount
    useEffect(() => {
        if (!isLoadingSlides && creations.length > 0 && !deck) {
            const c = creations[0];
            const meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata;
            const timer = setTimeout(() => {
                setDeck({
                    id: c.id,
                    prompt: c.title,
                    model: (meta.model as string) || 'GPT-5.5',
                    theme: (meta.theme as string) || 'midnight',
                    slides: (meta.slides as SlideContent[]) || SAMPLE_SLIDES,
                    timestamp: new Date(c.created_at).getTime(),
                });
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isLoadingSlides, creations, deck]);

    const handleGenerate = async () => {
        if (!prompt.trim() || isGenerating) return;
        setIsGenerating(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'system',
                            content: `You are a professional presentation designer. Create exactly ${slideCount} slides for a presentation. Return ONLY a JSON array of objects, each with "title" (string) and "bullets" (array of 2-4 short strings). No markdown, no explanations, no code fences. Output raw JSON only.`,
                        },
                        { role: 'user', content: prompt.trim() },
                    ],
                    model: selectedModel,
                }),
            });

            if (res.status === 402) {
                toast('You\'re out of credits. Upgrade in Settings → Subscription.', 'warning');
                setIsGenerating(false);
                return;
            }

            let fullText = '';
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
                    for (const line of lines) {
                        try {
                            const d = JSON.parse(line.slice(6));
                            if (d.type === 'chunk') fullText += d.text;
                            if (d.type === 'done' && d.fullText) fullText = d.fullText;
                        } catch { /* skip */ }
                    }
                }
            }

            // Parse slides from AI response
            const jsonMatch = fullText.match(/\[[\s\S]*\]/);
            let slides: SlideContent[] = SAMPLE_SLIDES.slice(0, slideCount);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        slides = parsed.map((s: { title?: string; bullets?: string[] }) => ({
                            title: s.title || 'Untitled',
                            bullets: Array.isArray(s.bullets) ? s.bullets.map(String) : [],
                        }));
                    }
                } catch { /* use fallback */ }
            }

            const newDeck: SlideDeck = {
                id: Date.now().toString(),
                prompt: prompt.trim(),
                model: selectedModel,
                theme: selectedTheme,
                slides,
                timestamp: Date.now(),
            };
            setDeck(newDeck);
            const mdContent = slides.map((s, i) => `## Slide ${i + 1}: ${s.title}\n\n${s.bullets.map(b => `- ${b}`).join('\n')}`).join('\n\n---\n\n');
            saveCreation({ title: prompt.trim(), content: mdContent, metadata: { model: selectedModel, theme: selectedTheme, slides } });
        } catch (err) {
            console.error('[Slides] Error:', err);
            toast('Failed to generate slides. Please try again.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
    };

    return (
        <div className="slides-page">
            <div className="slides-controls">
                <div className="slides-controls__title">
                    <span className="slides-controls__title-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                    </span>
                    AI Slides
                </div>

                <div className="slides-controls__section">
                    <label className="slides-controls__label">What&apos;s your presentation about?</label>
                    <textarea
                        className="slides-controls__prompt"
                        placeholder="Create a pitch deck about AI-powered productivity tools for creative professionals..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={4}
                    />
                </div>

                <div className="slides-controls__section">
                    <label className="slides-controls__label">Theme</label>
                    <div className="slides-controls__themes">
                        {THEMES.map(t => (
                            <button
                                key={t.id}
                                className={`slides-controls__theme ${selectedTheme === t.id ? 'active' : ''}`}
                                style={{ background: t.gradient }}
                                onClick={() => setSelectedTheme(t.id)}
                            >
                                <span className="slides-controls__theme-name">{t.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="slides-controls__section">
                    <label className="slides-controls__label">Slides</label>
                    <div className="slides-controls__count">
                        <input
                            type="range"
                            className="slides-controls__count-input"
                            min={3}
                            max={12}
                            value={slideCount}
                            onChange={(e) => setSlideCount(Number(e.target.value))}
                        />
                        <span className="slides-controls__count-value">{slideCount} slides</span>
                    </div>
                </div>

                <div className="slides-controls__section">
                    <label className="slides-controls__label">Model</label>
                    <div className="slides-controls__model-list">
                        {SLIDE_MODELS.map(model => (
                            <button
                                key={model.id}
                                className={`slides-controls__model ${selectedModel === model.id ? 'active' : ''}`}
                                onClick={() => setSelectedModel(model.id)}
                            >
                                <span className="slides-controls__model-dot" style={{ background: model.color }} />
                                <span className="slides-controls__model-info">
                                    <span className="slides-controls__model-name">{model.name}</span>
                                    <span className="slides-controls__model-desc">{model.description}</span>
                                </span>
                                <span className="slides-controls__model-credits">{model.credits}cr</span>
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    className="slides-controls__generate"
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                >
                    {isGenerating ? (
                        <><span className="slides-controls__spinner" /> Building deck...</>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /></svg>
                            Generate · {currentModel.credits} credits
                        </>
                    )}
                </button>
                {deck && (
                    <button
                        className="slides-controls__generate"
                        style={{ background: 'var(--bg-tertiary)', marginTop: 'var(--space-2)' }}
                        onClick={() => { if (!deck) return; const md = deck.slides.map((s, i) => `## Slide ${i + 1}: ${s.title}\n\n${s.bullets.map(b => `- ${b}`).join('\n')}`).join('\n\n---\n\n'); const blob = new Blob([`# ${deck.prompt}\n\n${md}`], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'slides-deck.md'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        Export Deck
                    </button>
                )}
            </div>

            <div className="slides-preview">
                {!deck && !isGenerating ? (
                    <div className="slides-preview__empty">
                        <div className="slides-preview__empty-icon">
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                        </div>
                        <h3>AI Slide Decks</h3>
                        <p>Describe your presentation topic and get a beautifully themed slide deck in seconds.</p>
                    </div>
                ) : isGenerating ? (
                    <div className="slides-preview__deck">
                        {Array.from({ length: Math.min(slideCount, 3) }).map((_, i) => (
                            <div key={i} className="slides-preview__skeleton" />
                        ))}
                    </div>
                ) : deck ? (
                    <div className="slides-preview__deck">
                        {deck.slides.map((slide, i) => (
                            <div
                                key={i}
                                className="slides-preview__slide"
                                style={{ background: currentTheme.gradient, animationDelay: `${i * 100}ms` }}
                            >
                                <span className="slides-preview__slide-number">{i + 1} / {deck.slides.length}</span>
                                <div className="slides-preview__slide-title">{slide.title}</div>
                                <div className="slides-preview__slide-content">
                                    <ul>
                                        {slide.bullets.map((b, j) => (
                                            <li key={j}>{b}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
