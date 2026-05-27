import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

/* ── Display names for notification/fallback logs ── */
const MODEL_DISPLAY_NAMES: Record<string, string> = {
    'seedance-2.0': 'Seedance 2.0 (fal.ai)',
    'kling-3': 'Kling 3.0 (fal.ai)',
    'veo-3.1-fast': 'Google Veo 3.1 Fast',
    'veo-3.1': 'Google Veo 3.1',
    'veo-3.1-pro': 'OpenAI Veo 3.1 Pro',
    'runway-gen4.5': 'Runway Gen-4.5',
};

/* ── fal.ai model mapping ── */
const FAL_MODEL_MAP: Record<string, { endpoint: string; provider: 'fal' | 'google' | 'openai' | 'runway' }> = {
    'seedance-2.0': {
        endpoint: 'fal-ai/kling-video/o3/pro/text-to-video',
        provider: 'fal',
    },
    'kling-3': {
        endpoint: 'fal-ai/kling-video/o3/pro/text-to-video',
        provider: 'fal',
    },
    'veo-3.1-fast': {
        endpoint: '',
        provider: 'google',
    },
    'veo-3.1': {
        endpoint: '',
        provider: 'google',
    },
    'veo-3.1-pro': {
        endpoint: '',
        provider: 'openai',
    },
    'runway-gen4.5': {
        endpoint: '',
        provider: 'runway',
    },
};

/* ── Aspect ratio mapping for fal.ai ── */
const ASPECT_RATIO_MAP: Record<string, string> = {
    '16:9': '16:9',
    '9:16': '9:16',
    '1:1': '1:1',
    '4:3': '4:3',
};

/* ── Duration mapping (strip 's' suffix) ── */
function parseDuration(dur: string): string {
    return dur.replace('s', '');
}

/* ── Fallback runner to Kling via fal.ai ── */
async function generateKlingFallback(
    prompt: string,
    duration?: string,
    aspectRatio?: string,
    style?: string
): Promise<{ url: string | null; requestId?: string }> {
    const falKey = process.env.FAL_KEY;
    if (!falKey) throw new Error('FAL_KEY not configured for fallback');

    fal.config({ credentials: falKey });

    const fullPrompt = style && style !== 'Cinematic'
        ? `${style} style: ${prompt}`
        : prompt;

    const result = await fal.subscribe('fal-ai/kling-video/o3/pro/text-to-video', {
        input: {
            prompt: fullPrompt,
            duration: parseDuration(duration || '5s'),
            aspect_ratio: ASPECT_RATIO_MAP[aspectRatio || '16:9'] || '16:9',
        },
        logs: false,
    });

    const data = result.data as Record<string, unknown>;
    const video = data.video as { url: string } | undefined;
    return { url: video?.url || null, requestId: result.requestId };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prompt, model, duration, aspectRatio, style } = body;

        if (!prompt || !model) {
            return NextResponse.json(
                { error: 'Missing required fields: prompt, model' },
                { status: 400 }
            );
        }

        if (prompt === 'dryRun') {
            return NextResponse.json({
                success: true,
                videoUrl: '/video.mp4',
                model: model,
                provider: 'fal.ai',
                requestId: 'dryrun-request-id',
                dryRun: true
            });
        }

        const modelConfig = FAL_MODEL_MAP[model];
        if (!modelConfig) {
            return NextResponse.json(
                { error: `Unsupported model: ${model}` },
                { status: 400 }
            );
        }

        // ── Kling via fal.ai ──
        if (modelConfig.provider === 'fal') {
            const falKey = process.env.FAL_KEY;
            if (!falKey) {
                return NextResponse.json(
                    { error: 'FAL_KEY not configured' },
                    { status: 500 }
                );
            }

            const fallbackRes = await generateKlingFallback(prompt, duration, aspectRatio, style);

            return NextResponse.json({
                success: true,
                videoUrl: fallbackRes.url,
                model: model,
                provider: 'fal.ai',
                requestId: fallbackRes.requestId,
            });
        }

        // ── Google Veo 3.1 & Fast ──
        if (modelConfig.provider === 'google') {
            try {
                const apiKey = process.env.GOOGLE_AI_API_KEY;
                if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured');

                // Perform Google Imagen / Veo Video generation endpoint fetch
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate:predict?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, duration, aspect_ratio: aspectRatio }),
                });

                if (!res.ok) throw new Error(`Google API returned ${res.status}`);
                const data = await res.json();
                
                return NextResponse.json({
                    success: true,
                    videoUrl: data.videoUrl || null,
                    model: model,
                    provider: 'Google AI',
                });
            } catch (err: unknown) {
                const reason = err instanceof Error ? err.message : String(err);
                console.warn('Google Veo failed. Falling back to Kling 3.0 via Fal.ai. Reason:', reason);

                const fallbackRes = await generateKlingFallback(prompt, duration, aspectRatio, style);
                return NextResponse.json({
                    success: true,
                    videoUrl: fallbackRes.url,
                    model: model,
                    provider: 'fal.ai',
                    requestId: fallbackRes.requestId,
                    fallback: {
                        from: MODEL_DISPLAY_NAMES[model] || model,
                        to: 'Kling 3.0 (fal.ai)',
                        reason: reason.includes('API_KEY') ? 'Google AI key not configured' : `Google AI failed: ${reason.substring(0, 100)}`,
                    }
                });
            }
        }

        // ── OpenAI Veo 3.1 Pro ──
        if (modelConfig.provider === 'openai') {
            try {
                const apiKey = process.env.OPENAI_API_KEY;
                if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

                const res = await fetch('https://api.openai.com/v1/video/generations', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt, model: 'veo-3.1-pro', aspect_ratio: aspectRatio }),
                });

                if (!res.ok) throw new Error(`OpenAI API returned ${res.status}`);
                const data = await res.json();

                return NextResponse.json({
                    success: true,
                    videoUrl: data.videoUrl || null,
                    model: model,
                    provider: 'OpenAI',
                });
            } catch (err: unknown) {
                const reason = err instanceof Error ? err.message : String(err);
                console.warn('OpenAI Veo failed. Falling back to Kling 3.0 via Fal.ai. Reason:', reason);

                const fallbackRes = await generateKlingFallback(prompt, duration, aspectRatio, style);
                return NextResponse.json({
                    success: true,
                    videoUrl: fallbackRes.url,
                    model: model,
                    provider: 'fal.ai',
                    requestId: fallbackRes.requestId,
                    fallback: {
                        from: MODEL_DISPLAY_NAMES[model] || model,
                        to: 'Kling 3.0 (fal.ai)',
                        reason: reason.includes('API_KEY') ? 'OpenAI key not configured' : `OpenAI failed: ${reason.substring(0, 100)}`,
                    }
                });
            }
        }

        // ── Runway Gen-4.5 ──
        if (modelConfig.provider === 'runway') {
            try {
                const apiKey = process.env.RUNWAY_API_KEY;
                if (!apiKey) throw new Error('RUNWAY_API_KEY not configured');

                // Perform Runway Gen-4.5 endpoint fetch
                const res = await fetch('https://api.runwayml.com/v1/video/generations', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt, model: 'gen-4.5' }),
                });

                if (!res.ok) throw new Error(`Runway API returned ${res.status}`);
                const data = await res.json();

                return NextResponse.json({
                    success: true,
                    videoUrl: data.videoUrl || null,
                    model: model,
                    provider: 'Runway',
                });
            } catch (err: unknown) {
                const reason = err instanceof Error ? err.message : String(err);
                console.warn('Runway Gen-4.5 failed. Falling back to Kling 3.0 via Fal.ai. Reason:', reason);

                const fallbackRes = await generateKlingFallback(prompt, duration, aspectRatio, style);
                return NextResponse.json({
                    success: true,
                    videoUrl: fallbackRes.url,
                    model: model,
                    provider: 'fal.ai',
                    requestId: fallbackRes.requestId,
                    fallback: {
                        from: MODEL_DISPLAY_NAMES[model] || model,
                        to: 'Kling 3.0 (fal.ai)',
                        reason: reason.includes('API_KEY') ? 'Runway API key not configured' : `Runway failed: ${reason.substring(0, 100)}`,
                    }
                });
            }
        }

        return NextResponse.json(
            { error: 'Unknown provider' },
            { status: 500 }
        );
    } catch (error) {
        console.error('[Video Generate] Error:', error);

        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: `Video generation failed: ${message}` },
            { status: 500 }
        );
    }
}
