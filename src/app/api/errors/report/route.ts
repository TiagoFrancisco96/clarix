import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { logTelemetryError } from '@/lib/db';

// ─── Simple in-memory rate limiter (per IP, per serverless instance) ─────────
// Allows MAX_REQUESTS per WINDOW_MS. Resets on cold-start which is acceptable
// for a telemetry endpoint. For multi-replica deploys, a Redis-backed limiter
// would be better, but this protects against the most common abuse vectors.
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;  // 30 reports per minute per IP

const ipHitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = ipHitMap.get(ip);

    if (!entry || now >= entry.resetAt) {
        ipHitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }

    entry.count++;
    if (entry.count > MAX_REQUESTS) {
        return true;
    }
    return false;
}

// Periodically prune stale entries (runs at most once per minute)
let lastPrune = Date.now();
function pruneStaleEntries() {
    const now = Date.now();
    if (now - lastPrune < WINDOW_MS) return;
    lastPrune = now;
    for (const [ip, entry] of ipHitMap) {
        if (now >= entry.resetAt) ipHitMap.delete(ip);
    }
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        // Rate-limit by client IP
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

        pruneStaleEntries();

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { success: false, error: 'Too many error reports. Please try again later.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { message, stack, severity, component, metadata } = body as {
            message: string;
            stack?: string;
            severity: 'low' | 'medium' | 'high' | 'critical';
            component: 'frontend' | 'backend' | 'e2e';
            metadata?: string;
        };

        if (!message) {
            return NextResponse.json({ error: 'Missing message parameter' }, { status: 400 });
        }

        // Clamp payload sizes to prevent DB bloat from malicious actors
        const clamp = (s: string | undefined, max: number) => s && s.length > max ? s.slice(0, max) + '…[truncated]' : s;

        // Try to resolve the authenticated user if they are logged in
        let userId: string | undefined;
        try {
            const session = await auth.api.getSession({ headers: await headers() });
            if (session?.user) {
                userId = session.user.id;
            }
        } catch {
            // Ignore auth lookup exceptions so telemetry route remains robust under any auth state
        }

        // Persist the telemetry error record in Convex
        const errorId = await logTelemetryError({
            message: clamp(message, 2_000) as string,
            stack: clamp(stack, 8_000),
            severity: severity || 'high',
            component: component || 'frontend',
            metadata: clamp(metadata, 4_000),
            userId,
        });

        return NextResponse.json({ success: true, errorId });
    } catch (err) {
        // Return 500 error but keep it clean and robust
        console.error('Error reporting API crash:', err);
        return NextResponse.json({ 
            success: false, 
            error: (err as Error).message 
        }, { status: 500 });
    }
}
