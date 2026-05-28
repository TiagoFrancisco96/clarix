import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { insertCreation, insertDriveFile } from '@/lib/db';
import { getApiKey } from '@/lib/keys';
import {
    preAuthorize,
    creditDeniedResponse,
    getBalance,
    refundHold,
    settleUsage,
    buildTokenUsage,
    type PreAuthResult,
} from '@/lib/creditGuard';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

/* ── Reasoning System Prompt ── */
const REASONING_SYSTEM_PROMPT = `Before answering, think through your reasoning step-by-step inside <thinking> tags. Show your analysis, considerations, and any calculations. Then provide your final answer outside the tags.

Example:
<thinking>
Let me analyze this step by step...
1. First consideration...
2. Second consideration...
Conclusion: ...
</thinking>

Here is my answer...`;

/* ── Types ── */
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatRequestBody {
    messages: ChatMessage[];
    model: string;
    conversationId?: string;
    agentId?: string;
}

/* ── Model → Provider Mapping ── */
interface ProviderConfig {
    provider: string;
    displayName: string;
    color: string;
    apiKeyEnv: string;
    buildRequest: (messages: ChatMessage[], apiKey: string) => { url: string; init: RequestInit };
    parseStream: (reader: ReadableStreamDefaultReader<Uint8Array>) => AsyncGenerator<string | { __thinking: string } | { __usage: { inputTokens?: number; outputTokens?: number } }>;
}

/* ── SSE Stream Parsers ── */

/** OpenAI-compatible SSE parser (works for OpenAI, DeepSeek, xAI) */
async function* parseOpenAIStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string | { __thinking: string } | { __usage: { inputTokens?: number; outputTokens?: number } }> {
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') return;

            try {
                const parsed = JSON.parse(data);
                // Check for usage chunk (final chunk with stream_options)
                if (parsed.usage && parsed.choices?.length === 0) {
                    yield { __usage: {
                        inputTokens: parsed.usage.prompt_tokens,
                        outputTokens: parsed.usage.completion_tokens,
                    }};
                    continue;
                }
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) yield delta;
            } catch {
                // Skip malformed JSON chunks
            }
        }
    }
}

/** Anthropic SSE parser (content_block_delta events — with thinking support) */
async function* parseAnthropicStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string | { __thinking: string } | { __usage: { inputTokens?: number; outputTokens?: number } }> {
    const decoder = new TextDecoder();
    let buffer = '';
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;
    let currentBlockType: 'text' | 'thinking' | null = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);

            try {
                const parsed = JSON.parse(data);
                // Capture input tokens from message_start
                if (parsed.type === 'message_start' && parsed.message?.usage) {
                    inputTokens = parsed.message.usage.input_tokens;
                }
                // Capture output tokens from message_delta
                if (parsed.type === 'message_delta' && parsed.usage) {
                    outputTokens = parsed.usage.output_tokens;
                    yield { __usage: { inputTokens, outputTokens } };
                }
                // Track content block type (thinking vs text)
                if (parsed.type === 'content_block_start') {
                    currentBlockType = parsed.content_block?.type === 'thinking' ? 'thinking' : 'text';
                }
                if (parsed.type === 'content_block_stop') {
                    currentBlockType = null;
                }
                // Yield thinking content as special type
                if (parsed.type === 'content_block_delta') {
                    if (currentBlockType === 'thinking' && parsed.delta?.thinking) {
                        yield { __thinking: parsed.delta.thinking };
                    } else if (parsed.delta?.text) {
                        yield parsed.delta.text;
                    }
                }
            } catch {
                // Skip malformed JSON chunks
            }
        }
    }
}

/** Google Gemini streaming parser (line-delimited JSON array) */
async function* parseGeminiStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string | { __thinking: string } | { __usage: { inputTokens?: number; outputTokens?: number } }> {
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Gemini streams a JSON array — try to extract text from partial chunks
        // The response comes as chunks of a JSON array: [{...}, {...}, ...]
        // We look for complete JSON objects within the buffer
        let startIdx = buffer.indexOf('{');
        while (startIdx !== -1) {
            let depth = 0;
            let endIdx = -1;

            for (let i = startIdx; i < buffer.length; i++) {
                if (buffer[i] === '{') depth++;
                if (buffer[i] === '}') depth--;
                if (depth === 0) {
                    endIdx = i;
                    break;
                }
            }

            if (endIdx === -1) break; // Incomplete JSON object, wait for more data

            const jsonStr = buffer.substring(startIdx, endIdx + 1);
            buffer = buffer.substring(endIdx + 1);

            try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) yield text;
                // Extract usage metadata from final chunk
                if (parsed.usageMetadata) {
                    yield { __usage: {
                        inputTokens: parsed.usageMetadata.promptTokenCount,
                        outputTokens: parsed.usageMetadata.candidatesTokenCount,
                    }};
                }
            } catch {
                // Skip malformed chunks
            }

            startIdx = buffer.indexOf('{');
        }
    }
}

/* ── Provider Configurations ── */

function getProviderConfig(modelId: string): ProviderConfig | null {
    const providers: Record<string, ProviderConfig> = {
        'deepseek-v4-flash': {
            provider: 'DeepSeek',
            displayName: 'DeepSeek V4-Flash',
            color: '#a78bfa',
            apiKeyEnv: 'DEEPSEEK_API_KEY',
            buildRequest: (messages, apiKey) => ({
                url: 'https://api.deepseek.com/chat/completions',
                init: {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: REASONING_SYSTEM_PROMPT },
                            ...messages,
                        ],
                        stream: true,
                        stream_options: { include_usage: true },
                    }),
                },
            }),
            parseStream: parseOpenAIStream,
        },
        'claude-sonnet-4.6': {
            provider: 'Anthropic',
            displayName: 'Claude Sonnet 4.6',
            color: '#e8915a',
            apiKeyEnv: 'ANTHROPIC_API_KEY',
            buildRequest: (messages, apiKey) => ({
                url: 'https://api.anthropic.com/v1/messages',
                init: {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'content-type': 'application/json',
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-20250514',
                        max_tokens: 16000,
                        stream: true,
                        thinking: {
                            type: 'enabled',
                            budget_tokens: 8000,
                        },
                        system: messages.filter(m => m.role === 'system').map(m => m.content).join('\n') || undefined,
                        messages: messages.filter(m => m.role !== 'system').map(m => ({
                            role: m.role,
                            content: m.content,
                        })),
                    }),
                },
            }),
            parseStream: parseAnthropicStream,
        },

        'gpt-5.4': {
            provider: 'OpenAI',
            displayName: 'GPT-5.4',
            color: '#10a37f',
            apiKeyEnv: 'OPENAI_API_KEY',
            buildRequest: (messages, apiKey) => ({
                url: 'https://api.openai.com/v1/chat/completions',
                init: {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            { role: 'system', content: REASONING_SYSTEM_PROMPT },
                            ...messages,
                        ],
                        stream: true,
                        stream_options: { include_usage: true },
                    }),
                },
            }),
            parseStream: parseOpenAIStream,
        },

        'gemini-3.1-pro': {
            provider: 'Google',
            displayName: 'Gemini 3.1 Pro',
            color: '#4285f4',
            apiKeyEnv: 'GOOGLE_AI_API_KEY',
            buildRequest: (messages, apiKey) => {
                // Convert chat format to Gemini format
                const geminiMessages = messages
                    .filter(m => m.role !== 'system')
                    .map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }],
                    }));

                const systemInstruction = [
                    REASONING_SYSTEM_PROMPT,
                    ...messages
                        .filter(m => m.role === 'system')
                        .map(m => m.content),
                ].join('\n');

                return {
                    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse&key=${apiKey}`,
                    init: {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: geminiMessages,
                            ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
                            generationConfig: {
                                maxOutputTokens: 4096,
                            },
                        }),
                    },
                };
            },
            parseStream: parseGeminiStream,
        },

    };

    return providers[modelId] || null;
}

/* ── Server-side Smart Router (mirrors frontend logic) ── */
function autoRouteModel(lastUserMessage: string): string {
    const msg = lastUserMessage.toLowerCase();

    // Coding & technical → Pro (Claude Sonnet 4.6)
    const codePatterns = /\b(code|function|bug|error|debug|refactor|typescript|javascript|python|react|css|html|api|class|component|import|export|async|await|const |let |var |console\.|npm|yarn|git|sql|database|schema|algorithm|regex|compile|architect|codebase|system design|migrate)\b|```/i;
    if (codePatterns.test(msg)) return 'claude-sonnet-4.6';

    // Research / analysis → Research (Gemini 3.1 Pro)
    const researchPatterns = /\b(research|analyze|compare|summarize|review|study|investigate|data|statistics|report|document|paper|article|read this|context|long)\b/i;
    if (researchPatterns.test(msg) && msg.length > 200) return 'gemini-3.1-pro';

    // Writing & creative → Writer (GPT-5.4)
    const writingPatterns = /\b(write|essay|article|blog|story|creative|draft|rewrite|edit|proofread|email|letter|pitch|presentation|speech|copy|tone|style|narrative|explain why|step by step|reason|logic|debate|calculate|latest|today|news|trending)\b/i;
    if (writingPatterns.test(msg)) return 'gpt-5.4';

    // Quick/simple → Speed (DeepSeek V4-Flash)
    if (msg.length < 100) return 'deepseek-v4-flash';

    return 'gpt-5.4';
}

/* ── Fallback Priority Chain ── */
const FALLBACK_CHAIN = [
    'claude-sonnet-4.6',
    'gpt-5.4',
    'gemini-3.1-pro',
    'deepseek-v4-flash',
];

async function findFallbackProvider(failedModelId: string): Promise<{ config: ProviderConfig; apiKey: string } | null> {
    for (const fallbackId of FALLBACK_CHAIN) {
        if (fallbackId === failedModelId) continue;
        const config = getProviderConfig(fallbackId);
        if (config) {
            const key = await getApiKey(config.apiKeyEnv);
            if (key) {
                return { config, apiKey: key };
            }
        }
    }
    return null;
}

/* ── Main POST Handler ── */
export async function POST(req: NextRequest) {
    /* ── 1. Auth Check ── */
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const userId = session.user.id;

    /* ── 2. Input Validation ── */
    let body: ChatRequestBody;
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const { messages, model, conversationId, agentId } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
        return new Response(JSON.stringify({ error: 'Messages array is required and must not be empty' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (!model || typeof model !== 'string') {
        return new Response(JSON.stringify({ error: 'Model selection is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    /* ── 3. Resolve Model (auto-route or explicit) ── */
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';

    /* ── Dry-run bypass (for E2E testing) ── */
    if (lastUserMsg === 'dryRun') {
        const dryEncoder = new TextEncoder();
        const dryStream = new ReadableStream({
            start(controller) {
                const meta = JSON.stringify({ type: 'meta', model: 'Dry Run', modelColor: '#888888', provider: 'E2E Test', fallback: null });
                controller.enqueue(dryEncoder.encode(`data: ${meta}\n\n`));
                const chunk = JSON.stringify({ type: 'chunk', text: 'Chat API operational.' });
                controller.enqueue(dryEncoder.encode(`data: ${chunk}\n\n`));
                const done = JSON.stringify({ type: 'done', fullText: 'Chat API operational.' });
                controller.enqueue(dryEncoder.encode(`data: ${done}\n\n`));
                controller.close();
            },
        });
        return new Response(dryStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
            },
        });
    }

    /* ── Rate Limiting ── */
    const userCredits = await getBalance(userId);
    const rateCheck = checkRateLimit(userId, userCredits.plan, 'chat');
    if (!rateCheck.allowed) {
        return rateLimitResponse(rateCheck);
    }

    const resolvedModelId = model === 'auto' ? autoRouteModel(lastUserMsg) : model;

    /* ── Credit Pre-Authorization (Phase 1) ── */
    const creditHold = await preAuthorize(userId, 'chat', resolvedModelId);
    if (!creditHold.allowed) {
        return creditDeniedResponse(creditHold);
    }
    const streamStartTime = Date.now();

    /* ── 4. Get Provider Config & API Key ── */
    let providerConfig = getProviderConfig(resolvedModelId);
    let fallbackInfo: { from: string; to: string } | null = null;
    let apiKey = providerConfig ? await getApiKey(providerConfig.apiKeyEnv) : undefined;

    if (!providerConfig || !apiKey) {
        // Primary provider unavailable — try fallback chain
        const fallback = await findFallbackProvider(resolvedModelId);
        if (!fallback) {
            return new Response(JSON.stringify({ error: 'No AI providers are configured. Please add API keys in the admin panel.' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const originalName = providerConfig?.displayName || resolvedModelId;
        fallbackInfo = { from: originalName, to: fallback.config.displayName };
        providerConfig = fallback.config;
        apiKey = fallback.apiKey;
    }

    const activeProvider = providerConfig;

    /* ── 5. Build and Execute Streaming Request ── */
    const { url, init } = activeProvider.buildRequest(messages, apiKey);

    let upstreamResponse: Response;
    try {
        upstreamResponse = await fetch(url, init);
    } catch (fetchErr) {
        console.error(`[Chat API] ${activeProvider.provider} network error:`, fetchErr);


        // Try fallback on network failure
        const fallback = await findFallbackProvider(resolvedModelId);
        if (fallback) {
            fallbackInfo = { from: activeProvider.displayName, to: fallback.config.displayName };
            const fb = fallback.config.buildRequest(messages, fallback.apiKey);
            try {
                upstreamResponse = await fetch(fb.url, fb.init);
            } catch (fbErr) {
                console.error(`[Chat API] Fallback ${fallback.config.provider} also failed:`, fbErr);
                await refundHold(userId, creditHold, `chat:${resolvedModelId}:all_providers_failed`);
                return new Response(JSON.stringify({ error: 'All AI providers are currently unreachable.' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            // Reassign activeProvider for parsing
            Object.assign(activeProvider, fallback.config);
        } else {
            return new Response(JSON.stringify({ error: 'AI provider unreachable and no fallback available.' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }

    if (!upstreamResponse!.ok) {
        const errText = await upstreamResponse!.text().catch(() => 'Unknown error');
        console.error(`[Chat API] ${activeProvider.provider} HTTP ${upstreamResponse!.status}:`, errText);

        // Try fallback on HTTP error
        const fallback = await findFallbackProvider(resolvedModelId);
        if (fallback) {
            fallbackInfo = { from: activeProvider.displayName, to: fallback.config.displayName };
            const fb = fallback.config.buildRequest(messages, fallback.apiKey);
            try {
                upstreamResponse = await fetch(fb.url, fb.init);
                if (!upstreamResponse.ok) {
                    throw new Error(`Fallback also returned HTTP ${upstreamResponse.status}`);
                }
                // Update active provider for stream parsing
                Object.assign(activeProvider, fallback.config);
            } catch (fbErr) {
                console.error(`[Chat API] Fallback ${fallback.config.provider} also failed:`, fbErr);
                await refundHold(userId, creditHold, `chat:${resolvedModelId}:http_error`);
                return new Response(JSON.stringify({ error: `AI provider error (${upstreamResponse!.status}). Fallback also failed.` }), {
                    status: 502,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        } else {
            await refundHold(userId, creditHold, `chat:${resolvedModelId}:no_fallback`);
            return new Response(JSON.stringify({ error: `AI provider returned HTTP ${upstreamResponse!.status}` }), {
                status: 502,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }

    /* ── 6. SSE Streaming Response ── */
    const upstreamBody = upstreamResponse!.body;
    if (!upstreamBody) {
        return new Response(JSON.stringify({ error: 'No response body from AI provider' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const encoder = new TextEncoder();
    let fullResponse = '';
    let providerTokens: { inputTokens?: number; outputTokens?: number } = {};

    const finalProvider = { ...activeProvider };
    const finalFallback = fallbackInfo ? { ...fallbackInfo } : null;

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Send metadata event first
                const metaEvent = JSON.stringify({
                    type: 'meta',
                    model: finalProvider.displayName,
                    modelColor: finalProvider.color,
                    provider: finalProvider.provider,
                    fallback: finalFallback,
                });
                controller.enqueue(encoder.encode(`data: ${metaEvent}\n\n`));

                // Stream content chunks
                const reader = upstreamBody.getReader();
                const streamParser = finalProvider.parseStream(reader);

                let thinkingBuffer = '';
                let insideThinking = false;
                let thinkingContent = '';

                for await (const chunk of streamParser) {
                    // Check if this is a token usage signal from the parser
                    if (typeof chunk === 'object' && '__usage' in chunk) {
                        providerTokens = { ...providerTokens, ...chunk.__usage };
                        continue;
                    }
                    // Check if this is a native thinking block (Anthropic)
                    if (typeof chunk === 'object' && '__thinking' in chunk) {
                        thinkingContent += chunk.__thinking;
                        const thinkEvent = JSON.stringify({ type: 'thinking', text: chunk.__thinking });
                        controller.enqueue(encoder.encode(`data: ${thinkEvent}\n\n`));
                        continue;
                    }

                    // For non-Anthropic providers: parse <thinking> tags from the text stream
                    thinkingBuffer += chunk;

                    // Process the buffer to separate thinking from content
                    while (thinkingBuffer.length > 0) {
                        if (!insideThinking) {
                            const openIdx = thinkingBuffer.indexOf('<thinking>');
                            if (openIdx === -1) {
                                // No thinking tag — emit all as content
                                fullResponse += thinkingBuffer;
                                const chunkEvent = JSON.stringify({ type: 'chunk', text: thinkingBuffer });
                                controller.enqueue(encoder.encode(`data: ${chunkEvent}\n\n`));
                                thinkingBuffer = '';
                            } else {
                                // Emit content before the tag
                                if (openIdx > 0) {
                                    const before = thinkingBuffer.slice(0, openIdx);
                                    fullResponse += before;
                                    const chunkEvent = JSON.stringify({ type: 'chunk', text: before });
                                    controller.enqueue(encoder.encode(`data: ${chunkEvent}\n\n`));
                                }
                                thinkingBuffer = thinkingBuffer.slice(openIdx + '<thinking>'.length);
                                insideThinking = true;
                            }
                        } else {
                            const closeIdx = thinkingBuffer.indexOf('</thinking>');
                            if (closeIdx === -1) {
                                // Still inside thinking — emit as thinking and wait for more
                                if (thinkingBuffer.length > 0) {
                                    thinkingContent += thinkingBuffer;
                                    const thinkEvent = JSON.stringify({ type: 'thinking', text: thinkingBuffer });
                                    controller.enqueue(encoder.encode(`data: ${thinkEvent}\n\n`));
                                }
                                thinkingBuffer = '';
                            } else {
                                // Found closing tag
                                const thinkText = thinkingBuffer.slice(0, closeIdx);
                                if (thinkText.length > 0) {
                                    thinkingContent += thinkText;
                                    const thinkEvent = JSON.stringify({ type: 'thinking', text: thinkText });
                                    controller.enqueue(encoder.encode(`data: ${thinkEvent}\n\n`));
                                }
                                thinkingBuffer = thinkingBuffer.slice(closeIdx + '</thinking>'.length);
                                insideThinking = false;
                            }
                        }
                    }
                }

                // ── Settle credits (Phase 2) ──
                const durationMs = Date.now() - streamStartTime;
                const inputText = messages.map(m => m.content).join(' ');
                const tokens = buildTokenUsage(providerTokens, inputText.length, fullResponse.length);

                const settlement = await settleUsage(userId, {
                    hold: creditHold,
                    tool: 'chat',
                    modelId: resolvedModelId,
                    provider: finalProvider.provider,
                    tokens,
                    durationMs,
                    fallbackFrom: finalFallback?.from,
                    status: 'completed',
                });

                // Send done event with usage metadata
                const doneEvent = JSON.stringify({
                    type: 'done',
                    fullText: fullResponse,
                    usage: {
                        inputTokens: tokens.inputTokens,
                        outputTokens: tokens.outputTokens,
                        cost: settlement.actualCost,
                        tokenSource: tokens.source,
                    },
                });
                controller.enqueue(encoder.encode(`data: ${doneEvent}\n\n`));

                controller.close();

                // ── 7. Post-stream SQL persistence (fire-and-forget) ──
                try {
                    const creationId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                    const driveFileId = `df-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                    const title = lastUserMsg.slice(0, 80) || 'Chat conversation';

                    await insertCreation({
                        id: creationId,
                        user_id: userId,
                        tool: 'chat',
                        title,
                        metadata: JSON.stringify({
                            model: finalProvider.displayName,
                            provider: finalProvider.provider,
                            conversationId: conversationId || null,
                            agentId: agentId || null,
                            fallback: finalFallback,
                            userMessageLength: lastUserMsg.length,
                            responseLength: fullResponse.length,
                        }),
                        content: fullResponse,
                        file_path: null,
                        drive_file_id: driveFileId,
                    });

                    await insertDriveFile({
                        id: driveFileId,
                        user_id: userId,
                        name: `${title}.md`,
                        type: 'document',
                        source: `AI Chat · ${finalProvider.displayName}`,
                        size_bytes: new TextEncoder().encode(
                            `# ${title}\n\n**Model:** ${finalProvider.displayName}\n\n---\n\n## User\n${lastUserMsg}\n\n## Assistant\n${fullResponse}`
                        ).length,
                        mime_type: 'text/markdown',
                        folder: 'documents',
                        is_favorite: 0,
                        disk_path: null,
                    });
                } catch (dbErr) {
                    console.error('[Chat API] Persistence error (non-fatal):', dbErr);
                }
            } catch (streamErr) {
                console.error('[Chat API] Stream error:', streamErr);
                try {
                    const errorEvent = JSON.stringify({
                        type: 'error',
                        message: 'Stream interrupted. The AI provider may have disconnected.',
                    });
                    controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));

                    // Still persist what we got
                    if (fullResponse.length > 0) {
                        const creationId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                        await insertCreation({
                            id: creationId,
                            user_id: userId,
                            tool: 'chat',
                            title: lastUserMsg.slice(0, 80) || 'Chat (interrupted)',
                            metadata: JSON.stringify({
                                model: finalProvider.displayName,
                                provider: finalProvider.provider,
                                interrupted: true,
                                contentPreview: fullResponse.slice(0, 500),
                            }),
                            content: fullResponse,
                            file_path: null,
                            drive_file_id: null,
                        });
                    }
                } catch {
                    // Controller may already be closed
                }
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
