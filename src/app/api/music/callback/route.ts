import { NextRequest, NextResponse } from 'next/server';

/* ── Suno Webhook Callback ──
 *  Receives POST from Suno when a song is ready.
 *  We primarily use polling (/api/music/status), but Suno
 *  requires callBackUrl to be present in the generate request.
 *  This endpoint logs the callback for debugging.
 * ────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('[Music] Suno callback received:', JSON.stringify(body).slice(0, 500));

        // Acknowledge receipt
        return NextResponse.json({ received: true });
    } catch {
        return NextResponse.json({ received: true });
    }
}
