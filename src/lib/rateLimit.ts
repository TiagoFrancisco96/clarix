/**
 * In-Memory Sliding Window Rate Limiter
 *
 * No Redis needed — works perfectly for single-instance deployments.
 * For multi-instance, upgrade to Redis-based rate limiting.
 */

interface RateWindow {
    timestamps: number[];
}

const windows = new Map<string, RateWindow>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
    const cutoff = Date.now() - 3600_000; // 1 hour ago
    for (const [key, window] of windows) {
        window.timestamps = window.timestamps.filter(t => t > cutoff);
        if (window.timestamps.length === 0) windows.delete(key);
    }
}, 300_000);

/* ── Plan-based rate limits (requests per hour) ── */
const RATE_LIMITS: Record<string, number> = {
    free: 30,
    plus: 120,
    pro: 300,
    enterprise: 1000,
};

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    limit: number;
    retryAfterMs?: number;
}

/**
 * Check if a request is allowed under the rate limit.
 *
 * @param userId - The user's ID
 * @param plan - The user's plan (free, plus, pro, enterprise)
 * @param tool - The tool being used (for per-tool limiting if needed)
 */
export function checkRateLimit(
    userId: string,
    plan: string = 'free',
    tool: string = 'general'
): RateLimitResult {
    const key = `${userId}:${tool}`;
    const limit = RATE_LIMITS[plan] || RATE_LIMITS.free;
    const now = Date.now();
    const windowMs = 3600_000; // 1 hour
    const cutoff = now - windowMs;

    // Get or create window
    let window = windows.get(key);
    if (!window) {
        window = { timestamps: [] };
        windows.set(key, window);
    }

    // Remove expired timestamps
    window.timestamps = window.timestamps.filter(t => t > cutoff);

    if (window.timestamps.length >= limit) {
        // Rate limited
        const oldestInWindow = window.timestamps[0];
        const retryAfterMs = oldestInWindow + windowMs - now;

        return {
            allowed: false,
            remaining: 0,
            limit,
            retryAfterMs: Math.max(retryAfterMs, 1000),
        };
    }

    // Allow and record
    window.timestamps.push(now);

    return {
        allowed: true,
        remaining: limit - window.timestamps.length,
        limit,
    };
}

/**
 * Build a 429 Too Many Requests response.
 */
export function rateLimitResponse(result: RateLimitResult) {
    const retryAfterSecs = Math.ceil((result.retryAfterMs || 60000) / 1000);

    return new Response(
        JSON.stringify({
            error: 'Too many requests',
            message: `You've hit the rate limit. Try again in ${retryAfterSecs} seconds.`,
            limit: result.limit,
            retryAfterSeconds: retryAfterSecs,
            upgrade_url: '/settings?tab=subscription',
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(retryAfterSecs),
                'X-RateLimit-Limit': String(result.limit),
                'X-RateLimit-Remaining': '0',
            },
        }
    );
}
