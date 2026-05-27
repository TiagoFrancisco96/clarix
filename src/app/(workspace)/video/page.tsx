'use client';

import React, { useState } from 'react';
import './video.css';

/* ── Types ── */
interface GeneratedVideo {
    id: string;
    prompt: string;
    model: string;
    duration: string;
    ratio: string;
    style: string;
    gradient: string;
    timestamp: number;
    videoUrl?: string;
    error?: string;
}

const VIDEO_MODELS = [
    { id: 'seedance-2.0', name: 'Seedance 2.0', provider: 'fal.ai', color: '#a78bfa', description: 'Best value · multi-shot · audio', credits: 25 },
    { id: 'kling-3', name: 'Kling 3.0', provider: 'fal.ai', color: '#ff6b35', description: 'Realistic people · great physics', credits: 40 },
    { id: 'veo-3.1-fast', name: 'Veo 3.1 Fast', provider: 'Google', color: '#4285f4', description: 'Good quality · faster · cheaper', credits: 40 },
    { id: 'veo-3.1', name: 'Veo 3.1', provider: 'Google', color: '#34a853', description: 'Best quality · 4K with sound', credits: 75 },
    { id: 'runway-gen4.5', name: 'Runway Gen-4.5', provider: 'Runway', color: '#8b5cf6', description: 'Director control · creative effects', credits: 100 },
];

const DURATIONS = ['4s', '8s', '10s', '15s'];
const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3'];
const STYLES = ['Cinematic', 'Realistic', 'Anime', 'Abstract', 'Slow Motion', 'Time-lapse', 'Stop Motion', 'Aerial'];

/* ── Random gradient generator ── */
function generateVideoGradient(): string {
    const hue1 = Math.floor(Math.random() * 360);
    const hue2 = (hue1 + 60 + Math.floor(Math.random() * 120)) % 360;
    return `linear-gradient(135deg, hsl(${hue1}, 50%, 20%), hsl(${hue2}, 60%, 15%))`;
}

/* ── Main Video Page ── */
export default function VideoPage() {
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState('seedance-2.0');
    const [selectedDuration, setSelectedDuration] = useState('8s');
    const [selectedRatio, setSelectedRatio] = useState('16:9');
    const [selectedStyle, setSelectedStyle] = useState('Cinematic');
    const [isGenerating, setIsGenerating] = useState(false);
    const [videos, setVideos] = useState<GeneratedVideo[]>([]);

    const currentModel = VIDEO_MODELS.find(m => m.id === selectedModel) || VIDEO_MODELS[0];

    const handleGenerate = async () => {
        if (!prompt.trim() || isGenerating) return;
        setIsGenerating(true);

        try {
            const res = await fetch('/api/video/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    model: selectedModel,
                    duration: selectedDuration,
                    aspectRatio: selectedRatio,
                    style: selectedStyle,
                }),
            });

            const data = await res.json();

            const newVideo: GeneratedVideo = {
                id: Date.now().toString(),
                prompt: prompt.trim(),
                model: selectedModel,
                duration: selectedDuration,
                ratio: selectedRatio,
                style: selectedStyle,
                gradient: generateVideoGradient(),
                timestamp: Date.now(),
                videoUrl: data.videoUrl || undefined,
                error: data.error || undefined,
            };
            setVideos(prev => [newVideo, ...prev]);
        } catch (err) {
            const newVideo: GeneratedVideo = {
                id: Date.now().toString(),
                prompt: prompt.trim(),
                model: selectedModel,
                duration: selectedDuration,
                ratio: selectedRatio,
                style: selectedStyle,
                gradient: generateVideoGradient(),
                timestamp: Date.now(),
                error: err instanceof Error ? err.message : 'Network error',
            };
            setVideos(prev => [newVideo, ...prev]);
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
        <div className="video-page">
            {/* Controls Panel */}
            <div className="video-controls">
                <div className="video-controls__title">
                    <span className="video-controls__title-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect x="1" y="5" width="15" height="14" rx="2" />
                        </svg>
                    </span>
                    AI Video
                </div>

                {/* Prompt */}
                <div className="video-controls__section">
                    <label className="video-controls__label">Describe your video</label>
                    <textarea
                        className="video-controls__prompt"
                        placeholder="A golden sunset over the ocean, waves gently crashing on the shore, camera slowly panning right with cinematic depth of field..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={4}
                    />
                </div>

                {/* Model Selection */}
                <div className="video-controls__section">
                    <label className="video-controls__label">Model</label>
                    <div className="video-controls__model-list">
                        {VIDEO_MODELS.map(model => (
                            <button
                                key={model.id}
                                className={`video-controls__model ${selectedModel === model.id ? 'active' : ''}`}
                                onClick={() => setSelectedModel(model.id)}
                            >
                                <span className="video-controls__model-dot" style={{ background: model.color }} />
                                <span className="video-controls__model-info">
                                    <span className="video-controls__model-name">{model.name}</span>
                                    <span className="video-controls__model-desc">{model.description}</span>
                                </span>
                                <span className="video-controls__model-credits">{model.credits}cr</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration */}
                <div className="video-controls__section">
                    <label className="video-controls__label">Duration</label>
                    <div className="video-controls__durations">
                        {DURATIONS.map(dur => (
                            <button
                                key={dur}
                                className={`video-controls__duration ${selectedDuration === dur ? 'active' : ''}`}
                                onClick={() => setSelectedDuration(dur)}
                            >
                                {dur}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Aspect Ratio */}
                <div className="video-controls__section">
                    <label className="video-controls__label">Aspect Ratio</label>
                    <div className="video-controls__ratios">
                        {ASPECT_RATIOS.map(ratio => (
                            <button
                                key={ratio}
                                className={`video-controls__ratio ${selectedRatio === ratio ? 'active' : ''}`}
                                onClick={() => setSelectedRatio(ratio)}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Style */}
                <div className="video-controls__section">
                    <label className="video-controls__label">Style</label>
                    <div className="video-controls__styles">
                        {STYLES.map(style => (
                            <button
                                key={style}
                                className={`video-controls__style ${selectedStyle === style ? 'active' : ''}`}
                                onClick={() => setSelectedStyle(style)}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Generate */}
                <button
                    className="video-controls__generate"
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                >
                    {isGenerating ? (
                        <>
                            <span className="video-controls__spinner" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                            Generate Video · {currentModel.credits} credits
                        </>
                    )}
                </button>
            </div>

            {/* Gallery */}
            <div className="video-gallery">
                {videos.length === 0 && !isGenerating ? (
                    <div className="video-gallery__empty">
                        <div className="video-gallery__empty-icon">
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="23 7 16 12 23 17 23 7" />
                                <rect x="1" y="5" width="15" height="14" rx="2" />
                            </svg>
                        </div>
                        <h3>Create AI Videos</h3>
                        <p>Describe a scene and select a model to generate professional-quality video clips with AI.</p>
                        <div className="video-gallery__empty-features">
                            <span className="video-gallery__empty-feature">🎬 Cinematic 4K</span>
                            <span className="video-gallery__empty-feature">🎵 Native Audio</span>
                            <span className="video-gallery__empty-feature">👤 Realistic Humans</span>
                            <span className="video-gallery__empty-feature">🎨 Multiple Styles</span>
                            <span className="video-gallery__empty-feature">⏱️ Up to 15s</span>
                        </div>
                    </div>
                ) : (
                    <div className="video-gallery__grid">
                        {isGenerating && (
                            <div className="video-gallery__item">
                                <div className="video-gallery__preview">
                                    <div className="video-gallery__skeleton" />
                                </div>
                                <div className="video-gallery__item-info">
                                    <div className="video-gallery__item-prompt">{prompt}</div>
                                    <div className="video-gallery__item-meta">
                                        <span className="video-gallery__item-model">
                                            {currentModel.name}
                                        </span>
                                        <span className="video-gallery__item-duration">
                                            Generating {selectedDuration}...
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {videos.map(video => {
                            const model = VIDEO_MODELS.find(m => m.id === video.model);
                            return (
                                <div key={video.id} className="video-gallery__item">
                                    <div className="video-gallery__preview">
                                        {video.videoUrl ? (
                                            <video
                                                className="video-gallery__video"
                                                src={video.videoUrl}
                                                controls
                                                preload="metadata"
                                                playsInline
                                            />
                                        ) : (
                                            <div
                                                className="video-gallery__preview-placeholder"
                                                style={{ background: video.gradient }}
                                            >
                                                {video.error ? '⚠️' : '▶'}
                                            </div>
                                        )}
                                        {!video.videoUrl && !video.error && (
                                            <div className="video-gallery__play-btn">
                                                <div className="video-gallery__play-icon">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                        <polygon points="5 3 19 12 5 21 5 3" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="video-gallery__item-info">
                                        <div className="video-gallery__item-prompt">{video.prompt}</div>
                                        {video.error && (
                                            <div className="video-gallery__item-error">{video.error}</div>
                                        )}
                                        <div className="video-gallery__item-meta">
                                            <span className="video-gallery__item-model">
                                                {model?.name || 'Unknown'}
                                            </span>
                                            <span className="video-gallery__item-duration">
                                                {video.duration} · {video.ratio} · {video.style}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
