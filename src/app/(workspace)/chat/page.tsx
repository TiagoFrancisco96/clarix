'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAgentById, type AgentDefinition } from '@/lib/agents';
import './chat.css';

/* ── Types ── */
interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model?: string;
    modelColor?: string;
    timestamp: number;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    model: string;
    createdAt: number;
    agentId?: string;
}

type AIModel = {
    id: string;
    name: string;
    provider: string;
    color: string;
    description: string;
};

type AIModelWithStats = AIModel & { 
    priceScore: number;
    codingScore: number;
    visualScore: number;
    creditCost: string;
    isAuto?: boolean;
};

const AI_MODELS: AIModelWithStats[] = [
    { id: 'auto', name: '✨ Smart Pick', provider: 'Clarix', color: '#d4a843', description: 'Automatically picks the best AI for your task', priceScore: 0, codingScore: 0, visualScore: 0, creditCost: '', isAuto: true },
    { id: 'deepseek-v4-flash', name: '⚡ Speed', provider: 'DeepSeek', color: '#a78bfa', description: 'Fastest replies · uses the fewest credits', priceScore: 1, codingScore: 2, visualScore: 1, creditCost: '1 credit' },
    { id: 'gpt-5.4', name: '✍️ Writer', provider: 'OpenAI', color: '#10a37f', description: 'Best for writing, emails & creative work', priceScore: 2, codingScore: 3, visualScore: 3, creditCost: '3 credits' },
    { id: 'claude-sonnet-4.6', name: '💻 Pro', provider: 'Anthropic', color: '#e8915a', description: 'Smartest · coding, analysis & complex tasks', priceScore: 3, codingScore: 5, visualScore: 4, creditCost: '3 credits' },
    { id: 'gemini-3.1-pro', name: '📚 Research', provider: 'Google', color: '#4285f4', description: 'Deep research · reads very long documents', priceScore: 2, codingScore: 3, visualScore: 4, creditCost: '2 credits' },
];

/* ── Smart Auto Router ── */
/* Analyzes what you're asking and picks the best AI for the job */
function autoRouteToModel(userMessage: string): AIModelWithStats {
    const msg = userMessage.toLowerCase();

    // Coding & technical tasks → Pro (Claude Sonnet 4.6)
    const codePatterns = /\b(code|function|bug|error|debug|refactor|typescript|javascript|python|react|css|html|api|class|component|import|export|async|await|const |let |var |console\.|\{\}|=>|\(\)|npm|yarn|git|sql|database|schema|algorithm|regex|compile|architect|codebase|system design|migrate)\b|```/i;
    if (codePatterns.test(msg)) {
        return AI_MODELS.find(m => m.id === 'claude-sonnet-4.6')!;
    }

    // Research & analysis → Research (Gemini 3.1 Pro)
    const researchPatterns = /\b(research|analyze|compare|summarize|review|study|investigate|data|statistics|report|document|paper|article|read this|context|long)\b/i;
    if (researchPatterns.test(msg) && msg.length > 200) {
        return AI_MODELS.find(m => m.id === 'gemini-3.1-pro')!;
    }

    // Writing & creative tasks → Writer (GPT-5.4)
    const writingPatterns = /\b(write|essay|article|blog|story|creative|draft|rewrite|edit|proofread|email|letter|pitch|presentation|speech|copy|tone|style|narrative|explain why|step by step|prove|reason|logic|philosophy|debate|argument|calculate|complex|advanced|deep dive|latest|today|current|news|trending)\b/i;
    if (writingPatterns.test(msg)) {
        return AI_MODELS.find(m => m.id === 'gpt-5.4')!;
    }

    // Quick/simple questions → Speed (DeepSeek V4-Flash)
    if (msg.length < 100) {
        return AI_MODELS.find(m => m.id === 'deepseek-v4-flash')!;
    }

    // Default for everything else → Writer (GPT-5.4)
    return AI_MODELS.find(m => m.id === 'gpt-5.4')!;
}



/* ── Main Chat Page ── */
export default function ChatPage() {
    return (
        <Suspense fallback={<div className="chat-page"><div className="chat-main"><div className="chat-messages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="chat-input__spinner" /></div></div></div>}>
            <ChatPageInner />
        </Suspense>
    );
}

const EMPTY_MESSAGES: Message[] = [];

function ChatPageInner() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('q');
    const agentParam = searchParams.get('agent');

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState<string>('auto');
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [activeAgent, setActiveAgent] = useState<AgentDefinition | null>(null);

    // Load agent from URL param
    useEffect(() => {
        if (agentParam) {
            const agent = getAgentById(agentParam);
            if (agent) {
                setActiveAgent(agent);
            }
        }
    }, [agentParam]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const modelSelectorRef = useRef<HTMLDivElement>(null);

    const activeConversation = conversations.find((c) => c.id === activeConvId);
    const messages = activeConversation?.messages || EMPTY_MESSAGES;

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modelSelectorRef.current && !modelSelectorRef.current.contains(e.target as Node)) {
                setIsModelSelectorOpen(false);
            }
        };
        if (isModelSelectorOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isModelSelectorOpen]);

    // Handle initial query from homepage
    useEffect(() => {
        if (initialQuery) {
            handleSend(initialQuery);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const createNewConversation = useCallback((agent?: AgentDefinition | null): string => {
        const id = `conv-${Date.now()}`;
        const systemMessages: Message[] = [];

        // Inject agent system prompt as hidden first message
        if (agent) {
            systemMessages.push({
                id: `msg-system-${Date.now()}`,
                role: 'system',
                content: agent.systemPrompt,
                timestamp: Date.now(),
            });
        }

        const conv: Conversation = {
            id,
            title: agent ? `${agent.icon} ${agent.name}` : 'New Chat',
            messages: systemMessages,
            model: selectedModel,
            createdAt: Date.now(),
            agentId: agent?.id,
        };
        setConversations((prev) => [conv, ...prev]);
        setActiveConvId(id);
        return id;
    }, [selectedModel]);

    const handleSend = useCallback(
        async (messageText?: string) => {
            const text = (messageText || input).trim();
            if (!text || isGenerating) return;

            // Create conversation if needed
            let convId = activeConvId;
            if (!convId) {
                convId = createNewConversation(activeAgent);
            }

            const userMsg: Message = {
                id: `msg-${Date.now()}`,
                role: 'user',
                content: text,
                timestamp: Date.now(),
            };

            // Add user message
            setConversations((prev) =>
                prev.map((c) => {
                    if (c.id === convId) {
                        const updated = { ...c, messages: [...c.messages, userMsg] };
                        if (c.messages.filter(m => m.role !== 'system').length === 0) {
                            updated.title = text.slice(0, 40) + (text.length > 40 ? '...' : '');
                        }
                        return updated;
                    }
                    return c;
                })
            );

            setInput('');
            setIsGenerating(true);

            // Pre-select model info for the initial placeholder badge
            let initialModelInfo: AIModelWithStats;
            if (selectedModel === 'auto') {
                initialModelInfo = autoRouteToModel(text);
            } else {
                initialModelInfo = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[1];
            }

            const assistantMsgId = `msg-${Date.now() + 1}`;
            const assistantMsg: Message = {
                id: assistantMsgId,
                role: 'assistant',
                content: '',
                model: initialModelInfo.name,
                modelColor: initialModelInfo.color,
                timestamp: Date.now(),
            };

            // Add empty assistant message
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === convId ? { ...c, messages: [...c.messages, assistantMsg] } : c
                )
            );

            try {
                // Build the full message history to send to the API
                const currentConv = conversations.find(c => c.id === convId);
                const apiMessages = [
                    ...(currentConv?.messages || []).map(m => ({ role: m.role, content: m.content })),
                    { role: 'user' as const, content: text },
                ];

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: apiMessages,
                        model: selectedModel,
                        conversationId: convId,
                        agentId: activeAgent?.id,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(errData.error || `HTTP ${response.status}`);
                }

                if (!response.body) throw new Error('No response body');

                // Read the SSE stream
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let sseBuffer = '';
                let streamedContent = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    sseBuffer += decoder.decode(value, { stream: true });
                    const lines = sseBuffer.split('\n');
                    sseBuffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith('data: ')) continue;
                        const data = trimmed.slice(6);

                        try {
                            const event = JSON.parse(data);

                            if (event.type === 'meta') {
                                // Update model badge with actual provider info
                                setConversations((prev) =>
                                    prev.map((c) => {
                                        if (c.id === convId) {
                                            const msgs = [...c.messages];
                                            const lastIdx = msgs.length - 1;
                                            msgs[lastIdx] = {
                                                ...msgs[lastIdx],
                                                model: event.model,
                                                modelColor: event.modelColor,
                                            };
                                            return { ...c, messages: msgs };
                                        }
                                        return c;
                                    })
                                );
                            } else if (event.type === 'chunk') {
                                streamedContent += event.text;
                                const updatedContent = streamedContent;
                                setConversations((prev) =>
                                    prev.map((c) => {
                                        if (c.id === convId) {
                                            const msgs = [...c.messages];
                                            const lastIdx = msgs.length - 1;
                                            msgs[lastIdx] = { ...msgs[lastIdx], content: updatedContent };
                                            return { ...c, messages: msgs };
                                        }
                                        return c;
                                    })
                                );
                            } else if (event.type === 'error') {
                                streamedContent += `\n\n⚠️ ${event.message}`;
                                const errorContent = streamedContent;
                                setConversations((prev) =>
                                    prev.map((c) => {
                                        if (c.id === convId) {
                                            const msgs = [...c.messages];
                                            const lastIdx = msgs.length - 1;
                                            msgs[lastIdx] = { ...msgs[lastIdx], content: errorContent };
                                            return { ...c, messages: msgs };
                                        }
                                        return c;
                                    })
                                );
                            }
                            // 'done' event — stream is complete, no action needed
                        } catch {
                            // Skip malformed SSE events
                        }
                    }
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
                setConversations((prev) =>
                    prev.map((c) => {
                        if (c.id === convId) {
                            const msgs = [...c.messages];
                            const lastIdx = msgs.length - 1;
                            msgs[lastIdx] = {
                                ...msgs[lastIdx],
                                content: `⚠️ **Error:** ${errorMessage}\n\nPlease check your API keys in the server configuration and try again.`,
                            };
                            return { ...c, messages: msgs };
                        }
                        return c;
                    })
                );
            } finally {
                setIsGenerating(false);
            }
        },
        [input, isGenerating, activeConvId, selectedModel, createNewConversation, activeAgent, conversations]
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleNewChat = () => {
        setActiveConvId(null);
        setActiveAgent(null);
        setInput('');
        inputRef.current?.focus();
    };

    const handleClearAgent = () => {
        setActiveAgent(null);
        // Update URL to remove agent param
        window.history.replaceState({}, '', '/chat');
    };

    const selectedModelInfo = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];

    return (
        <div className="chat-page">
            {/* Conversation History Sidebar */}
            <aside className={`chat-history ${showHistory ? 'open' : ''}`}>
                <div className="chat-history__header">
                    <h3>Conversations</h3>
                    <button className="chat-history__new" onClick={handleNewChat} title="New chat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>
                </div>
                <div className="chat-history__list">
                    {conversations.length === 0 ? (
                        <div className="chat-history__empty">
                            <p>No conversations yet</p>
                            <p className="chat-history__empty-sub">Start chatting to create one</p>
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <button
                                key={conv.id}
                                className={`chat-history__item ${conv.id === activeConvId ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveConvId(conv.id);
                                    setShowHistory(false);
                                }}
                            >
                                <span className="chat-history__item-title">{conv.title}</span>
                                <span className="chat-history__item-count">
                                    {conv.messages.length} msgs
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </aside>

            {/* Main Chat Area */}
            <div className="chat-main">
                {/* Chat Header */}
                <div className="chat-header">
                    <button
                        className="chat-header__history-toggle"
                        onClick={() => setShowHistory(!showHistory)}
                        title="Toggle history"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>

                    {/* Model Selector */}
                    <div className="model-selector" ref={modelSelectorRef}>
                        <button
                            className="model-selector__trigger"
                            onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                        >
                            <span
                                className="model-selector__dot"
                                style={{ background: selectedModelInfo.color }}
                            />
                            <span className="model-selector__name">{selectedModelInfo.name}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {isModelSelectorOpen && (
                            <div className="model-selector__dropdown">
                                {AI_MODELS.map((model) => (
                                    <button
                                        key={model.id}
                                        className={`model-selector__option ${model.id === selectedModel ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedModel(model.id);
                                            setIsModelSelectorOpen(false);
                                        }}
                                    >
                                        <span className="model-selector__dot" style={{ background: model.color }} />
                                        <div className="model-selector__option-info">
                                            <span className="model-selector__option-name">{model.name}</span>
                                            {model.isAuto && <span className="model-selector__option-desc">{model.description}</span>}
                                        </div>
                                        <span className="model-selector__option-provider">
                                            {model.isAuto ? '✨ Smart' : model.provider}
                                        </span>

                                        {/* Hover Tooltip with Stats */}
                                        {!model.isAuto && (
                                            <div className="model-selector__tooltip">
                                                <div className="model-selector__tooltip-desc">{model.description}</div>
                                                
                                                <div className="model-selector__tooltip-stats">
                                                    <div className="model-selector__stat">
                                                        <span className="model-selector__stat-label">Price</span>
                                                        <div className="model-selector__stat-bars">
                                                            {[1, 2, 3, 4, 5].map(i => (
                                                                <div key={i} className={`model-selector__stat-bar ${i <= model.priceScore ? 'active' : ''}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="model-selector__stat">
                                                        <span className="model-selector__stat-label">Coding</span>
                                                        <div className="model-selector__stat-bars">
                                                            {[1, 2, 3, 4, 5].map(i => (
                                                                <div key={i} className={`model-selector__stat-bar ${i <= model.codingScore ? 'active' : ''}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="model-selector__stat">
                                                        <span className="model-selector__stat-label">Visual</span>
                                                        <div className="model-selector__stat-bars">
                                                            {[1, 2, 3, 4, 5].map(i => (
                                                                <div key={i} className={`model-selector__stat-bar ${i <= model.visualScore ? 'active' : ''}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="model-selector__tooltip-footer">
                                                    <span className="model-selector__tooltip-title">Cost per message</span>
                                                    <div className="model-selector__tooltip-prices">
                                                        <span>~<span className="highlight">{model.creditCost}</span> per reply</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="chat-header__spacer" />

                    <button className="chat-header__action" onClick={handleNewChat} title="New chat">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                    </button>
                </div>

                {/* Agent Banner */}
                {activeAgent && (
                    <div className="chat-agent-banner">
                        <div className="chat-agent-banner__icon" style={{ background: activeAgent.gradient }}>
                            {activeAgent.icon}
                        </div>
                        <div className="chat-agent-banner__info">
                            <span className="chat-agent-banner__name">{activeAgent.name}</span>
                            <span className="chat-agent-banner__desc">{activeAgent.description}</span>
                        </div>
                        <button className="chat-agent-banner__close" onClick={handleClearAgent} title="Remove agent">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Messages */}
                <div className="chat-messages">
                    {messages.filter(m => m.role !== 'system').length === 0 ? (
                        <div className="chat-empty">
                            <div className="chat-empty__icon">
                                {activeAgent ? (
                                    <div className="chat-empty__agent-icon" style={{ background: activeAgent.gradient }}>
                                        {activeAgent.icon}
                                    </div>
                                ) : (
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                    </svg>
                                )}
                            </div>
                            <h2 className="chat-empty__title">
                                {activeAgent ? `Chat with ${activeAgent.name}` : 'What can I help you with?'}
                            </h2>
                            <p className="chat-empty__desc">
                                {activeAgent
                                    ? activeAgent.description
                                    : <>Chat with the world&apos;s best AI models &mdash; code, write, brainstorm, analyze.</>}
                            </p>
                            <div className="chat-empty__suggestions">
                                {[
                                    'Help me write a compelling pitch for my startup',
                                    'Explain this code and suggest improvements',
                                    'Draft a professional email to reschedule a meeting',
                                    'Compare the pros and cons of remote vs hybrid work',
                                ].map((s) => (
                                    <button
                                        key={s}
                                        className="chat-empty__suggestion"
                                        onClick={() => {
                                            setInput(s);
                                            inputRef.current?.focus();
                                        }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="chat-messages__list">
                            {/* Hide system messages from the chat display */}
                            {messages.filter(m => m.role !== 'system').map((msg) => (
                                <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
                                    <div className="chat-message__avatar">
                                        {msg.role === 'user' ? (
                                            <div className="chat-message__avatar-user">U</div>
                                        ) : (
                                            <div
                                                className="chat-message__avatar-ai"
                                                style={{
                                                    background: `linear-gradient(135deg, ${msg.modelColor || selectedModelInfo.color}, ${msg.modelColor || selectedModelInfo.color}88)`,
                                                }}
                                            >
                                                C
                                            </div>
                                        )}
                                    </div>
                                    <div className="chat-message__body">
                                        <div className="chat-message__header">
                                            <span className="chat-message__sender">
                                                {msg.role === 'user' ? 'You' : msg.model || 'Clarix'}
                                            </span>
                                            {msg.role === 'assistant' && msg.model && (
                                                <span className="chat-message__model-badge" style={{ background: `${msg.modelColor || '#d4a843'}22`, color: msg.modelColor || '#d4a843' }}>
                                                    <span className="chat-message__model-dot" style={{ background: msg.modelColor || '#d4a843' }} />
                                                    {msg.model}
                                                </span>
                                            )}
                                        </div>
                                        <div className="chat-message__content">
                                            <MessageContent content={msg.content} />
                                        </div>
                                        {msg.role === 'assistant' && msg.content && (
                                            <div className="chat-message__actions">
                                                <button className="chat-message__action" title="Copy">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="9" y="9" width="13" height="13" rx="2" />
                                                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                                    </svg>
                                                </button>
                                                <button className="chat-message__action" title="Regenerate">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="23 4 23 10 17 10" />
                                                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isGenerating && messages[messages.length - 1]?.content === '' && (
                                <div className="chat-typing">
                                    <div className="chat-typing__dot" />
                                    <div className="chat-typing__dot" />
                                    <div className="chat-typing__dot" />
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Bar */}
                <div className="chat-input-area">
                    <div className="chat-input">
                        <textarea
                            ref={inputRef}
                            className="chat-input__field"
                            placeholder="Ask anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            disabled={isGenerating}
                        />
                        <div className="chat-input__controls">
                            <button className="chat-input__attach" title="Attach file">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                                </svg>
                            </button>
                            <button
                                className="chat-input__send"
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isGenerating}
                                title="Send message"
                            >
                                {isGenerating ? (
                                    <div className="chat-input__spinner" />
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="chat-input__info">
                        <span>⚡ {selectedModelInfo.isAuto ? 'Smart Pick is on' : selectedModelInfo.name}</span>
                        <span>·</span>
                        <span>{selectedModelInfo.isAuto ? 'Uses fewer credits on simple questions' : `~${selectedModelInfo.creditCost} per reply`}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Safe JSX Markdown parser ── */
function renderInline(text: string): React.ReactNode[] {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((chunk, idx) => {
        if (chunk.startsWith('**') && chunk.endsWith('**')) {
            return <strong key={idx}>{chunk.slice(2, -2)}</strong>;
        }
        if (chunk.startsWith('*') && chunk.endsWith('*')) {
            return <em key={idx}>{chunk.slice(1, -1)}</em>;
        }
        if (chunk.startsWith('`') && chunk.endsWith('`')) {
            return <code key={idx} className="inline-code">{chunk.slice(1, -1)}</code>;
        }
        return chunk;
    });
}

function MessageContent({ content }: { content: string }) {
    if (!content) return null;

    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('```')) {
                    const lines = part.slice(3, -3).split('\n');
                    const language = lines[0]?.trim() || '';
                    const code = lines.slice(language ? 1 : 0).join('\n');
                    return (
                        <div key={i} className="code-block">
                            <div className="code-block__header">
                                <span>{language || 'code'}</span>
                                <button className="code-block__copy" title="Copy code">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" />
                                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                    </svg>
                                </button>
                            </div>
                            <pre className="code-block__code"><code>{code}</code></pre>
                        </div>
                    );
                }

                // Render block items safely
                const lines = part.split('\n');
                return (
                    <div key={i} className="prose">
                        {lines.map((line, lineIdx) => {
                            const trimmed = line.trim();
                            if (trimmed.startsWith('## ')) {
                                return <h3 key={lineIdx}>{renderInline(trimmed.slice(3))}</h3>;
                            }
                            if (trimmed.startsWith('> ')) {
                                return <blockquote key={lineIdx}>{renderInline(trimmed.slice(2))}</blockquote>;
                            }
                            if (trimmed.startsWith('- ')) {
                                return <li key={lineIdx}>{renderInline(trimmed.slice(2))}</li>;
                            }
                            const matchNum = trimmed.match(/^(\d+)\.\s(.*)$/);
                            if (matchNum) {
                                return <li key={lineIdx}>{renderInline(matchNum[2])}</li>;
                            }
                            if (line === '') {
                                return <br key={lineIdx} />;
                            }
                            return <p key={lineIdx}>{renderInline(line)}</p>;
                        })}
                    </div>
                );
            })}
        </>
    );
}
