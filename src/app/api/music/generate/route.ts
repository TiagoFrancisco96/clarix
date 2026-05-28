import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { checkCredits, getBalance } from '@/lib/creditGuard';
import { checkRateLimit } from '@/lib/rateLimit';

/* ── Suno Music API ──
 *  POST https://api.sunoapi.org/api/v1/generate
 *  Async — returns a taskId, poll /api/v1/query for result
 *  Full songs with real vocals, instruments, mastering
 * ────────────────────────────────────────────────────────── */

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const SUNO_BASE_URL = 'https://api.sunoapi.org/api/v1';

export async function POST(req: NextRequest) {
    try {
        if (!SUNO_API_KEY) {
            return NextResponse.json({ error: 'SUNO_API_KEY not configured' }, { status: 500 });
        }

        /* ── Auth Check ── */
        const headersList = await headers();
        const session = await auth.api.getSession({ headers: headersList });
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const body = await req.json();
        const { prompt, style, title, instrumental, model } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (prompt === 'dryRun') {
            return NextResponse.json({ taskId: 'dryrun-task-id', message: 'Dry-run generation started', dryRun: true });
        }

        /* ── Rate Limiting ── */
        const userCredits = await getBalance(userId);
        const rateCheck = checkRateLimit(userId, userCredits.plan, 'music');
        if (!rateCheck.allowed) {
            return NextResponse.json({
                error: 'Too many requests',
                retryAfterSeconds: Math.ceil((rateCheck.retryAfterMs || 60000) / 1000),
            }, { status: 429 });
        }

        /* ── Credit Check ── */
        const creditCheck = await checkCredits(userId, 'music', model || 'suno');
        if (!creditCheck.allowed) {
            return NextResponse.json({
                error: 'Insufficient credits',
                balance: creditCheck.balance,
                cost: creditCheck.cost,
                upgrade_url: '/settings?tab=subscription',
            }, { status: 402 });
        }

        // Map frontend model IDs to Suno model versions
        // Valid: V5_5, V5, V4_5PLUS, V4_5ALL, V4_5, V4
        const modelVersion = model === 'suno' ? 'V4_5' : model === 'udio' ? 'V4' : 'V4';

        // Build request body — use custom mode for more control
        // callBackUrl is required by sunoapi.org even if we poll
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clarix.ai';
        const sunoBody: Record<string, unknown> = {
            prompt: prompt,
            style: style || 'pop',
            title: title || prompt.slice(0, 60),
            instrumental: instrumental ?? false,
            model: modelVersion,
            customMode: true,
            callBackUrl: `${appUrl}/api/music/callback`,
        };

        console.log('[Music] Generating via Suno:', { title: sunoBody.title, style: sunoBody.style, model: modelVersion });

        const response = await fetch(`${SUNO_BASE_URL}/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUNO_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sunoBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Music] Suno API error:', response.status, errorText);
            return NextResponse.json(
                { error: `Suno API error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Suno returns { code: 200, data: { taskId: "..." } }
        if (data.code !== 200 && data.code !== 0 && !data.data?.taskId && !data.data?.task_id) {
            console.error('[Music] Suno non-success response:', data);
            return NextResponse.json(
                { error: 'Suno API returned an error', details: data },
                { status: 502 }
            );
        }

        const taskId = data.data?.taskId || data.data?.task_id;
        console.log('[Music] Suno generation started, taskId:', taskId);

        return NextResponse.json({
            taskId,
            message: 'Generation started',
        });
    } catch (error) {
        console.error('[Music] Generation exception:', error);
        return NextResponse.json(
            { error: 'Failed to start music generation' },
            { status: 500 }
        );
    }
}
