/**
 * Credit Cost Engine — Token-Aware Hybrid Pricing
 *
 * Central lookup for how many credits each AI operation costs.
 * Uses a hybrid model: base cost + per-token variable cost.
 *
 * Pricing philosophy:
 *  - 1 credit ≈ $0.002 at our pack pricing ($5 for 2,500)
 *  - Chat models: base + (input_tokens × inputRate/1K) + (output_tokens × outputRate/1K)
 *  - Non-chat tools (image/video/music): flat rate per generation
 *  - Every request has a maxCostCap to prevent runaway spending
 *  - Costs are designed to cover real API cost with healthy margin
 */

/* ── Pricing configuration per model ── */
export interface ModelPricing {
    baseCost: number;      // Fixed credits per generation (API overhead)
    inputRate: number;     // Credits per 1K input tokens
    outputRate: number;    // Credits per 1K output tokens
    maxCostCap: number;    // Per-request maximum (circuit breaker)
    isTokenBased: boolean; // True for chat models, false for flat-rate tools
}

/* ── Chat model pricing (token-based) ── */
const CHAT_PRICING: Record<string, ModelPricing> = {
    // ⚡ Speed tier (DeepSeek) — cheapest
    'deepseek-v4-flash': { baseCost: 0, inputRate: 0.1, outputRate: 0.3, maxCostCap: 15, isTokenBased: true },
    'deepseek-r1':       { baseCost: 0, inputRate: 0.2, outputRate: 0.6, maxCostCap: 20, isTokenBased: true },
    'deepseek-v4':       { baseCost: 1, inputRate: 0.3, outputRate: 0.8, maxCostCap: 25, isTokenBased: true },

    // ✍️ Writer tier (OpenAI)
    'gpt-5.4':  { baseCost: 2, inputRate: 0.8, outputRate: 1.5, maxCostCap: 40, isTokenBased: true },
    'gpt-5.5':  { baseCost: 3, inputRate: 1.5, outputRate: 3.0, maxCostCap: 60, isTokenBased: true },

    // 💻 Pro tier (Anthropic)
    'claude-sonnet-4.6': { baseCost: 1, inputRate: 0.6, outputRate: 1.2, maxCostCap: 35, isTokenBased: true },
    'claude-opus-4.7':   { baseCost: 5, inputRate: 2.0, outputRate: 5.0, maxCostCap: 80, isTokenBased: true },

    // 📚 Research tier (Google)
    'gemini-2.5-flash': { baseCost: 0, inputRate: 0.1, outputRate: 0.4, maxCostCap: 15, isTokenBased: true },
    'gemini-2.5-pro':   { baseCost: 2, inputRate: 0.8, outputRate: 1.6, maxCostCap: 45, isTokenBased: true },
    'gemini-3.1-pro':   { baseCost: 2, inputRate: 1.0, outputRate: 2.0, maxCostCap: 50, isTokenBased: true },

    // Other
    'grok-4.3': { baseCost: 2, inputRate: 0.8, outputRate: 1.5, maxCostCap: 40, isTokenBased: true },
};

/* ── Image model pricing (flat-rate) ── */
const IMAGE_PRICING: Record<string, ModelPricing> = {
    'flux-schnell':     { baseCost: 3,  inputRate: 0, outputRate: 0, maxCostCap: 3,  isTokenBased: false },
    'flux-2-pro':       { baseCost: 10, inputRate: 0, outputRate: 0, maxCostCap: 10, isTokenBased: false },
    'gpt-image-2':      { baseCost: 15, inputRate: 0, outputRate: 0, maxCostCap: 15, isTokenBased: false },
    'nano-banana-pro':  { baseCost: 12, inputRate: 0, outputRate: 0, maxCostCap: 12, isTokenBased: false },
    'ideogram-v3':      { baseCost: 10, inputRate: 0, outputRate: 0, maxCostCap: 10, isTokenBased: false },
};

/* ── Video model pricing (flat-rate) ── */
const VIDEO_PRICING: Record<string, ModelPricing> = {
    'seedance-2.0':   { baseCost: 25,  inputRate: 0, outputRate: 0, maxCostCap: 25,  isTokenBased: false },
    'kling-3':        { baseCost: 40,  inputRate: 0, outputRate: 0, maxCostCap: 40,  isTokenBased: false },
    'veo-3.1-fast':   { baseCost: 40,  inputRate: 0, outputRate: 0, maxCostCap: 40,  isTokenBased: false },
    'veo-3.1':        { baseCost: 75,  inputRate: 0, outputRate: 0, maxCostCap: 75,  isTokenBased: false },
    'veo-3.1-pro':    { baseCost: 60,  inputRate: 0, outputRate: 0, maxCostCap: 60,  isTokenBased: false },
    'runway-gen4.5':  { baseCost: 100, inputRate: 0, outputRate: 0, maxCostCap: 100, isTokenBased: false },
};

/* ── Music model pricing (flat-rate) ── */
const MUSIC_PRICING: Record<string, ModelPricing> = {
    'suno': { baseCost: 20, inputRate: 0, outputRate: 0, maxCostCap: 20, isTokenBased: false },
    'udio': { baseCost: 20, inputRate: 0, outputRate: 0, maxCostCap: 20, isTokenBased: false },
};

/* ── All pricing tables by tool ── */
const PRICING_TABLES: Record<string, Record<string, ModelPricing>> = {
    chat: CHAT_PRICING,
    image: IMAGE_PRICING,
    video: VIDEO_PRICING,
    music: MUSIC_PRICING,
    slides: CHAT_PRICING,
    sheets: CHAT_PRICING,
    docs: CHAT_PRICING,
    developer: CHAT_PRICING,
};

/* ── Default pricing for unknown models ── */
const DEFAULT_PRICING: Record<string, ModelPricing> = {
    chat:    { baseCost: 3, inputRate: 0.5, outputRate: 1.0, maxCostCap: 30, isTokenBased: true },
    image:   { baseCost: 10, inputRate: 0, outputRate: 0, maxCostCap: 10, isTokenBased: false },
    video:   { baseCost: 50, inputRate: 0, outputRate: 0, maxCostCap: 50, isTokenBased: false },
    music:   { baseCost: 20, inputRate: 0, outputRate: 0, maxCostCap: 20, isTokenBased: false },
};

const FALLBACK_DEFAULT: ModelPricing = {
    baseCost: 5, inputRate: 0.5, outputRate: 1.0, maxCostCap: 30, isTokenBased: true,
};

/* ── Character-to-token fallback estimator ── */
const CHARS_PER_TOKEN = 5; // Conservative for English (research shows 5-6 for prose)

/**
 * Get the full pricing config for a specific tool + model.
 */
export function getModelPricing(tool: string, modelId: string): ModelPricing {
    const table = PRICING_TABLES[tool];
    if (!table) return DEFAULT_PRICING[tool] || FALLBACK_DEFAULT;
    return table[modelId] || DEFAULT_PRICING[tool] || FALLBACK_DEFAULT;
}

/**
 * Calculate the exact credit cost based on actual token consumption.
 * Enforces the per-request cost cap (circuit breaker).
 */
export function calculateTokenCost(
    tool: string,
    modelId: string,
    inputTokens: number,
    outputTokens: number
): { baseCost: number; tokenCost: number; totalCost: number; capped: boolean } {
    const pricing = getModelPricing(tool, modelId);

    if (!pricing.isTokenBased) {
        // Flat-rate tool — no token calculation
        return {
            baseCost: pricing.baseCost,
            tokenCost: 0,
            totalCost: pricing.baseCost,
            capped: false,
        };
    }

    const inputCost = (inputTokens / 1000) * pricing.inputRate;
    const outputCost = (outputTokens / 1000) * pricing.outputRate;
    const tokenCost = Math.round((inputCost + outputCost) * 100) / 100;
    const rawTotal = pricing.baseCost + tokenCost;

    // Enforce per-request cost cap
    const capped = rawTotal > pricing.maxCostCap;
    const totalCost = Math.min(rawTotal, pricing.maxCostCap);

    // Round up to nearest 0.5 to ensure we never lose money
    const finalCost = Math.ceil(totalCost * 2) / 2;

    return {
        baseCost: pricing.baseCost,
        tokenCost: Math.round(tokenCost * 100) / 100,
        totalCost: finalCost,
        capped,
    };
}

/**
 * Estimate tokens from character count (fallback when provider doesn't report).
 */
export function estimateTokensFromChars(inputChars: number, outputChars: number): {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
} {
    const inputTokens = Math.ceil(inputChars / CHARS_PER_TOKEN);
    const outputTokens = Math.ceil(outputChars / CHARS_PER_TOKEN);
    return {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
    };
}

/**
 * Estimate the "typical" cost for a model (used for pre-authorization & UI display).
 * Based on ~500 input tokens + ~1000 output tokens for chat models.
 */
export function estimateCost(tool: string, modelId: string): number {
    const pricing = getModelPricing(tool, modelId);

    if (!pricing.isTokenBased) {
        return pricing.baseCost;
    }

    // Typical chat: ~500 input + ~1000 output tokens
    const typicalInput = 500;
    const typicalOutput = 1000;
    const result = calculateTokenCost(tool, modelId, typicalInput, typicalOutput);
    return result.totalCost;
}

/**
 * Get the per-request maximum cost cap for a model.
 */
export function getMaxCostCap(tool: string, modelId: string): number {
    return getModelPricing(tool, modelId).maxCostCap;
}

/**
 * Backward-compatible: Get the estimated credit cost for a tool + model.
 * Returns the "typical" cost for display purposes.
 */
export function getCreditCost(tool: string, modelId: string): number {
    return estimateCost(tool, modelId);
}

/**
 * Validate whether a user can afford a specific operation (pre-flight check).
 * Uses the estimated "typical" cost.
 */
export function canAfford(balance: number, tool: string, modelId: string): { affordable: boolean; cost: number } {
    const cost = estimateCost(tool, modelId);
    return { affordable: balance >= cost, cost };
}

/**
 * Get all costs for a specific tool (for UI display).
 * Returns estimated typical costs per model.
 */
export function getToolCosts(tool: string): Record<string, number> {
    const table = PRICING_TABLES[tool];
    if (!table) return {};

    const costs: Record<string, number> = {};
    for (const [modelId] of Object.entries(table)) {
        costs[modelId] = estimateCost(tool, modelId);
    }
    return costs;
}

/**
 * Get detailed pricing for all models in a tool (for settings/pricing page).
 */
export function getToolPricingDetails(tool: string): Record<string, ModelPricing> {
    return PRICING_TABLES[tool] || {};
}

/**
 * Plan credit allocations (for display purposes).
 */
export const PLAN_ALLOCATIONS = {
    free: { credits: 200, price: 0, label: 'Free' },
    plus: { credits: 12_000, price: 25, label: 'Plus' },
    pro: { credits: 30_000, price: 49, label: 'Pro' },
    enterprise: { credits: 200_000, price: 249, label: 'Enterprise' },
} as const;

/**
 * Credit pack options.
 */
export const CREDIT_PACKS = [
    { id: 'pack-2500', credits: 2_500, price: 5, rate: 0.002 },
    { id: 'pack-10000', credits: 10_000, price: 15, rate: 0.0015, discount: '25%' },
    { id: 'pack-50000', credits: 50_000, price: 59, rate: 0.00118, discount: '41%', popular: true },
    { id: 'pack-100000', credits: 100_000, price: 99, rate: 0.00099, discount: '50%' },
] as const;
