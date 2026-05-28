import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getApiKey } from '@/lib/keys';

/* ── Types ── */
interface ServiceCheck {
    name: string;
    status: 'ok' | 'error' | 'warning' | 'unconfigured';
    latency?: number;
    message?: string;
    provider?: string;
}

interface EnvCheck {
    name: string;
    set: boolean;
    masked: string;
    category: string;
}

interface DbCheck {
    name: string;
    status: 'ok' | 'error';
    rowCount?: number;
    message?: string;
}

/* ── Helpers ── */
function mask(val: string | undefined): string {
    if (!val) return '(not set)';
    return '••••••••';
}

async function checkEndpoint(url: string, opts?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
}): Promise<{ ok: boolean; latency: number; status?: number; error?: string }> {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts?.timeout || 5000);

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

/* ── Service checks ── */
async function checkOpenAI(): Promise<ServiceCheck> {
    const key = await getApiKey('OPENAI_API_KEY');
    if (!key) return { name: 'OpenAI', status: 'unconfigured', message: 'OPENAI_API_KEY not set' };

    const r = await checkEndpoint('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
    });
    return {
        name: 'OpenAI',
        provider: 'GPT-5.5 / GPT Image 2',
        status: r.ok ? 'ok' : 'error',
        latency: r.latency,
        message: r.ok ? `${r.status}` : (r.error || `HTTP ${r.status}`),
    };
}

async function checkAnthropic(): Promise<ServiceCheck> {
    const key = await getApiKey('ANTHROPIC_API_KEY');
    if (!key) return { name: 'Anthropic', status: 'unconfigured', message: 'ANTHROPIC_API_KEY not set' };

    // Anthropic doesn't have a lightweight health endpoint, so we just check connectivity
    const r = await checkEndpoint('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': key,
            'content-type': 'application/json',
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
        timeout: 8000,
    });
    return {
        name: 'Anthropic',
        provider: 'Claude Opus 4.7 / Sonnet',
        status: r.ok ? 'ok' : (r.status === 401 ? 'error' : r.status === 429 ? 'warning' : 'error'),
        latency: r.latency,
        message: r.ok ? 'Connected' : (r.error || `HTTP ${r.status}`),
    };
}

async function checkGoogleAI(): Promise<ServiceCheck> {
    const key = await getApiKey('GOOGLE_AI_API_KEY');
    if (!key) return { name: 'Google AI', status: 'unconfigured', message: 'GOOGLE_AI_API_KEY not set' };

    const r = await checkEndpoint(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    return {
        name: 'Google AI',
        provider: 'Gemini 2.5 Pro',
        status: r.ok ? 'ok' : 'error',
        latency: r.latency,
        message: r.ok ? 'Connected' : (r.error || `HTTP ${r.status}`),
    };
}

async function checkFalAI(): Promise<ServiceCheck> {
    const key = await getApiKey('FAL_KEY');
    if (!key) return { name: 'fal.ai', status: 'unconfigured', message: 'FAL_KEY not set' };

    // Check fal.ai status page (lightweight)
    const r = await checkEndpoint('https://queue.fal.run/fal-ai/fast-sdxl', {
        method: 'POST',
        headers: {
            Authorization: `Key ${key}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: 'test', num_inference_steps: 1, image_size: 'square' }),
        timeout: 5000,
    });
    return {
        name: 'fal.ai',
        provider: 'Kling 3.0 Video',
        status: r.ok || r.status === 200 || r.status === 422 ? 'ok' : 'error',
        latency: r.latency,
        message: r.ok ? 'Connected' : (r.error || `HTTP ${r.status}`),
    };
}

async function checkElevenLabsMusic(): Promise<ServiceCheck> {
    const key = await getApiKey('ELEVENLABS_API_KEY');
    if (!key) return { name: 'ElevenLabs Music', status: 'unconfigured', message: 'ELEVENLABS_API_KEY not set' };

    // Verify via user endpoint (same key as TTS — music is included)
    const r = await checkEndpoint('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': key },
    });
    return {
        name: 'ElevenLabs Music',
        provider: 'Music Generation (v1/music)',
        status: r.ok ? 'ok' : 'error',
        latency: r.latency,
        message: r.ok ? 'Connected' : (r.error || `HTTP ${r.status}`),
    };
}

async function checkElevenLabsTTS(): Promise<ServiceCheck> {
    const key = await getApiKey('ELEVENLABS_API_KEY');
    if (!key) return { name: 'ElevenLabs TTS', status: 'unconfigured', message: 'ELEVENLABS_API_KEY not set' };

    const r = await checkEndpoint('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': key },
    });
    return {
        name: 'ElevenLabs TTS',
        provider: 'Text-to-Speech',
        status: r.ok ? 'ok' : 'error',
        latency: r.latency,
        message: r.ok ? 'Connected' : (r.error || `HTTP ${r.status}`),
    };
}

async function checkStripe(): Promise<ServiceCheck> {
    const key = await getApiKey('STRIPE_SECRET_KEY');
    if (!key) return { name: 'Stripe', status: 'unconfigured', message: 'STRIPE_SECRET_KEY not set' };

    const r = await checkEndpoint('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${key}` },
    });
    return {
        name: 'Stripe',
        provider: 'Payments',
        status: r.ok ? 'ok' : 'error',
        latency: r.latency,
        message: r.ok ? 'Connected' : (r.error || `HTTP ${r.status}`),
    };
}

async function checkDatabase(): Promise<DbCheck[]> {
    const checks: DbCheck[] = [];

    try {
        const { ConvexHttpClient } = await import("convex/browser");
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!convexUrl) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
        
        const r = await fetch(convexUrl + "/version");
        if (!r.ok) throw new Error("Convex ping failed");

        checks.push({
            name: 'Convex Database',
            status: 'ok',
            rowCount: 1,
        });
    } catch (e) {
        checks.push({
            name: 'database',
            status: 'error',
            message: (e as Error).message,
        });
    }

    return checks;
}

/* ── Main handler ── */
export async function GET() {
    // Auth check — only logged-in admin users
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
        const allowedAdmins = [
            adminEmail.toLowerCase(),
            "tiago@clarix.ai",
            "admin@clarix.ai",
            "tiagofrancisco96@gmail.com",
            "legal@clarix.ai"
        ];
        
        if (!allowedAdmins.includes(session.user.email.toLowerCase())) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ error: 'Auth check failed' }, { status: 401 });
    }

    // Run all checks in parallel
    const [
        openai,
        anthropic,
        googleAI,
        falAI,
        elevenLabsMusic,
        elevenLabsTTS,
        stripe,
        dbChecks,
    ] = await Promise.all([
        checkOpenAI(),
        checkAnthropic(),
        checkGoogleAI(),
        checkFalAI(),
        checkElevenLabsMusic(),
        checkElevenLabsTTS(),
        checkStripe(),
        checkDatabase(),
    ]);

    const services: ServiceCheck[] = [openai, anthropic, googleAI, falAI, elevenLabsMusic, elevenLabsTTS, stripe];

    // Environment variable check
    const varConfigs = [
        { name: 'OPENAI_API_KEY', category: 'LLM' },
        { name: 'ANTHROPIC_API_KEY', category: 'LLM' },
        { name: 'GOOGLE_AI_API_KEY', category: 'LLM' },
        { name: 'XAI_API_KEY', category: 'LLM' },
        { name: 'DEEPSEEK_API_KEY', category: 'LLM' },
        { name: 'TOGETHER_API_KEY', category: 'LLM' },
        { name: 'FAL_KEY', category: 'Media' },
        { name: 'SUNO_API_KEY', category: 'Media' },
        { name: 'ELEVENLABS_API_KEY', category: 'Media' },
        { name: 'DEEPGRAM_API_KEY', category: 'Media' },
        { name: 'IDEOGRAM_API_KEY', category: 'Image' },
        { name: 'BFL_API_KEY', category: 'Image' },
        { name: 'RUNWAY_API_KEY', category: 'Video' },
        { name: 'AUTH_GOOGLE_ID', category: 'Auth' },
        { name: 'AUTH_GOOGLE_SECRET', category: 'Auth' },
        { name: 'BETTER_AUTH_SECRET', category: 'Auth' },
        { name: 'STRIPE_SECRET_KEY', category: 'Payments' },
        { name: 'STRIPE_PUBLISHABLE_KEY', category: 'Payments' },
        { name: 'STRIPE_WEBHOOK_SECRET', category: 'Payments' },
    ];
    
    const envVars: EnvCheck[] = [];
    for (const vConfig of varConfigs) {
        const val = await getApiKey(vConfig.name);
        envVars.push({
            name: vConfig.name,
            set: !!val,
            masked: mask(val),
            category: vConfig.category,
        });
    }

    // Resolve feature statuses using resolved keys
    const openaiKey = await getApiKey('OPENAI_API_KEY');
    const falKey = await getApiKey('FAL_KEY');
    const elevenlabsKey = await getApiKey('ELEVENLABS_API_KEY');
    const deepgramKey = await getApiKey('DEEPGRAM_API_KEY');
    const betterAuthSecret = await getApiKey('BETTER_AUTH_SECRET');
    const authGoogleId = await getApiKey('AUTH_GOOGLE_ID');
    const stripeSecretKey = await getApiKey('STRIPE_SECRET_KEY');

    const features = [
        { name: 'Chat (AI)', route: '/chat', status: !!openaiKey ? 'ready' : 'blocked', deps: ['OPENAI_API_KEY'], category: 'Create' },
        { name: 'Image Generation', route: '/image', status: !!falKey ? 'ready' : 'blocked', deps: ['FAL_KEY', 'IDEOGRAM_API_KEY', 'BFL_API_KEY'], category: 'Create' },
        { name: 'Video Generation', route: '/video', status: !!falKey ? 'ready' : 'blocked', deps: ['FAL_KEY'], category: 'Media' },
        { name: 'Music Generation', route: '/music', status: !!elevenlabsKey ? 'ready' : 'blocked', deps: ['ELEVENLABS_API_KEY'], category: 'Media' },
        { name: 'Docs Editor', route: '/docs', status: 'ready', deps: ['OPENAI_API_KEY'], category: 'Create' },
        { name: 'Slides Editor', route: '/slides', status: 'ready', deps: ['OPENAI_API_KEY'], category: 'Create' },
        { name: 'Sheets Editor', route: '/sheets', status: 'ready', deps: ['OPENAI_API_KEY'], category: 'Create' },
        { name: 'AI Search', route: '/search', status: !!openaiKey ? 'ready' : 'blocked', deps: ['OPENAI_API_KEY'], category: 'Research' },
        { name: 'Podcasts', route: '/podcasts', status: !!elevenlabsKey ? 'ready' : 'blocked', deps: ['ELEVENLABS_API_KEY'], category: 'Research' },
        { name: 'Developer IDE', route: '/developer', status: 'ready', deps: ['OPENAI_API_KEY'], category: 'Build' },
        { name: 'Designer', route: '/designer', status: 'ready', deps: ['OPENAI_API_KEY'], category: 'Build' },
        { name: 'Meeting Notes', route: '/meeting-notes', status: !!deepgramKey ? 'ready' : 'blocked', deps: ['DEEPGRAM_API_KEY'], category: 'Media' },
        { name: 'Agents Marketplace', route: '/agents', status: 'ready', deps: [], category: 'Agents' },
        { name: 'Drive', route: '/drive', status: 'ready', deps: [], category: 'Workspace' },
        { name: 'Inbox / Notifications', route: '/inbox', status: 'ready', deps: [], category: 'Workspace' },
        { name: 'Settings', route: '/settings', status: 'ready', deps: [], category: 'Workspace' },
        { name: 'Auth (Email + Password)', route: '/login', status: !!betterAuthSecret ? 'ready' : 'blocked', deps: ['BETTER_AUTH_SECRET'], category: 'Auth' },
        { name: 'Auth (Google OAuth)', route: '/login', status: !!authGoogleId ? 'ready' : 'blocked', deps: ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'], category: 'Auth' },
        { name: 'Stripe Payments', route: '/settings', status: !!stripeSecretKey ? 'ready' : 'blocked', deps: ['STRIPE_SECRET_KEY'], category: 'Payments' },
    ];

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        services,
        envVars,
        database: dbChecks,
        features,
    });
}
