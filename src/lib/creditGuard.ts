/**
 * Credit Guard — Server-side middleware for credit enforcement.
 *
 * Usage in any API route:
 *   const guard = await checkCredits(userId, 'chat', 'deepseek-v4-flash');
 *   if (!guard.allowed) return creditDeniedResponse(guard);
 *   // ... do the API call ...
 *   // Credits are already deducted at this point
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { getCreditCost } from "./creditCosts";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

export interface CreditCheckResult {
    allowed: boolean;
    balance: number;
    cost: number;
    newBalance?: number;
}

/**
 * Check if the user can afford the operation and deduct credits atomically.
 * Returns immediately — no side effects if denied.
 */
export async function checkCredits(
    userId: string,
    tool: string,
    modelId: string,
    metadata?: string
): Promise<CreditCheckResult> {
    const cost = getCreditCost(tool, modelId);

    try {
        const result = await convex.mutation(api.credits.deductCredits, {
            userId,
            amount: cost,
            reason: `${tool}:${modelId}`,
            metadata,
        });

        return {
            allowed: result.success,
            balance: result.balance,
            cost: result.cost,
            newBalance: result.success ? result.balance : undefined,
        };
    } catch (err) {
        console.error('[CreditGuard] Deduction error:', err);
        // On error, allow the request (fail-open) but log it
        // This prevents credit system outages from blocking all AI usage
        return { allowed: true, balance: -1, cost, newBalance: -1 };
    }
}

/**
 * Refund credits when an upstream API call fails AFTER we already deducted.
 * This ensures users never pay for failed generations.
 */
export async function refundCredits(
    userId: string,
    cost: number,
    reason: string
): Promise<void> {
    try {
        await convex.mutation(api.credits.addCredits, {
            userId,
            amount: cost,
            reason: `refund:${reason}`,
            metadata: `Auto-refund: upstream API failure`,
        });
        console.log(`[CreditGuard] Refunded ${cost} credits to ${userId} (${reason})`);
    } catch (err) {
        console.error('[CreditGuard] Refund error (CRITICAL):', err);
        // Log this to an alert system — user lost credits without getting value
    }
}

/**
 * Just check balance without deducting (for pre-flight checks).
 */
export async function getBalance(userId: string) {
    try {
        return await convex.query(api.credits.getBalance, { userId });
    } catch (err) {
        console.error('[CreditGuard] Balance query error:', err);
        return { balance: 0, plan: 'free', lifetime_used: 0, plan_credits: 200, reset_at: Date.now(), initialized: false };
    }
}

/**
 * Initialize credits for a user (called on first API usage).
 */
export async function ensureCreditsInitialized(userId: string) {
    try {
        await convex.mutation(api.credits.initUserCredits, { userId });
    } catch (err) {
        console.error('[CreditGuard] Init error:', err);
    }
}

/**
 * Build a 402 Payment Required response for insufficient credits.
 */
export function creditDeniedResponse(result: CreditCheckResult) {
    return new Response(
        JSON.stringify({
            error: 'Insufficient credits',
            balance: result.balance,
            cost: result.cost,
            needed: result.cost - result.balance,
            upgrade_url: '/settings?tab=subscription',
        }),
        {
            status: 402,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}
