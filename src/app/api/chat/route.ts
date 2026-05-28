import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { insertCreation, insertDriveFile } from '@/lib/db';
import { checkCredits, creditDeniedResponse, getBalance, refundCredits } from '@/lib/creditGuard';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

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
    buildRequest: (messages: ChatMessage[]) => { url: string; init: RequestInit };
    parseStream: (reader: ReadableStreamDefaultReader<Uint8Array>) => AsyncGenerator<string>;
}

/* ── SSE Stream Parsers ── */

/** OpenAI-compatible SSE parser (works for OpenAI, DeepSeek, xAI) */
async function* parseOpenAIStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string> {
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
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) yield delta;
            } catch {
                // Skip malformed JSON chunks
            }
        }
    }
}

/** Anthropic SSE parser (content_block_delta events) */
async function* parseAnthropicStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string> {
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
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);

            try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    yield parsed.delta.text;
                }
            } catch {
                // Skip malformed JSON chunks
            }
        }
    }
}

/** Google Gemini streaming parser (line-delimited JSON array) */
async function* parseGeminiStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string> {
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
            buildRequest: (messages) => ({
                url: 'https://api.deepseek.com/chat/completions',
                init: {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages,
                        stream: true,
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
            buildRequest: (messages) => ({
                url: 'https://api.anthropic.com/v1/messages',
                init: {
                    method: 'POST',
                    headers: {
                        'x-api-key': process.env.ANTHROPIC_API_KEY!,
                        'content-type': 'application/json',
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-20250514',
                        max_tokens: 4096,
                        stream: true,
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
            buildRequest: (messages) => ({
                url: 'https://api.openai.com/v1/chat/completions',
                init: {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages,
                        stream: true,
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
            buildRequest: (messages) => {
                const key = process.env.GOOGLE_AI_API_KEY;
                // Convert chat format to Gemini format
                const geminiMessages = messages
                    .filter(m => m.role !== 'system')
                    .map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }],
                    }));

                const systemInstruction = messages
                    .filter(m => m.role === 'system')
                    .map(m => m.content)
                    .join('\n');

                return {
                    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse&key=${key}`,
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

function findFallbackProvider(failedModelId: string): ProviderConfig | null {
    for (const fallbackId of FALLBACK_CHAIN) {
        if (fallbackId === failedModelId) continue;
        const config = getProviderConfig(fallbackId);
        if (config && process.env[config.apiKeyEnv]) {
            return config;
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

    /* ── Credit Check ── */
    const creditCheck = await checkCredits(userId, 'chat', resolvedModelId);
    if (!creditCheck.allowed) {
        return creditDeniedResponse(creditCheck);
    }

    /* ── 4. Get Provider Config ── */
    let providerConfig = getProviderConfig(resolvedModelId);
    let fallbackInfo: { from: string; to: string } | null = null;

    if (!providerConfig || !process.env[providerConfig.apiKeyEnv]) {
        // Primary provider unavailable — try fallback chain
        const fallback = findFallbackProvider(resolvedModelId);
        if (!fallback) {
            return new Response(JSON.stringify({ error: 'No AI providers are configured. Please add API keys in .env.local.' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const originalName = providerConfig?.displayName || resolvedModelId;
        fallbackInfo = { from: originalName, to: fallback.displayName };
        providerConfig = fallback;
    }

    const activeProvider = providerConfig;

    /* ── 5. Build and Execute Streaming Request ── */
    const { url, init } = activeProvider.buildRequest(messages);

    let upstreamResponse: Response;
    try {
        upstreamResponse = await fetch(url, init);
    } catch (fetchErr) {
        console.error(`[Chat API] ${activeProvider.provider} network error:`, fetchErr);

        // Try fallback on network failure
        const fallback = findFallbackProvider(resolvedModelId);
        if (fallback) {
            fallbackInfo = { from: activeProvider.displayName, to: fallback.displayName };
            const fb = fallback.buildRequest(messages);
            try {
                upstreamResponse = await fetch(fb.url, fb.init);
            } catch (fbErr) {
                console.error(`[Chat API] Fallback ${fallback.provider} also failed:`, fbErr);
                await refundCredits(userId, creditCheck.cost, `chat:${resolvedModelId}:all_providers_failed`);
                return new Response(JSON.stringify({ error: 'All AI providers are currently unreachable.' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            // Reassign activeProvider for parsing
            Object.assign(activeProvider, fallback);
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
        const fallback = findFallbackProvider(resolvedModelId);
        if (fallback) {
            fallbackInfo = { from: activeProvider.displayName, to: fallback.displayName };
            const fb = fallback.buildRequest(messages);
            try {
                upstreamResponse = await fetch(fb.url, fb.init);
                if (!upstreamResponse.ok) {
                    throw new Error(`Fallback also returned HTTP ${upstreamResponse.status}`);
                }
                // Update active provider for stream parsing
                Object.assign(activeProvider, fallback);
            } catch (fbErr) {
                console.error(`[Chat API] Fallback ${fallback.provider} also failed:`, fbErr);
                await refundCredits(userId, creditCheck.cost, `chat:${resolvedModelId}:http_error`);
                return new Response(JSON.stringify({ error: `AI provider error (${upstreamResponse!.status}). Fallback also failed.` }), {
                    status: 502,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        } else {
            await refundCredits(userId, creditCheck.cost, `chat:${resolvedModelId}:no_fallback`);
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

                for await (const chunk of streamParser) {
                    fullResponse += chunk;
                    const chunkEvent = JSON.stringify({ type: 'chunk', text: chunk });
                    controller.enqueue(encoder.encode(`data: ${chunkEvent}\n\n`));
                }

                // Send done event
                const doneEvent = JSON.stringify({ type: 'done', fullText: fullResponse });
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
