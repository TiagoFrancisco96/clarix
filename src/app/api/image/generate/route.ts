import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { preAuthorize, creditDeniedResponse, getBalance, refundHold, settleFlatRate, type PreAuthResult } from '@/lib/creditGuard';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { getApiKey } from '@/lib/keys';

// Helper function to generate via Fal.ai (Flux)
async function generateViaFal(prompt: string, model: string = 'fal-ai/flux/schnell') {
    const falKey = await getApiKey('FAL_KEY');
    if (!falKey) throw new Error('FAL_KEY missing');
    
    const res = await fetch(`https://fal.run/${model}`, {
        method: 'POST',
        headers: {
            'Authorization': `Key ${falKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
    });

    if (!res.ok) throw new Error(`Fal API Error: ${await res.text()}`);

    const data = await res.json();
    if (data.images && data.images.length > 0) {
        return data.images[0].url;
    }
    throw new Error('Invalid response from Flux via Fal');
}

// Model display names for notifications
const MODEL_NAMES: Record<string, string> = {
    'nano-banana-pro': 'Nano Banana Pro (Imagen 4)',
    'gpt-image-2': 'GPT Image 2 (DALL-E 3)',
    'ideogram-v3': 'Ideogram V3',
    'flux-2-pro': 'FLUX.2 Pro',
    'flux-schnell': 'FLUX Schnell',
};

export async function POST(req: NextRequest) {
    let userId = '';
    let creditHold: PreAuthResult | null = null;
    const genStartTime = Date.now();
    try {
        /* ── Auth Check ── */
        const headersList = await headers();
        const session = await auth.api.getSession({ headers: headersList });
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        userId = session.user.id;

        const body = await req.json();
        const { prompt, model } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (prompt === 'dryRun') {
            return NextResponse.json({ url: '/logo.png', dryRun: true });
        }

        /* ── Rate Limiting ── */
        const userCredits = await getBalance(userId);
        const rateCheck = checkRateLimit(userId, userCredits.plan, 'image');
        if (!rateCheck.allowed) {
            return new NextResponse(JSON.stringify({
                error: 'Too many requests',
                retryAfterSeconds: Math.ceil((rateCheck.retryAfterMs || 60000) / 1000),
            }), { status: 429, headers: { 'Content-Type': 'application/json' } });
        }

        /* ── Credit Pre-Authorization ── */
        creditHold = await preAuthorize(userId, 'image', model || 'flux-schnell');
        if (!creditHold.allowed) {
            return NextResponse.json({
                error: 'Insufficient credits',
                balance: creditHold.balance,
                cost: creditHold.estimatedCost,
                upgrade_url: '/settings?tab=subscription',
            }, { status: 402 });
        }

        let imageUrl = '';
        let fallback: { from: string; to: string; reason: string } | null = null;

        if (model === 'nano-banana-pro') {
            // Google Imagen 3/4 via Gemini API
            try {
                const apiKey = await getApiKey('GOOGLE_AI_API_KEY');
                if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured');

                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        instances: [{ prompt }],
                        parameters: { sampleCount: 1 }
                    })
                });

                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(errText);
                }

                const data = await res.json();
                if (data.predictions && data.predictions.length > 0 && data.predictions[0].bytesBase64Encoded) {
                    imageUrl = `data:image/jpeg;base64,${data.predictions[0].bytesBase64Encoded}`;
                } else {
                    throw new Error('Invalid response from Google AI');
                }
            } catch (err: unknown) {
                const reason = err instanceof Error ? err.message : String(err);
                console.error('Google AI failed. Falling back to Fal.ai (Flux). Error:', reason);
                fallback = {
                    from: MODEL_NAMES['nano-banana-pro'],
                    to: 'FLUX Schnell (Fal.ai)',
                    reason: reason.includes('paid plan') ? 'Google AI requires a paid plan for Imagen' 
                          : reason.includes('API_KEY') ? 'Google AI API key not configured'
                          : `Google AI error: ${reason.substring(0, 120)}`,
                };
                imageUrl = await generateViaFal(prompt);
            }
        } else if (model === 'gpt-image-2') {
            // OpenAI DALL-E 3
            try {
                const apiKey = await getApiKey('OPENAI_API_KEY');
                if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

                const res = await fetch('https://api.openai.com/v1/images/generations', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'dall-e-3',
                        prompt: prompt,
                        n: 1,
                        size: '1024x1024',
                    })
                });

                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(errText);
                }

                const data = await res.json();
                if (data.data && data.data.length > 0) {
                    imageUrl = data.data[0].url;
                } else {
                    throw new Error('Invalid response from OpenAI');
                }
            } catch (err: unknown) {
                const reason = err instanceof Error ? err.message : String(err);
                console.error('OpenAI failed. Falling back to Fal.ai (Flux). Error:', reason);
                fallback = {
                    from: MODEL_NAMES['gpt-image-2'],
                    to: 'FLUX Schnell (Fal.ai)',
                    reason: reason.includes('billing_hard_limit') ? 'OpenAI billing hard limit reached'
                          : reason.includes('API_KEY') ? 'OpenAI API key not configured'
                          : `OpenAI error: ${reason.substring(0, 120)}`,
                };
                imageUrl = await generateViaFal(prompt);
            }
        } else if (model === 'flux-2-pro' || model === 'flux-schnell') {
            // Black Forest Labs (BFL) API via Fal
            const endpoint = model === 'flux-2-pro' ? 'fal-ai/flux-pro/v1.1' : 'fal-ai/flux/schnell';
            imageUrl = await generateViaFal(prompt, endpoint);
        } else if (model === 'ideogram-v3') {
            // Ideogram API
            try {
                const apiKey = await getApiKey('IDEOGRAM_API_KEY');
                if (!apiKey) throw new Error('IDEOGRAM_API_KEY not configured');

                const res = await fetch('https://api.ideogram.ai/generate', {
                    method: 'POST',
                    headers: {
                        'Api-Key': apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        image_request: {
                            prompt,
                            model: 'V_2', 
                            magic_prompt_option: 'AUTO'
                        }
                    })
                });

                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(errText);
                }

                const data = await res.json();
                if (data.data && data.data.length > 0) {
                    imageUrl = data.data[0].url;
                } else {
                    throw new Error('Invalid response from Ideogram');
                }
            } catch (err: unknown) {
                const reason = err instanceof Error ? err.message : String(err);
                console.error('Ideogram failed. Falling back to Fal.ai (Flux). Error:', reason);
                fallback = {
                    from: MODEL_NAMES['ideogram-v3'],
                    to: 'FLUX Schnell (Fal.ai)',
                    reason: reason.includes('API_KEY') ? 'Ideogram API key not configured'
                          : `Ideogram error: ${reason.substring(0, 120)}`,
                };
                imageUrl = await generateViaFal(prompt);
            }
        } else {
            return NextResponse.json({ error: 'Unknown model' }, { status: 400 });
        }

        // Log usage after successful generation
        const durationMs = Date.now() - genStartTime;
        const usedModel = model || 'flux-schnell';
        const providerName = fallback ? 'fal.ai' : (model === 'nano-banana-pro' ? 'Google' : model === 'gpt-image-2' ? 'OpenAI' : model === 'ideogram-v3' ? 'Ideogram' : 'fal.ai');
        await settleFlatRate(userId, 'image', usedModel, providerName, {
            estimatedCost: creditHold?.estimatedCost ?? 0,
            durationMs,
            fallbackFrom: fallback?.from,
            status: 'completed',
        });

        return NextResponse.json({ url: imageUrl, fallback });
    } catch (error) {
        console.error('[Image Generation API Error]', error);
        // Refund credits on total failure
        if (userId && creditHold) {
            await refundHold(userId, creditHold, 'image:internal_error');
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
