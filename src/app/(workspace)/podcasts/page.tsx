'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCreations } from '@/hooks/useCreations';
import { useToast } from '@/components/Toast';
import './podcasts.css';

/* ── Types ── */
interface PodcastEpisode {
    id: string;
    title: string;
    description: string;
    source: string;
    duration: string;
    durationSec: number;
    date: string;
    hosts: string;
    coverGradient: string;
    coverEmoji: string;
}

interface Voice {
    id: string;
    name: string;
    style: string;
    avatar: string;
    color: string;
}

/* ── Constants ── */
const VOICES: Voice[] = [
    { id: 'aria', name: 'Aria', style: 'Professional', avatar: '👩‍💼', color: '#e74c3c' },
    { id: 'marcus', name: 'Marcus', style: 'Conversational', avatar: '👨‍🎤', color: '#3498db' },
    { id: 'luna', name: 'Luna', style: 'Energetic', avatar: '🧑‍🚀', color: '#9b59b6' },
    { id: 'kai', name: 'Kai', style: 'Storyteller', avatar: '🧔', color: '#e67e22' },
];

const DURATIONS = ['3 min', '5 min', '10 min', '15 min'];

const SAMPLE_EPISODES: PodcastEpisode[] = [
    {
        id: 'ep1',
        title: 'The Future of AI Agents in 2026',
        description: 'Two AI hosts discuss how AI assistants went from simple chatbots to smart helpers that can browse the web, write code, and even make phone calls.',
        source: 'URL: techcrunch.com/ai-agents-2026',
        duration: '8:42',
        durationSec: 522,
        date: 'Today',
        hosts: 'Aria & Marcus',
        coverGradient: 'linear-gradient(135deg, #667eea, #764ba2)',
        coverEmoji: '🤖',
    },
    {
        id: 'ep2',
        title: 'How to Build a SaaS in a Weekend',
        description: 'An engaging breakdown of how people are building complete web apps in just 48 hours using AI-powered tools — no traditional coding required.',
        source: 'Article: Building SaaS Fast',
        duration: '12:15',
        durationSec: 735,
        date: 'Yesterday',
        hosts: 'Luna & Kai',
        coverGradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
        coverEmoji: '🚀',
    },
    {
        id: 'ep3',
        title: 'Deep Dive: React Server Components',
        description: 'A detailed look at how modern React apps load and display content, comparing different approaches with real examples and speed tests.',
        source: 'PDF: react-docs-v19.pdf',
        duration: '15:00',
        durationSec: 900,
        date: '3 days ago',
        hosts: 'Aria & Kai',
        coverGradient: 'linear-gradient(135deg, #4facfe, #00f2fe)',
        coverEmoji: '⚛️',
    },
    {
        id: 'ep4',
        title: 'The Creator Economy Playbook',
        description: 'Tips from successful creators on making money, growing an audience, and using AI tools to create content faster.',
        source: 'URL: newsletter.example.com',
        duration: '10:30',
        durationSec: 630,
        date: '5 days ago',
        hosts: 'Marcus & Luna',
        coverGradient: 'linear-gradient(135deg, #a8edea, #fed6e3)',
        coverEmoji: '🎨',
    },
    {
        id: 'ep5',
        title: 'Understanding Transformer Architectures',
        description: 'An easy-to-follow explanation of how AI models work — how they read text, learn patterns, and generate answers — using simple everyday comparisons.',
        source: 'Text: AI fundamentals notes',
        duration: '5:20',
        durationSec: 320,
        date: '1 week ago',
        hosts: 'Aria & Marcus',
        coverGradient: 'linear-gradient(135deg, #fbc2eb, #a6c1ee)',
        coverEmoji: '🧠',
    },
];

/* ── Helper ── */
const generateWaveform = (count: number) =>
    Array.from({ length: count }, (_, i) => {
        const val = 0.5 + 0.3 * Math.sin(i * 0.15) + 0.2 * Math.cos(i * 0.3);
        return Math.max(0.15, Math.min(1.0, val));
    });

/* ── Component ── */
export default function PodcastsPage() {
    const [sourceType, setSourceType] = useState<'url' | 'text'>('url');
    const [sourceUrl, setSourceUrl] = useState('');
    const [sourceText, setSourceText] = useState('');
    const [selectedVoices, setSelectedVoices] = useState<string[]>(['aria', 'marcus']);
    const [selectedDuration, setSelectedDuration] = useState('5 min');
    const [isGenerating, setIsGenerating] = useState(false);
    const [episodes, setEpisodes] = useState<PodcastEpisode[]>(SAMPLE_EPISODES);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [playProgress, setPlayProgress] = useState(0);

    const waveformBars = useMemo(() => generateWaveform(120), []);
    const { toast } = useToast();

    // Persistence
    const { creations, isLoading: isLoadingPodcasts, saveCreation } = useCreations('podcasts');

    useEffect(() => {
        if (!isLoadingPodcasts && creations.length > 0) {
            const savedEps: PodcastEpisode[] = creations.map(c => {
                const meta = c.metadata as Record<string, unknown>;
                return {
                    id: c.id,
                    title: c.title,
                    description: (meta.description as string) || '',
                    source: (meta.source as string) || '',
                    duration: (meta.duration as string) || '5:00',
                    durationSec: (meta.durationSec as number) || 300,
                    date: (meta.date as string) || 'Saved',
                    hosts: (meta.hosts as string) || 'AI Host',
                    coverGradient: (meta.coverGradient as string) || 'linear-gradient(135deg, #667eea, #764ba2)',
                    coverEmoji: (meta.coverEmoji as string) || '🎧',
                };
            });
            // Merge saved episodes with defaults
            const timer = setTimeout(() => {
                setEpisodes(prev => {
                    const savedIds = new Set(savedEps.map(e => e.id));
                    const defaultEps = prev.filter(e => !savedIds.has(e.id));
                    return [...savedEps, ...defaultEps];
                });
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isLoadingPodcasts, creations]);

    const toggleVoice = (voiceId: string) => {
        setSelectedVoices(prev => {
            if (prev.includes(voiceId)) {
                if (prev.length === 1) return prev; // keep at least one
                return prev.filter(v => v !== voiceId);
            }
            if (prev.length >= 2) return [prev[1], voiceId]; // max 2
            return [...prev, voiceId];
        });
    };

    const handleGenerate = () => {
        if (isGenerating) return;
        setIsGenerating(true);

        setTimeout(() => {
            const newEp: PodcastEpisode = {
                id: `ep${Date.now()}`,
                title: sourceUrl
                    ? `Deep Dive: ${sourceUrl.replace(/https?:\/\//, '').split('/')[0]}`
                    : 'Custom Episode: ' + (sourceText.slice(0, 40) || 'Untitled'),
                description: 'AI-generated podcast episode from your provided content, featuring an engaging two-host discussion format.',
                source: sourceUrl ? `URL: ${sourceUrl}` : 'Text input',
                duration: selectedDuration.replace(' min', ':00'),
                durationSec: parseInt(selectedDuration) * 60,
                date: 'Just now',
                hosts: selectedVoices.map(v => VOICES.find(vo => vo.id === v)?.name || v).join(' & '),
                coverGradient: `linear-gradient(135deg, hsl(${Math.random() * 360}, 70%, 60%), hsl(${Math.random() * 360}, 70%, 50%))`,
                coverEmoji: ['🎙️', '📻', '🎧', '🎤', '📡'][Math.floor(Math.random() * 5)],
            };
            setEpisodes(prev => [newEp, ...prev]);
            setIsGenerating(false);
            setSourceUrl('');
            setSourceText('');
            // Save to server
            saveCreation({
                title: newEp.title,
                metadata: {
                    description: newEp.description,
                    source: newEp.source,
                    duration: newEp.duration,
                    durationSec: newEp.durationSec,
                    date: newEp.date,
                    hosts: newEp.hosts,
                    coverGradient: newEp.coverGradient,
                    coverEmoji: newEp.coverEmoji,
                },
            });
        }, 3000 + Math.random() * 2000);
    };

    const togglePlay = (episodeId: string) => {
        if (playingId === episodeId) {
            setPlayingId(null);
            setPlayProgress(0);
        } else {
            setPlayingId(episodeId);
            const sum = episodeId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            setPlayProgress((sum % 30) + 15);
        }
    };

    const playingEpisode = episodes.find(ep => ep.id === playingId);

    return (
        <div className="podcast-page animate-fade-in-up">
            {/* ── Controls Panel ── */}
            <div className="podcast-controls">
                <div className="podcast-controls__title">🎙️ AI Podcasts</div>

                {/* Source Input */}
                <div className="podcast-controls__section">
                    <div className="podcast-controls__label">Source Content</div>
                    <div className="podcast-controls__duration-row">
                        <button
                            className={`podcast-controls__duration-opt ${sourceType === 'url' ? 'active' : ''}`}
                            onClick={() => setSourceType('url')}
                        >
                            🔗 URL
                        </button>
                        <button
                            className={`podcast-controls__duration-opt ${sourceType === 'text' ? 'active' : ''}`}
                            onClick={() => setSourceType('text')}
                        >
                            ✏️ Text
                        </button>
                    </div>
                    {sourceType === 'url' ? (
                        <input
                            className="podcast-controls__input"
                            type="url"
                            placeholder="Paste article URL, blog post, or news link..."
                            value={sourceUrl}
                            onChange={e => setSourceUrl(e.target.value)}
                        />
                    ) : (
                        <textarea
                            className="podcast-controls__textarea"
                            placeholder="Paste article text, notes, or any content to convert..."
                            value={sourceText}
                            onChange={e => setSourceText(e.target.value)}
                        />
                    )}
                </div>

                {/* Voices */}
                <div className="podcast-controls__section">
                    <div className="podcast-controls__label">Hosts (Pick 1–2)</div>
                    <div className="podcast-controls__voices">
                        {VOICES.map(voice => (
                            <button
                                key={voice.id}
                                className={`podcast-controls__voice ${selectedVoices.includes(voice.id) ? 'active' : ''}`}
                                onClick={() => toggleVoice(voice.id)}
                            >
                                <div
                                    className="podcast-controls__voice-avatar"
                                    style={{ background: `${voice.color}20`, color: voice.color }}
                                >
                                    {voice.avatar}
                                </div>
                                <div>
                                    <div className="podcast-controls__voice-name">{voice.name}</div>
                                    <div className="podcast-controls__voice-style">{voice.style}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration */}
                <div className="podcast-controls__section">
                    <div className="podcast-controls__label">Episode Length</div>
                    <div className="podcast-controls__duration-row">
                        {DURATIONS.map(d => (
                            <button
                                key={d}
                                className={`podcast-controls__duration-opt ${selectedDuration === d ? 'active' : ''}`}
                                onClick={() => setSelectedDuration(d)}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Generate */}
                <button
                    className="podcast-controls__generate"
                    onClick={handleGenerate}
                    disabled={isGenerating || (!sourceUrl && !sourceText)}
                >
                    {isGenerating ? (
                        <>
                            <span className="podcast-loading__spinner" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                            Generating...
                        </>
                    ) : (
                        <>🎙️ Generate Episode</>
                    )}
                </button>
                <div className="podcast-controls__cost">~300 credits per episode</div>
            </div>

            {/* ── Episodes Library ── */}
            <div className="podcast-library">
                <div className="podcast-library__header">
                    <div className="podcast-library__title">Your Episodes</div>
                    <div className="podcast-library__count">{episodes.length} episodes</div>
                </div>

                {episodes.length === 0 ? (
                    <div className="podcast-empty">
                        <div className="podcast-empty__icon">🎙️</div>
                        <div className="podcast-empty__title">No episodes yet</div>
                        <div className="podcast-empty__desc">
                            Paste a URL or some text on the left and generate your first AI podcast episode.
                        </div>
                    </div>
                ) : (
                    <div className="podcast-library__list">
                        {isGenerating && (
                            <div className="podcast-episode">
                                <div className="podcast-loading" style={{ padding: 'var(--space-5)' }}>
                                    <div className="podcast-loading__spinner" />
                                    <div className="podcast-loading__text">Generating your episode...</div>
                                    <div className="podcast-loading__subtext">
                                        Reading content → Writing script → Recording voices → Mixing audio
                                    </div>
                                </div>
                            </div>
                        )}
                        {episodes.map(ep => (
                            <div key={ep.id} className="podcast-episode">
                                <div className="podcast-episode__main">
                                    <div className="podcast-episode__cover" style={{ background: ep.coverGradient }}>
                                        {ep.coverEmoji}
                                        <div className="podcast-episode__play-overlay" onClick={() => togglePlay(ep.id)}>
                                            <div className="podcast-episode__play-icon">
                                                {playingId === ep.id ? '⏸' : '▶'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="podcast-episode__info">
                                        <div className="podcast-episode__title">{ep.title}</div>
                                        <div className="podcast-episode__description">{ep.description}</div>
                                        <div className="podcast-episode__meta">
                                            <span className="podcast-episode__meta-item">🕒 {ep.duration}</span>
                                            <span className="podcast-episode__meta-item">🎤 {ep.hosts}</span>
                                            <span className="podcast-episode__meta-item">📅 {ep.date}</span>
                                        </div>
                                    </div>
                                    <div className="podcast-episode__actions">
                                        <button className="podcast-episode__action-btn" title="Download" onClick={() => toast(`Download for "${ep.title}" will be available when connected to a real TTS API.`, 'info')}>⬇</button>
                                        <button className="podcast-episode__action-btn" title="Share" onClick={() => { navigator.clipboard.writeText(`https://Clarix.ai/podcasts/${ep.id}`); }}>↗</button>
                                        <button className="podcast-episode__action-btn" title="Transcript" onClick={() => { navigator.clipboard.writeText(`${ep.title}\n\n${ep.description}\n\nHosts: ${ep.hosts}\nDuration: ${ep.duration}`); }}>📝</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Waveform Player */}
                {playingEpisode && (
                    <div className="podcast-player">
                        <div className="podcast-player__waveform">
                            {waveformBars.map((h, i) => (
                                <div
                                    key={i}
                                    className={`podcast-player__bar ${i < waveformBars.length * (playProgress / 100) ? 'podcast-player__bar--played' : 'podcast-player__bar--unplayed'}`}
                                    style={{ height: `${h * 100}%` }}
                                />
                            ))}
                        </div>
                        <div className="podcast-player__controls">
                            <button className="podcast-player__play-btn" onClick={() => togglePlay(playingEpisode.id)}>
                                {playingId ? '⏸' : '▶'}
                            </button>
                            <span className="podcast-player__time">
                                {Math.floor(playingEpisode.durationSec * playProgress / 100 / 60)}:{String(Math.floor(playingEpisode.durationSec * playProgress / 100 % 60)).padStart(2, '0')}
                            </span>
                            <span className="podcast-player__title">{playingEpisode.title}</span>
                            <span className="podcast-player__time">{playingEpisode.duration}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
