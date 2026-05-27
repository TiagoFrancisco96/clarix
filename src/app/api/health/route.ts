import { NextResponse } from 'next/server';

interface ServiceCheck {
    name: string;
    status: 'ok' | 'error' | 'warning' | 'unconfigured';
    latency?: number;
    message?: string;
    provider?: string;
}

async function checkEndpoint(url: string, opts?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
}): Promise<{ ok: boolean; latency: number; status?: number; error?: string }> {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts?.timeout || 4000);

    try {
        const res = await fetch(url, {
            method: opts?.method || 'GET',
            headers: opts?.headers,
            body: opts?.body,
            signal: controller.signal,
        });
        clearTimeout(timer);
        return { ok: res.ok, latency: Date.now() - start, status: res.status };
    } catch (e) {
        clearTimeout(timer);
        return { ok: false, latency: Date.now() - start, error: (e as Error).message };
    }
}

async function checkOpenAI(): Promise<ServiceCheck> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return { name: 'OpenAI', status: 'unconfigured', message: 'Not configured' };

    const r = await checkEndpoint('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
    });
    return {
        name: 'OpenAI',
        provider: 'GPT-5.5 / GPT Image 2',
        status: r.ok ? 'ok' : 'error',
        latency: r.latency,
        message: r.ok ? 'Operational' : 'Service Issue',
    };
}

async function checkAnthropic(): Promise<ServiceCheck> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return { name: 'Anthropic', status: 'unconfigured', message: 'Not configured' };

    const r = await checkEndpoint('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': key,
            'content-type': 'application/json',
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
        timeout: 6000,
    });
    return {
        name: 'Anthropic',
        provider: 'Claude Opus 4.7 / Sonnet',
        status: r.ok ? 'ok' : (r.status === 401 ? 'error' : r.status === 429 ? 'warning' : 'error'),
        latency: r.latency,
        message: r.ok ? 'Operational' : 'Service Issue',
    };
}

async function checkGoogleAI(): Promise<ServiceCheck> {
    const key = process.env.GOOGLE_AI_API_KEY;
    if (!key) return { name: 'Google AI', status: 'unconfigured', message: 'Not configured' };

    const r = await checkEndpoint(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    return {
        name: 'Google AI',
        provider: 'Gemini 3.1 Pro / Imagen 4',
        status: r.ok ? 'ok' : 'error',
        latency: r.latency,
        message: r.ok ? 'Operational' : 'Service Issue',
    };
}

async function checkFalAI(): Promise<ServiceCheck> {
    const key = process.env.FAL_KEY;
    if (!key) return { name: 'fal.ai', status: 'unconfigured', message: 'Not configured' };

    const r = await checkEndpoint('https://queue.fal.run/fal-ai/fast-sdxl', {
        method: 'POST',
        headers: {
            Authorization: `Key ${key}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: 'test', num_inference_steps: 1, image_size: 'square' }),
        timeout: 4000,
    });
    return {
        name: 'fal.ai',
        provider: 'Kling 3.0 Video / FLUX Schnell',
        status: r.ok || r.status === 200 || r.status === 422 ? 'ok' : 'error',
        latency: r.latency,
        message: r.ok ? 'Operational' : 'Service Issue',
    };
}

async function checkElevenLabsTTS(): Promise<ServiceCheck> {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) return { name: 'ElevenLabs TTS', status: 'unconfigured', message: 'Not configured' };

    const r = await checkEndpoint('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': key },
    });
    return {
        name: 'ElevenLabs TTS',
        provider: 'Voice & Podcasts Generator',
        status: r.ok ? 'ok' : 'error',
        latency: r.latency,
        message: r.ok ? 'Operational' : 'Service Issue',
    };
}

async function checkStripe(): Promise<ServiceCheck> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return { name: 'Stripe', status: 'unconfigured', message: 'Not configured' };

    const r = await checkEndpoint('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${key}` },
    });
    return {
        name: 'Stripe',
        provider: 'Payment Gateway',
        status: r.ok ? 'ok' : 'error',
        latency: r.latency,
        message: r.ok ? 'Operational' : 'Service Issue',
    };
}

async function checkDatabase(): Promise<ServiceCheck> {
    try {
        const DatabaseClass = (await import('better-sqlite3')).default;
        const path = await import('path');
        const dbPath = path.resolve(process.cwd(), './auth.db');
        const db = new DatabaseClass(dbPath, { readonly: true });
        
        // Lightweight query
        db.prepare("SELECT 1").get();
        db.close();
        
        return {
            name: 'Database',
            provider: 'SQLite Local Storage',
            status: 'ok',
            message: 'Operational',
        };
    } catch (e) {
        return {
            name: 'Database',
            provider: 'SQLite Local Storage',
            status: 'error',
            message: (e as Error).message,
        };
    }
}

export async function GET() {
    const [
        openai,
        anthropic,
        googleAI,
        falAI,
        elevenLabs,
        stripe,
        db,
    ] = await Promise.all([
        checkOpenAI(),
        checkAnthropic(),
        checkGoogleAI(),
        checkFalAI(),
        checkElevenLabsTTS(),
        checkStripe(),
        checkDatabase(),
    ]);

    const services = [openai, anthropic, googleAI, falAI, elevenLabs, stripe, db];

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        status: services.every(s => s.status === 'ok' || s.status === 'unconfigured') ? 'all_systems_nominal' : 'partial_outage',
        services,
    });
}
