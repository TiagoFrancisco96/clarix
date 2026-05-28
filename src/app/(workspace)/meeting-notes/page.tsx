'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCreations } from '@/hooks/useCreations';
import './meeting.css';

/* ── Types ── */
interface Utterance {
    speaker: string;
    timestamp: string;
    text: string;
}

interface Transcript {
    id: string;
    filename: string;
    engine: string;
    summary: string;
    actionItems: string[];
    utterances: Utterance[];
    timestamp: number;
}

const STT_ENGINES = [
    { id: 'deepgram', name: 'Clarix Transcribe Pro', color: '#13ef93', description: 'Live transcription · very accurate', credits: 200 },
    { id: 'assemblyai', name: 'Clarix Transcribe Plus', color: '#2563eb', description: 'Knows who is talking · finds key topics', credits: 120 },
    { id: 'whisper', name: 'Clarix Transcribe Multilingual', color: '#10a37f', description: 'Speaks 99 languages · most affordable', credits: 130 },
];

const OUTPUT_OPTIONS = [
    { id: 'summary', label: 'AI Summary', default: true },
    { id: 'actions', label: 'Action Items', default: true },
    { id: 'speakers', label: 'Speaker Diarization', default: true },
    { id: 'sentiment', label: 'Sentiment Analysis', default: false },
    { id: 'topics', label: 'Topic Detection', default: false },
];

const SAMPLE_UTTERANCES: Utterance[] = [
    { speaker: 'Speaker 1', timestamp: '0:00', text: 'Alright, let\'s kick off this sprint planning. We have a lot to cover today.' },
    { speaker: 'Speaker 2', timestamp: '0:15', text: 'Sure. I wanted to talk about the API integration first. We\'re blocked on the authentication flow.' },
    { speaker: 'Speaker 1', timestamp: '0:32', text: 'Good call. What\'s the specific blocker? Is it on our end or the third-party?' },
    { speaker: 'Speaker 3', timestamp: '0:45', text: 'It\'s on their end — their OAuth2 implementation has a non-standard token refresh that doesn\'t match the spec.' },
    { speaker: 'Speaker 2', timestamp: '1:02', text: 'I think we can work around it with a custom interceptor. I\'ll spike on that today.' },
    { speaker: 'Speaker 1', timestamp: '1:18', text: 'Perfect. Let\'s timebox that to 4 hours. If it doesn\'t work, we escalate to their support team.' },
];

/* ── Main Meeting Notes Page ── */
export default function MeetingNotesPage() {
    const [selectedEngine, setSelectedEngine] = useState('deepgram');
    const [uploadedFile, setUploadedFile] = useState<string | null>(null);
    const [meetingUrl, setMeetingUrl] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [enabledOptions, setEnabledOptions] = useState<string[]>(
        OUTPUT_OPTIONS.filter(o => o.default).map(o => o.id)
    );
    const [transcript, setTranscript] = useState<Transcript | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentEngine = STT_ENGINES.find(e => e.id === selectedEngine) || STT_ENGINES[0];

    // Persistence
    const { creations, isLoading: isLoadingNotes, saveCreation } = useCreations('meeting-notes');

    useEffect(() => {
        if (!isLoadingNotes && creations.length > 0 && !transcript) {
            const c = creations[0];
            const meta = c.metadata as Record<string, unknown>;
            const timer = setTimeout(() => {
                setTranscript({
                    id: c.id,
                    filename: c.title,
                    engine: (meta.engine as string) || 'deepgram',
                    summary: (meta.summary as string) || '',
                    actionItems: (meta.actionItems as string[]) || [],
                    utterances: (meta.utterances as Utterance[]) || [],
                    timestamp: new Date(c.created_at).getTime(),
                });
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isLoadingNotes, creations, transcript]);

    const toggleOption = (id: string) => {
        setEnabledOptions(prev =>
            prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
        );
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file.name);
        }
    };

    const handleTranscribe = () => {
        if ((!uploadedFile && !meetingUrl.trim()) || isTranscribing) return;
        setIsTranscribing(true);

        setTimeout(() => {
            const newTranscript: Transcript = {
                id: Date.now().toString(),
                filename: uploadedFile || meetingUrl || 'Recording',
                engine: selectedEngine,
                summary: 'Sprint planning meeting focused on API integration blockers and upcoming feature rollout. The team identified a non-standard OAuth2 implementation from a third-party vendor as the main blocker. A 4-hour spike was agreed upon to build a custom interceptor workaround, with escalation to vendor support as the fallback plan.',
                actionItems: [
                    'Spike on custom OAuth2 interceptor (Speaker 2) — 4 hour timebox',
                    'Escalate to vendor support if spike fails (Speaker 1)',
                    'Update API integration documentation with workaround (Speaker 3)',
                    'Schedule follow-up check-in for EOD (Speaker 1)',
                ],
                utterances: SAMPLE_UTTERANCES,
                timestamp: Date.now(),
            };
            setTranscript(newTranscript);
            setIsTranscribing(false);
            // Save to server
            const textContent = newTranscript.utterances.map(u => `[${u.timestamp}] ${u.speaker}: ${u.text}`).join('\n');
            saveCreation({
                title: newTranscript.filename,
                content: textContent,
                metadata: { engine: selectedEngine, summary: newTranscript.summary, actionItems: newTranscript.actionItems, utterances: newTranscript.utterances },
            });
        }, 3000 + Math.random() * 2000);
    };

    const hasInput = !!uploadedFile || meetingUrl.trim().length > 0;

    return (
        <div className="meeting-page">
            {/* Left Panel */}
            <div className="meeting-left">
                <div className="meeting-left__title">
                    <span className="meeting-left__title-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                            <rect x="8" y="2" width="8" height="4" rx="1" />
                            <line x1="9" y1="12" x2="15" y2="12" />
                            <line x1="9" y1="16" x2="13" y2="16" />
                        </svg>
                    </span>
                    Meeting Notes
                </div>

                {/* Upload */}
                <div className="meeting-left__section">
                    <label className="meeting-left__label">Upload Audio / Video</label>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="audio/*,video/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                    <div
                        className={`meeting-left__upload ${uploadedFile ? 'active' : ''}`}
                        onClick={() => !uploadedFile && fileInputRef.current?.click()}
                    >
                        {uploadedFile ? (
                            <div className="meeting-left__upload-file">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                                {uploadedFile}
                                <button
                                    className="meeting-left__upload-remove"
                                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="meeting-left__upload-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                </div>
                                <span className="meeting-left__upload-text">Drop file or click to upload</span>
                                <span className="meeting-left__upload-sub">MP3, MP4, WAV, M4A, WebM — up to 500MB</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Or paste URL */}
                <div className="meeting-left__section">
                    <label className="meeting-left__label">Or paste meeting URL</label>
                    <input
                        type="url"
                        className="meeting-left__url-input"
                        placeholder="https://zoom.us/rec/... or YouTube URL"
                        value={meetingUrl}
                        onChange={(e) => setMeetingUrl(e.target.value)}
                    />
                </div>

                {/* Or record */}
                <button
                    className={`meeting-left__record ${isRecording ? 'recording' : ''}`}
                    onClick={() => setIsRecording(!isRecording)}
                >
                    <span className="meeting-left__record-dot" />
                    {isRecording ? 'Stop Recording' : 'Record Now'}
                </button>

                {/* Engine Selection */}
                <div className="meeting-left__section">
                    <label className="meeting-left__label">Transcription Engine</label>
                    <div className="meeting-left__engine-list">
                        {STT_ENGINES.map(engine => (
                            <button
                                key={engine.id}
                                className={`meeting-left__engine ${selectedEngine === engine.id ? 'active' : ''}`}
                                onClick={() => setSelectedEngine(engine.id)}
                            >
                                <span className="meeting-left__engine-dot" style={{ background: engine.color }} />
                                <span className="meeting-left__engine-info">
                                    <span className="meeting-left__engine-name">{engine.name}</span>
                                    <span className="meeting-left__engine-desc">{engine.description}</span>
                                </span>
                                <span className="meeting-left__engine-credits">{engine.credits}cr</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Output Options */}
                <div className="meeting-left__section">
                    <label className="meeting-left__label">Include</label>
                    <div className="meeting-left__options">
                        {OUTPUT_OPTIONS.map(opt => (
                            <div
                                key={opt.id}
                                className="meeting-left__option"
                                onClick={() => toggleOption(opt.id)}
                            >
                                <span className={`meeting-left__checkbox ${enabledOptions.includes(opt.id) ? 'checked' : ''}`}>
                                    {enabledOptions.includes(opt.id) && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </span>
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Transcribe Button */}
                <button
                    className="meeting-left__transcribe"
                    onClick={handleTranscribe}
                    disabled={!hasInput || isTranscribing}
                >
                    {isTranscribing ? (
                        <>
                            <span className="meeting-left__spinner" />
                            Transcribing...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                            Transcribe · {currentEngine.credits} credits
                        </>
                    )}
                </button>
            </div>

            {/* Right Panel (Transcript) */}
            <div className="meeting-right">
                {!transcript && !isTranscribing ? (
                    <div className="meeting-right__empty">
                        <div className="meeting-right__empty-icon">
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                                <rect x="8" y="2" width="8" height="4" rx="1" />
                                <line x1="9" y1="12" x2="15" y2="12" />
                                <line x1="9" y1="16" x2="13" y2="16" />
                            </svg>
                        </div>
                        <h3>AI Meeting Notes</h3>
                        <p>Upload audio, paste a URL, or record live — get instant transcripts with AI summaries and action items.</p>
                        <div className="meeting-right__empty-features">
                            <span className="meeting-right__empty-feature">📝 AI Summary</span>
                            <span className="meeting-right__empty-feature">✅ Action Items</span>
                            <span className="meeting-right__empty-feature">👥 Speaker ID</span>
                            <span className="meeting-right__empty-feature">😊 Sentiment</span>
                            <span className="meeting-right__empty-feature">📊 Topics</span>
                        </div>
                    </div>
                ) : isTranscribing ? (
                    <div className="meeting-right__empty">
                        <div className="meeting-left__spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                        <h3>Transcribing...</h3>
                        <p>Processing your audio with {currentEngine.name}. This usually takes 15-30 seconds.</p>
                    </div>
                ) : transcript ? (
                    <div className="meeting-transcript">
                        <div className="meeting-transcript__header">
                            <div>
                                <div className="meeting-transcript__title">{transcript.filename}</div>
                                <div className="meeting-transcript__meta">
                                    {STT_ENGINES.find(s => s.id === transcript.engine)?.name} · {new Date(transcript.timestamp).toLocaleString()}
                                </div>
                            </div>
                            <div className="meeting-transcript__actions">
                                <button className="meeting-transcript__action" onClick={() => { if (!transcript) return; const text = `Meeting Notes: ${transcript.filename}\n${'='.repeat(40)}\n\nSummary:\n${transcript.summary}\n\nAction Items:\n${transcript.actionItems.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nTranscript:\n${transcript.utterances.map(u => `[${u.timestamp}] ${u.speaker}: ${u.text}`).join('\n')}`; const blob = new Blob([text], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `meeting-notes-${Date.now()}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Export
                                </button>
                                <button className="meeting-transcript__action" onClick={() => { if (!transcript) return; const text = `Summary:\n${transcript.summary}\n\nAction Items:\n${transcript.actionItems.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nTranscript:\n${transcript.utterances.map(u => `[${u.timestamp}] ${u.speaker}: ${u.text}`).join('\n')}`; navigator.clipboard.writeText(text); }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                    </svg>
                                    Copy
                                </button>
                            </div>
                        </div>

                        {/* AI Summary */}
                        {enabledOptions.includes('summary') && (
                            <div className="meeting-transcript__summary">
                                <div className="meeting-transcript__summary-title">✨ AI Summary</div>
                                <div className="meeting-transcript__summary-text">{transcript.summary}</div>
                            </div>
                        )}

                        {/* Action Items */}
                        {enabledOptions.includes('actions') && (
                            <div className="meeting-transcript__action-items">
                                <div className="meeting-transcript__action-items-title">✅ Action Items</div>
                                {transcript.actionItems.map((item, i) => (
                                    <div key={i} className="meeting-transcript__action-item">
                                        <span className="meeting-transcript__action-bullet" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Utterances */}
                        <div className="meeting-transcript__utterances">
                            {transcript.utterances.map((u, i) => (
                                <div key={i} className="meeting-transcript__utterance">
                                    <div className="meeting-transcript__speaker">
                                        {u.speaker}
                                        <span className="meeting-transcript__timestamp">{u.timestamp}</span>
                                    </div>
                                    <div className="meeting-transcript__text">{u.text}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
