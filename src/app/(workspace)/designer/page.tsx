'use client';

import React, { useState, useEffect } from 'react';
import { useCreations } from '@/hooks/useCreations';
import './designer.css';

/* ── Types ── */
interface DesignItem {
    id: string;
    prompt: string;
    model: string;
    template: string;
    size: string;
    gradient: string;
    timestamp: number;
}

const DESIGN_MODELS = [
    { id: 'flux-schnell', name: 'FLUX Schnell', provider: 'BFL', color: '#a78bfa', description: 'Quick drafts · most affordable', credits: 2 },
    { id: 'ideogram-v3', name: 'Ideogram V3', provider: 'Ideogram', color: '#ff6b35', description: 'Best for text & logos in designs', credits: 8 },
    { id: 'flux-2-pro', name: 'FLUX.2 Pro', provider: 'BFL', color: '#4285f4', description: 'Very realistic · professional', credits: 8 },
    { id: 'gpt-image-2', name: 'GPT Image 2', provider: 'OpenAI', color: '#10a37f', description: 'Best quality · realistic images', credits: 15 },
    { id: 'nano-banana-pro', name: 'Nano Banana Pro', provider: 'Google', color: '#34a853', description: 'Studio-quality (Imagen 4)', credits: 20 },
];

const TEMPLATES = [
    { id: 'logo', name: 'Logo', icon: '🎯' },
    { id: 'poster', name: 'Poster', icon: '🖼️' },
    { id: 'social', name: 'Social Post', icon: '📱' },
    { id: 'banner', name: 'Banner', icon: '🏷️' },
    { id: 'thumbnail', name: 'Thumbnail', icon: '▶️' },
    { id: 'business-card', name: 'Business Card', icon: '💼' },
    { id: 'flyer', name: 'Flyer', icon: '📄' },
    { id: 'custom', name: 'Custom', icon: '✨' },
];

const SIZES = ['1080×1080', '1920×1080', '1080×1920', '1200×630', '800×600', '2048×2048'];

function generateGradient(): string {
    const h1 = Math.floor(Math.random() * 360);
    const h2 = (h1 + 90 + Math.floor(Math.random() * 90)) % 360;
    return `linear-gradient(135deg, hsl(${h1}, 55%, 35%), hsl(${h2}, 65%, 25%))`;
}

export default function DesignerPage() {
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('ideogram-v3');
    const [selectedTemplate, setSelectedTemplate] = useState('logo');
    const [selectedSize, setSelectedSize] = useState('1080×1080');
    const [isGenerating, setIsGenerating] = useState(false);
    const [designs, setDesigns] = useState<DesignItem[]>([]);

    const currentModel = DESIGN_MODELS.find(m => m.id === selectedModel) || DESIGN_MODELS[0];

    // Persistence
    const { creations, isLoading: isLoadingDesigns, saveCreation } = useCreations('designer');

    useEffect(() => {
        if (!isLoadingDesigns && creations.length > 0 && designs.length === 0) {
            const saved: DesignItem[] = creations.map(c => {
                const meta = c.metadata as Record<string, unknown>;
                return {
                    id: c.id,
                    prompt: c.title,
                    model: (meta.model as string) || 'ideogram-v3',
                    template: (meta.template as string) || 'logo',
                    size: (meta.size as string) || '1080×1080',
                    gradient: (meta.gradient as string) || generateGradient(),
                    timestamp: new Date(c.created_at).getTime(),
                };
            });
            const timer = setTimeout(() => {
                setDesigns(saved);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isLoadingDesigns, creations, designs]);

    const handleGenerate = () => {
        if (!prompt.trim() || isGenerating) return;
        setIsGenerating(true);
        setTimeout(() => {
            const gradient = generateGradient();
            const newDesign: DesignItem = {
                id: Date.now().toString(),
                prompt: prompt.trim(),
                model: selectedModel,
                template: selectedTemplate,
                size: selectedSize,
                gradient,
                timestamp: Date.now(),
            };
            setDesigns(prev => [newDesign, ...prev]);
            setIsGenerating(false);
            // Save to server
            saveCreation({ title: prompt.trim(), metadata: { model: selectedModel, template: selectedTemplate, size: selectedSize, gradient } });
        }, 2500 + Math.random() * 1500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
    };

    return (
        <div className="designer-page">
            <div className="designer-controls">
                <div className="designer-controls__title">
                    <span className="designer-controls__title-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                        </svg>
                    </span>
                    AI Designer
                </div>

                <div className="designer-controls__section">
                    <label className="designer-controls__label">Describe your design</label>
                    <textarea
                        className="designer-controls__prompt"
                        placeholder="A modern minimalist logo for a tech startup called &quot;Nova&quot;, using geometric shapes and a deep blue gradient..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={3}
                    />
                </div>

                <div className="designer-controls__section">
                    <label className="designer-controls__label">Template</label>
                    <div className="designer-controls__templates">
                        {TEMPLATES.map(t => (
                            <button
                                key={t.id}
                                className={`designer-controls__template ${selectedTemplate === t.id ? 'active' : ''}`}
                                onClick={() => setSelectedTemplate(t.id)}
                            >
                                <div className="designer-controls__template-icon">{t.icon}</div>
                                <div className="designer-controls__template-name">{t.name}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="designer-controls__section">
                    <label className="designer-controls__label">Model</label>
                    <div className="designer-controls__model-list">
                        {DESIGN_MODELS.map(model => (
                            <button
                                key={model.id}
                                className={`designer-controls__model ${selectedModel === model.id ? 'active' : ''}`}
                                onClick={() => setSelectedModel(model.id)}
                            >
                                <span className="designer-controls__model-dot" style={{ background: model.color }} />
                                <span className="designer-controls__model-info">
                                    <span className="designer-controls__model-name">{model.name}</span>
                                    <span className="designer-controls__model-desc">{model.description}</span>
                                </span>
                                <span className="designer-controls__model-credits">{model.credits}cr</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="designer-controls__section">
                    <label className="designer-controls__label">Size</label>
                    <div className="designer-controls__sizes">
                        {SIZES.map(s => (
                            <button
                                key={s}
                                className={`designer-controls__size ${selectedSize === s ? 'active' : ''}`}
                                onClick={() => setSelectedSize(s)}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    className="designer-controls__generate"
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                >
                    {isGenerating ? (
                        <><span className="designer-controls__spinner" /> Designing...</>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18m9-9H3" /></svg>
                            Generate · {currentModel.credits} credits
                        </>
                    )}
                </button>
            </div>

            <div className="designer-canvas">
                {designs.length === 0 && !isGenerating ? (
                    <div className="designer-canvas__empty">
                        <div className="designer-canvas__empty-icon">
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                        </div>
                        <h3>AI-Powered Design</h3>
                        <p>Pick a template, describe your vision, and generate professional designs instantly.</p>
                    </div>
                ) : (
                    <div className="designer-canvas__grid">
                        {isGenerating && (
                            <div className="designer-canvas__item">
                                <div className="designer-canvas__skeleton" />
                                <div className="designer-canvas__item-info">
                                    <div className="designer-canvas__item-prompt">{prompt}</div>
                                    <div className="designer-canvas__item-meta"><span>Generating...</span></div>
                                </div>
                            </div>
                        )}
                        {designs.map(d => (
                            <div key={d.id} className="designer-canvas__item">
                                <div className="designer-canvas__item-preview" style={{ background: d.gradient }}>
                                    {TEMPLATES.find(t => t.id === d.template)?.icon}
                                    <button
                                        className="designer-canvas__download-btn"
                                        style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                                        onClick={() => { const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#${Math.floor(Math.random() * 16777215).toString(16)};stop-opacity:1" /><stop offset="100%" style="stop-color:#${Math.floor(Math.random() * 16777215).toString(16)};stop-opacity:1" /></linearGradient></defs><rect width="800" height="600" fill="url(#g)" rx="16"/><text x="400" y="280" text-anchor="middle" fill="white" font-size="24" font-family="sans-serif">${d.prompt}</text><text x="400" y="320" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="14" font-family="sans-serif">${d.size} · ${DESIGN_MODELS.find(m => m.id === d.model)?.name || ''}</text></svg>`; const blob = new Blob([svg], { type: 'image/svg+xml' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `design-${d.id}.svg`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }}
                                    >
                                        ⬇ Download
                                    </button>
                                </div>
                                <div className="designer-canvas__item-info">
                                    <div className="designer-canvas__item-prompt">{d.prompt}</div>
                                    <div className="designer-canvas__item-meta">
                                        <span>{DESIGN_MODELS.find(m => m.id === d.model)?.name}</span>
                                        <span>{d.size}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
