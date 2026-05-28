/**
 * Credit Guard — Two-Phase Settlement Middleware
 *
 * Architecture:
 *   1. PRE-AUTHORIZE: Reserve estimated credits before generation
 *   2. SETTLE: After generation, adjust to actual token-based cost
 *
 * Usage in API routes:
 *   const hold = await preAuthorize(userId, 'chat', 'deepseek-v4-flash');
 *   if (!hold.allowed) return creditDeniedResponse(hold);
 *   // ... do the AI generation, track tokens ...
 *   await settleUsage(userId, { hold, tool, modelId, provider, tokens, durationMs });
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import {
    estimateCost,
    calculateTokenCost,
    estimateTokensFromChars,
    getModelPricing,
} from "./creditCosts";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

/* ── Types ── */

export interface PreAuthResult {
    allowed: boolean;
    balance: number;
    estimatedCost: number;
    newBalance?: number;
}

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    source: 'provider' | 'estimated';
}

export interface SettleOptions {
    hold: PreAuthResult;
    tool: string;
    modelId: string;
    provider: string;
    tokens: TokenUsage;
    durationMs?: number;
    fallbackFrom?: string;
    status?: 'completed' | 'failed' | 'refunded' | 'capped';
    metadata?: string;
}

export interface SettleResult {
    actualCost: number;
    estimatedCost: number;
    adjusted: boolean;
    capped: boolean;
    refunded: number;
}

/* ── Phase 1: Pre-Authorize ── */

/**
 * Reserve estimated credits before AI generation.
 * Deducts the "typical" estimated cost from the user's balance.
 * Returns a hold object to pass to settleUsage() after generation.
 */
export async function preAuthorize(
    userId: string,
    tool: string,
    modelId: string,
    metadata?: string
): Promise<PreAuthResult> {
    const estimated = estimateCost(tool, modelId);

    try {
        const result = await convex.mutation(api.credits.deductCredits, {
            userId,
            amount: estimated,
            reason: `preauth:${tool}:${modelId}`,
            metadata,
        });

        return {
            allowed: result.success,
            balance: result.balance,
            estimatedCost: estimated,
            newBalance: result.success ? result.balance : undefined,
        };
    } catch (err) {
        console.error('[CreditGuard] Pre-auth error:', err);
        // Fail-open: allow the request but log it
        return { allowed: true, balance: -1, estimatedCost: estimated, newBalance: -1 };
    }
}

/* ── Phase 2: Settle Usage ── */

/**
 * After AI generation completes, calculate the real cost from tokens,
 * adjust the pre-authorized hold, and log the usage.
 */
export async function settleUsage(
    userId: string,
    opts: SettleOptions
): Promise<SettleResult> {
    const { hold, tool, modelId, provider, tokens, durationMs, fallbackFrom, metadata } = opts;
    const status = opts.status || 'completed';

    // Calculate actual cost from real tokens
    const pricing = getModelPricing(tool, modelId);
    let costResult;

    if (pricing.isTokenBased) {
        costResult = calculateTokenCost(tool, modelId, tokens.inputTokens, tokens.outputTokens);
    } else {
        // Flat-rate tool — actual cost = base cost
        costResult = {
            baseCost: pricing.baseCost,
            tokenCost: 0,
            totalCost: pricing.baseCost,
            capped: false,
        };
    }

    const actualCost = costResult.totalCost;
    const estimatedCost = hold.estimatedCost;
    const refundAmount = Math.max(0, estimatedCost - actualCost);

    try {
        // Settle the difference (refund excess or charge more)
        if (Math.abs(estimatedCost - actualCost) >= 0.01) {
            await convex.mutation(api.credits.settleCredits, {
                userId,
                estimatedCost,
                actualCost,
                reason: `${tool}:${modelId}`,
                metadata: JSON.stringify({
                    inputTokens: tokens.inputTokens,
                    outputTokens: tokens.outputTokens,
                    tokenSource: tokens.source,
                    ...(metadata ? { extra: metadata } : {}),
                }),
            });
        }

        // Log usage (always, even if no adjustment)
        await convex.mutation(api.usageLogs.logUsage, {
            userId,
            tool,
            modelId,
            provider,
            inputTokens: tokens.inputTokens || undefined,
            outputTokens: tokens.outputTokens || undefined,
            totalTokens: tokens.totalTokens || undefined,
            baseCost: costResult.baseCost,
            tokenCost: costResult.tokenCost,
            totalCost: actualCost,
            estimatedCost,
            fallbackFrom: fallbackFrom || undefined,
            tokenSource: tokens.source,
            status,
            costCapped: costResult.capped || undefined,
            durationMs: durationMs || undefined,
            metadata: metadata || undefined,
        });
    } catch (err) {
        console.error('[CreditGuard] Settlement error (CRITICAL):', err);
        // Settlement failed — the user was already charged the estimate.
        // Log for manual reconciliation.
    }

    return {
        actualCost,
        estimatedCost,
        adjusted: Math.abs(estimatedCost - actualCost) >= 0.01,
        capped: costResult.capped,
        refunded: refundAmount,
    };
}

/* ── Settle for flat-rate tools (image, video, music) ── */

/**
 * Simplified settlement for non-chat tools.
 * No token tracking — just logs the usage at the flat rate.
 */
export async function settleFlatRate(
    userId: string,
    tool: string,
    modelId: string,
    provider: string,
    opts?: {
        estimatedCost: number;
        durationMs?: number;
        fallbackFrom?: string;
        status?: 'completed' | 'failed' | 'refunded';
        metadata?: string;
    }
): Promise<void> {
    const pricing = getModelPricing(tool, modelId);
    const estimatedCost = opts?.estimatedCost ?? pricing.baseCost;

    try {
        await convex.mutation(api.usageLogs.logUsage, {
            userId,
            tool,
            modelId,
            provider,
            baseCost: pricing.baseCost,
            tokenCost: 0,
            totalCost: pricing.baseCost,
            estimatedCost,
            fallbackFrom: opts?.fallbackFrom || undefined,
            tokenSource: 'flat_rate',
            status: opts?.status || 'completed',
            durationMs: opts?.durationMs || undefined,
            metadata: opts?.metadata || undefined,
        });
    } catch (err) {
        console.error('[CreditGuard] Flat-rate logging error:', err);
    }
}

/* ── Refund Hold (full refund on total failure) ── */

/**
 * Refund the entire pre-authorized amount when generation completely fails.
 */
export async function refundHold(
    userId: string,
    hold: PreAuthResult,
    reason: string
): Promise<void> {
    if (!hold.allowed || hold.estimatedCost <= 0) return;

    try {
        await convex.mutation(api.credits.addCredits, {
            userId,
            amount: hold.estimatedCost,
            reason: `refund:${reason}`,
            metadata: 'Auto-refund: generation failed',
        });
        console.log(`[CreditGuard] Refunded ${hold.estimatedCost} credits to ${userId} (${reason})`);
    } catch (err) {
        console.error('[CreditGuard] Refund error (CRITICAL):', err);
    }
}

/* ── Legacy-compatible wrappers ── */

/**
 * Legacy wrapper: checkCredits() now calls preAuthorize().
 * Maintains backward compatibility for routes not yet migrated.
 */
export async function checkCredits(
    userId: string,
    tool: string,
    modelId: string,
    metadata?: string
): Promise<PreAuthResult> {
    return preAuthorize(userId, tool, modelId, metadata);
}

/**
 * Legacy wrapper: refundCredits() for backward compatibility.
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
            metadata: 'Auto-refund: upstream API failure',
        });
        console.log(`[CreditGuard] Refunded ${cost} credits to ${userId} (${reason})`);
    } catch (err) {
        console.error('[CreditGuard] Refund error (CRITICAL):', err);
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
export function creditDeniedResponse(result: PreAuthResult) {
    return new Response(
        JSON.stringify({
            error: 'Insufficient credits',
            balance: result.balance,
            cost: result.estimatedCost,
            needed: result.estimatedCost - result.balance,
            upgrade_url: '/settings?tab=subscription',
        }),
        {
            status: 402,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}

/**
 * Helper to build token usage from provider data or character estimation.
 */
export function buildTokenUsage(
    providerTokens?: { inputTokens?: number; outputTokens?: number },
    inputChars?: number,
    outputChars?: number,
): TokenUsage {
    if (providerTokens?.inputTokens != null && providerTokens?.outputTokens != null) {
        return {
            inputTokens: providerTokens.inputTokens,
            outputTokens: providerTokens.outputTokens,
            totalTokens: providerTokens.inputTokens + providerTokens.outputTokens,
            source: 'provider',
        };
    }

    // Fallback: estimate from character counts
    const estimated = estimateTokensFromChars(inputChars || 0, outputChars || 0);
    return {
        ...estimated,
        source: 'estimated',
    };
}
