'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/Toast';
import './image.css';

/* ── Types ── */
interface GeneratedImage {
    id: string;
    prompt: string;
    model: string;
    style: string;
    url: string;
    timestamp: number;
}

const IMAGE_MODELS = [
    { id: 'flux-schnell', name: 'Clarix Draft', provider: 'Clarix', description: 'Fastest · most affordable · drafts', credits: 2 },
    { id: 'flux-2-pro', name: 'Clarix Studio', provider: 'Clarix', description: 'Professional photos · realistic', credits: 8 },
    { id: 'ideogram-v3', name: 'Clarix Typography', provider: 'Clarix', description: 'Best for logos, text & typography', credits: 8 },
    { id: 'gpt-image-2', name: 'Clarix Ultra', provider: 'Clarix', description: 'Best quality · realistic scenes', credits: 15 },
    { id: 'nano-banana-pro', name: 'Clarix Realism', provider: 'Clarix', description: 'Studio-quality realism', credits: 20 },
];

const STYLE_PRESETS = [
    { id: 'none', name: 'None', emoji: '✨' },
    { id: 'realistic', name: 'Realistic', emoji: '📸' },
    { id: 'anime', name: 'Anime', emoji: '🎌' },
    { id: 'digital-art', name: 'Digital Art', emoji: '🎨' },
    { id: 'oil-painting', name: 'Oil Painting', emoji: '🖼️' },
    { id: 'pixel-art', name: 'Pixel Art', emoji: '👾' },
    { id: '3d-render', name: '3D Render', emoji: '🧊' },
    { id: 'watercolor', name: 'Watercolor', emoji: '💧' },
    { id: 'sketch', name: 'Sketch', emoji: '✏️' },
];

const ASPECT_RATIOS = [
    { id: '1:1', label: '1:1', width: 1024, height: 1024 },
    { id: '16:9', label: '16:9', width: 1344, height: 768 },
    { id: '9:16', label: '9:16', width: 768, height: 1344 },
    { id: '4:3', label: '4:3', width: 1152, height: 896 },
];

/* ── Main Image Page ── */
interface FallbackToast {
    id: string;
    from: string;
    to: string;
    reason: string;
}

export default function ImagePage() {
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('flux-2-pro');
    const [selectedStyle, setSelectedStyle] = useState('none');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [quantity, setQuantity] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [gallery, setGallery] = useState<GeneratedImage[]>([]);
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
    const [toasts, setToasts] = useState<FallbackToast[]>([]);
    const { toast } = useToast();

    const dismissToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const addToast = (fallback: { from: string; to: string; reason: string }) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setToasts((prev) => [...prev, { id, ...fallback }]);
        // Auto-dismiss after 12 seconds
        setTimeout(() => dismissToast(id), 12000);
    };

    const handleGenerate = async () => {
        if (!prompt.trim() || isGenerating) return;

        setIsGenerating(true);

        try {
            // Generate images in parallel based on quantity
            const promises = Array.from({ length: quantity }).map(async (_, i) => {
                const res = await fetch('/api/image/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: prompt.trim(),
                        model: selectedModel,
                        style: selectedStyle,
                        aspectRatio: aspectRatio,
                    }),
                });

                if (!res.ok) {
                    throw new Error('Failed to generate image');
                }

                const data = await res.json();

                // Show fallback toast if the API had to use an alternate model
                if (data.fallback) {
                    addToast(data.fallback);
                }
                
                return {
                    id: `img-${Date.now()}-${i}`,
                    prompt: prompt.trim(),
                    model: data.fallback ? 'flux-schnell' : selectedModel,
                    style: selectedStyle,
                    url: data.url,
                    timestamp: Date.now(),
                } as GeneratedImage;
            });

            const newImages = await Promise.all(promises);
            setGallery((prev) => [...newImages, ...prev]);
        } catch (error) {
            console.error('Error generating image:', error);
            toast('Failed to generate image. Please try again.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
        }
    };

    return (
        <div className="image-page">
            {/* Left: Controls */}
            <div className="image-controls">
                <h2 className="image-controls__title">AI Image Generator</h2>

                {/* Prompt */}
                <div className="image-controls__section">
                    <label className="image-controls__label">Prompt</label>
                    <textarea
                        className="image-controls__prompt"
                        placeholder="A futuristic city at sunset with flying cars and neon lights..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={3}
                    />
                </div>

                {/* Model */}
                <div className="image-controls__section">
                    <label className="image-controls__label">Model</label>
                    <div className="image-controls__model-list">
                        {IMAGE_MODELS.map((model) => (
                            <button
                                key={model.id}
                                className={`image-controls__model ${model.id === selectedModel ? 'active' : ''}`}
                                onClick={() => setSelectedModel(model.id)}
                            >
                                <span className="image-controls__model-name">{model.name}</span>
                                <span className="image-controls__model-desc">{model.description}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Style */}
                <div className="image-controls__section">
                    <label className="image-controls__label">Style Preset</label>
                    <div className="image-controls__styles">
                        {STYLE_PRESETS.map((style) => (
                            <button
                                key={style.id}
                                className={`image-controls__style ${style.id === selectedStyle ? 'active' : ''}`}
                                onClick={() => setSelectedStyle(style.id)}
                            >
                                <span>{style.emoji}</span>
                                <span>{style.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Aspect Ratio */}
                <div className="image-controls__section">
                    <label className="image-controls__label">Aspect Ratio</label>
                    <div className="image-controls__ratios">
                        {ASPECT_RATIOS.map((ratio) => (
                            <button
                                key={ratio.id}
                                className={`image-controls__ratio ${ratio.id === aspectRatio ? 'active' : ''}`}
                                onClick={() => setAspectRatio(ratio.id)}
                            >
                                {ratio.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quantity */}
                <div className="image-controls__section">
                    <label className="image-controls__label">
                        Images: <strong>{quantity}</strong>
                    </label>
                    <div className="image-controls__quantity">
                        {[1, 2, 3, 4].map((n) => (
                            <button
                                key={n}
                                className={`image-controls__qty-btn ${n === quantity ? 'active' : ''}`}
                                onClick={() => setQuantity(n)}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Generate Button */}
                <button
                    className="image-controls__generate"
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                >
                    {isGenerating ? (
                        <>
                            <div className="image-controls__spinner" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                            Generate · {quantity * 5} credits
                        </>
                    )}
                </button>
            </div>

            {/* Right: Gallery */}
            <div className="image-gallery">
                {gallery.length === 0 && !isGenerating ? (
                    <div className="image-gallery__empty">
                        <div className="image-gallery__empty-icon">
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                        </div>
                        <h3>Your Creations</h3>
                        <p>Describe what you want to see — your images will appear here.</p>
                    </div>
                ) : (
                    <div className="image-gallery__grid">
                        {isGenerating && (
                            Array.from({ length: quantity }).map((_, i) => (
                                <div key={`loading-${i}`} className="image-gallery__item image-gallery__item--loading">
                                    <div className="image-gallery__skeleton" />
                                </div>
                            ))
                        )}
                        {gallery.map((img) => (
                            <button
                                key={img.id}
                                className={`image-gallery__item ${selectedImage?.id === img.id ? 'selected' : ''}`}
                                onClick={() => setSelectedImage(img)}
                            >
                                <div
                                    className="image-gallery__preview"
                                    style={{
                                        background: img.url.startsWith('http') || img.url.startsWith('data:')
                                            ? `url('${img.url}') center/cover no-repeat`
                                            : img.url
                                    }}
                                />
                                <div className="image-gallery__overlay">
                                    <span className="image-gallery__overlay-model">
                                        {IMAGE_MODELS.find((m) => m.id === img.model)?.name}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Image Detail Modal */}
            {selectedImage && (
                <div className="image-modal" onClick={() => setSelectedImage(null)}>
                    <div className="image-modal__content" onClick={(e) => e.stopPropagation()}>
                        <div className="image-modal__preview" style={{
                            background: selectedImage.url.startsWith('http') || selectedImage.url.startsWith('data:')
                                ? `url('${selectedImage.url}') center/contain no-repeat`
                                : selectedImage.url
                        }} />
                        <div className="image-modal__info">
                            <p className="image-modal__prompt">{selectedImage.prompt}</p>
                            <div className="image-modal__meta">
                                <span>{IMAGE_MODELS.find((m) => m.id === selectedImage.model)?.name}</span>
                                <span>·</span>
                                <span>{selectedImage.style !== 'none' ? STYLE_PRESETS.find((s) => s.id === selectedImage.style)?.name : 'No style'}</span>
                            </div>
                            <div className="image-modal__actions">
                                <button className="image-modal__action">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Download
                                </button>
                                <button className="image-modal__action">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" />
                                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                    </svg>
                                    Copy
                                </button>
                                <button className="image-modal__action" onClick={() => {
                                    setPrompt(selectedImage.prompt);
                                    setSelectedImage(null);
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="23 4 23 10 17 10" />
                                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                                    </svg>
                                    Re-use prompt
                                </button>
                            </div>
                        </div>
                        <button className="image-modal__close" onClick={() => setSelectedImage(null)}>×</button>
                    </div>
                </div>
            )}

            {/* Fallback Toast Notifications */}
            {toasts.length > 0 && (
                <div className="fallback-toasts">
                    {toasts.map((toast) => (
                        <div key={toast.id} className="fallback-toast">
                            <div className="fallback-toast__icon">⚠️</div>
                            <div className="fallback-toast__content">
                                <div className="fallback-toast__title">Model Fallback Activated</div>
                                <div className="fallback-toast__detail">
                                    <strong>{toast.from}</strong> failed → using <strong>{toast.to}</strong>
                                </div>
                                <div className="fallback-toast__reason">{toast.reason}</div>
                            </div>
                            <button
                                className="fallback-toast__close"
                                onClick={() => dismissToast(toast.id)}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
