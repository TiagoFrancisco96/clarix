import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';

/* ── fal.ai model mapping ── */
const FAL_MODEL_MAP: Record<string, { endpoint: string; provider: 'fal' | 'google' | 'openai' | 'runway' }> = {
    'kling-3': {
        endpoint: 'fal-ai/kling-video/o3/pro/text-to-video',
        provider: 'fal',
    },
    'veo-3.1': {
        endpoint: '', // Uses Google AI API directly (not fal.ai)
        provider: 'google',
    },
    'veo-3.1-pro': {
        endpoint: '', // Uses OpenAI API directly (not fal.ai)
        provider: 'openai',
    },
    'runway-gen4.5': {
        endpoint: '', // Uses Runway API directly (not fal.ai)
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

            fal.config({ credentials: falKey });

            const fullPrompt = style && style !== 'Cinematic'
                ? `${style} style: ${prompt}`
                : prompt;

            const result = await fal.subscribe(modelConfig.endpoint, {
                input: {
                    prompt: fullPrompt,
                    duration: parseDuration(duration || '5s'),
                    aspect_ratio: ASPECT_RATIO_MAP[aspectRatio] || '16:9',
                },
                logs: false,
            });

            const data = result.data as Record<string, unknown>;
            const video = data.video as { url: string } | undefined;

            return NextResponse.json({
                success: true,
                videoUrl: video?.url || null,
                model: model,
                provider: 'fal.ai',
                requestId: result.requestId,
            });
        }

        // ── Google Veo 3.1 ──
        if (modelConfig.provider === 'google') {
            // TODO: Implement Veo 3.1 via Google AI API
            return NextResponse.json(
                { error: 'Veo 3.1 integration coming soon — requires Google AI API' },
                { status: 501 }
            );
        }

        // ── OpenAI Veo 3.1 Pro ──
        if (modelConfig.provider === 'openai') {
            // TODO: Implement Veo 3.1 via OpenAI API
            return NextResponse.json(
                { error: 'Veo 3.1 Pro integration coming soon — requires OpenAI API' },
                { status: 501 }
            );
        }

        // ── Runway Gen-4.5 ──
        if (modelConfig.provider === 'runway') {
            // TODO: Implement Runway Gen-4.5 via Runway API
            return NextResponse.json(
                { error: 'Runway Gen-4.5 integration coming soon — requires Runway API key' },
                { status: 501 }
            );
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
