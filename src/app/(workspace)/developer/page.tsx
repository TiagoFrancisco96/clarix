'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCreations } from '@/hooks/useCreations';
import './developer.css';

/* ── Types ── */
interface DevMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

const DEV_MODELS = [
    { id: 'deepseek-v4-flash', name: 'DeepSeek V4-Flash', provider: 'DeepSeek', color: '#a78bfa', description: 'Fastest · everyday coding', credits: 1 },
    { id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', color: '#e8915a', description: 'Smart coder · great value', credits: 5 },
    { id: 'gpt-5.5', name: 'GPT-5.5', provider: 'OpenAI', color: '#10a37f', description: 'Thinks deeply · large projects', credits: 15 },
    { id: 'claude-opus-4.7', name: 'Claude Opus 4.7', provider: 'Anthropic', color: '#cc785c', description: 'Best coder · multi-file edits', credits: 15 },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', color: '#4285f4', description: 'Super fast · great for quick tests', credits: 3 },
];

const SUGGESTIONS = [
    'Build a responsive landing page with dark mode',
    'Create a REST API with Express and TypeScript',
    'Make a React todo app with animations',
    'Build a real-time chat with WebSockets',
];

const SAMPLE_CODE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #0a0a0a;
      color: #fafafa;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .hero {
      text-align: center;
      max-width: 600px;
      padding: 2rem;
    }
    .hero h1 {
      font-size: 3rem;
      font-weight: 800;
      background: linear-gradient(135deg, #a78bfa, #60a5fa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 1rem;
    }
    .hero p {
      font-size: 1.1rem;
      color: #a1a1aa;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .btn {
      padding: 0.75rem 2rem;
      background: #8b5cf6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);
    }
  </style>
</head>
<body>
  <div class="hero">
    <h1>Build with AI</h1>
    <p>Generate complete web apps from a single prompt.
       Iterate through conversation. Ship faster.</p>
    <button class="btn">Get Started</button>
  </div>
</body>
</html>`;

/* ── Main Developer Page ── */
export default function DeveloperPage() {
    const [messages, setMessages] = useState<DevMessage[]>([]);
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState('claude-sonnet-4.6');
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
    const [generatedCode, setGeneratedCode] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const modelDropdownRef = useRef<HTMLDivElement>(null);

    const currentModel = DEV_MODELS.find(m => m.id === selectedModel) || DEV_MODELS[0];

    // Persistence
    const { creations, isLoading: isLoadingDev, saveCreation } = useCreations('developer');

    useEffect(() => {
        if (!isLoadingDev && creations.length > 0 && messages.length === 0) {
            const c = creations[0];
            const meta = c.metadata as Record<string, unknown>;
            const timer = setTimeout(() => {
                if (c.content) setGeneratedCode(c.content);
                if (meta.messages) setMessages(meta.messages as DevMessage[]);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [isLoadingDev, creations, messages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
                setShowModelDropdown(false);
            }
        };
        if (showModelDropdown) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showModelDropdown]);

    const handleSend = useCallback(async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || isGenerating) return;

        const now = Date.now();
        const userMsg: DevMessage = {
            id: now.toString(),
            role: 'user',
            content: messageText,
            timestamp: now,
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsGenerating(true);

        try {
            const systemPrompt = `You are an expert web developer. Generate a COMPLETE, single-file HTML page based on the user's request. Include all CSS inline in a <style> tag and all JavaScript inline in a <script> tag. The page should:
- Be responsive and mobile-friendly
- Use a modern, dark theme with beautiful gradients
- Include smooth animations and hover effects
- Use Inter or system-ui fonts
- Be production-quality, not a skeleton
Output ONLY the HTML code starting with <!DOCTYPE html>. No explanations or markdown.`;

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages.map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: messageText },
                    ],
                    model: selectedModel,
                }),
            });

            if (res.status === 402) {
                const aiMsg: DevMessage = { id: (Date.now()).toString(), role: 'assistant', content: 'You\'re out of credits. Please upgrade your plan in Settings → Subscription to continue building.', timestamp: Date.now() };
                setMessages(prev => [...prev, aiMsg]);
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
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'chunk') fullText += data.text;
                            if (data.type === 'done' && data.fullText) fullText = data.fullText;
                        } catch { /* skip */ }
                    }
                }
            }

            // Extract HTML code if wrapped in code fences
            const htmlMatch = fullText.match(/```html?\s*\n([\s\S]*?)```/);
            const code = htmlMatch ? htmlMatch[1].trim() : fullText.trim();
            const isValidHtml = code.includes('<!DOCTYPE') || code.includes('<html') || code.includes('<div');

            const aiMsg: DevMessage = {
                id: (Date.now()).toString(),
                role: 'assistant',
                content: isValidHtml
                    ? `I've generated the code for you. Check the live preview on the right, or switch to the Code tab to view the source. Want me to make any changes?`
                    : fullText,
                timestamp: Date.now(),
            };

            setMessages(prev => {
                const nextMessages = [...prev, aiMsg];
                if (isValidHtml) {
                    setGeneratedCode(code);
                    saveCreation({ title: messageText.slice(0, 80), content: code, metadata: { model: selectedModel, messages: nextMessages } });
                }
                return nextMessages;
            });
        } catch (err) {
            console.error('[Developer] Error:', err);
            const errorMsg: DevMessage = { id: (Date.now()).toString(), role: 'assistant', content: 'Sorry, something went wrong generating the code. Please try again.', timestamp: Date.now() };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsGenerating(false);
        }
    }, [input, isGenerating, selectedModel, messages, saveCreation]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="dev-page">
            {/* Chat Panel */}
            <div className="dev-chat">
                <div className="dev-chat__header">
                    <div className="dev-chat__title">
                        <span className="dev-chat__title-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                        </span>
                        AI Developer
                    </div>
                    <div className="dev-chat__spacer" />
                    {/* Model Selector */}
                    <div className="dev-model-selector" ref={modelDropdownRef}>
                        <button
                            className="dev-model-selector__trigger"
                            onClick={() => setShowModelDropdown(!showModelDropdown)}
                        >
                            <span className="dev-model-selector__dot" style={{ background: currentModel.color }} />
                            {currentModel.name}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                        {showModelDropdown && (
                            <div className="dev-model-selector__dropdown">
                                {DEV_MODELS.map(model => (
                                    <button
                                        key={model.id}
                                        className={`dev-model-selector__option ${selectedModel === model.id ? 'active' : ''}`}
                                        onClick={() => { setSelectedModel(model.id); setShowModelDropdown(false); }}
                                    >
                                        <span className="dev-model-selector__dot" style={{ background: model.color }} />
                                        <span className="dev-model-selector__option-info">
                                            <span className="dev-model-selector__option-name">{model.name}</span>
                                            <span className="dev-model-selector__option-desc">{model.description}</span>
                                        </span>
                                        <span className="dev-model-selector__option-credits">{model.credits}cr</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div className="dev-chat__messages">
                    {messages.length === 0 ? (
                        <div className="dev-chat__empty">
                            <div className="dev-chat__empty-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="16 18 22 12 16 6" />
                                    <polyline points="8 6 2 12 8 18" />
                                    <line x1="14" y1="4" x2="10" y2="20" />
                                </svg>
                            </div>
                            <h3>Build Anything</h3>
                            <p>Describe what you want to build — get working code with a live preview.</p>
                            <div className="dev-chat__suggestions">
                                {SUGGESTIONS.map((s, i) => (
                                    <button
                                        key={i}
                                        className="dev-chat__suggestion"
                                        onClick={() => handleSend(s)}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map(msg => (
                                <div key={msg.id} className="dev-message">
                                    <div className={`dev-message__avatar dev-message__avatar--${msg.role === 'user' ? 'user' : 'ai'}`}
                                        style={msg.role === 'assistant' ? { background: currentModel.color } : undefined}>
                                        {msg.role === 'user' ? 'Y' : 'AI'}
                                    </div>
                                    <div className="dev-message__body">
                                        <div className="dev-message__sender">
                                            {msg.role === 'user' ? 'You' : currentModel.name}
                                        </div>
                                        <div className="dev-message__text">{msg.content}</div>
                                    </div>
                                </div>
                            ))}
                            {isGenerating && (
                                <div className="dev-message">
                                    <div className="dev-message__avatar dev-message__avatar--ai" style={{ background: currentModel.color }}>AI</div>
                                    <div className="dev-message__body">
                                        <div className="dev-message__sender">{currentModel.name}</div>
                                        <div className="dev-chat__spinner" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input */}
                <div className="dev-chat__input-area">
                    <div className="dev-chat__input">
                        <textarea
                            className="dev-chat__input-field"
                            placeholder="Describe what to build or iterate..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                        />
                        <button
                            className="dev-chat__send"
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isGenerating}
                        >
                            {isGenerating ? (
                                <span className="dev-chat__spinner" />
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Panel */}
            <div className="dev-preview">
                <div className="dev-preview__toolbar">
                    <button
                        className={`dev-preview__tab ${activeTab === 'preview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('preview')}
                    >
                        ▶ Preview
                    </button>
                    <button
                        className={`dev-preview__tab ${activeTab === 'code' ? 'active' : ''}`}
                        onClick={() => setActiveTab('code')}
                    >
                        {'</>'} Code
                    </button>
                    <div className="dev-preview__spacer" />
                    {generatedCode && (
                        <>
                            <button className="dev-preview__action" onClick={() => { navigator.clipboard.writeText(generatedCode); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" />
                                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                </svg>
                                Copy
                            </button>
                            <button className="dev-preview__action" onClick={() => { const blob = new Blob([generatedCode], { type: 'text/html' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'generated-page.html'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Export
                            </button>
                        </>
                    )}
                </div>

                <div className="dev-preview__content">
                    {!generatedCode ? (
                        <div className="dev-preview__empty">
                            <div className="dev-preview__empty-icon">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" />
                                    <line x1="8" y1="21" x2="16" y2="21" />
                                    <line x1="12" y1="17" x2="12" y2="21" />
                                </svg>
                            </div>
                            <h3>Live Preview</h3>
                            <p>Your generated code will appear here with a live browser preview.</p>
                        </div>
                    ) : activeTab === 'preview' ? (
                        <iframe
                            className="dev-preview__iframe"
                            srcDoc={generatedCode}
                            title="Live Preview"
                            sandbox="allow-scripts"
                        />
                    ) : (
                        <div className="dev-preview__code">
                            {generatedCode.split('\n').map((line, i) => (
                                <div key={i} className="dev-preview__code-line">
                                    <span className="dev-preview__code-num">{i + 1}</span>
                                    <span>{line}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
