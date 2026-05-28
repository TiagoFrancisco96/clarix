/**
 * Credit Cost Engine
 *
 * Central lookup for how many credits each AI operation costs.
 * These costs are designed to cover the real API cost with a healthy margin.
 *
 * Pricing philosophy:
 *  - 1 credit ≈ $0.002 at our pack pricing ($5 for 2,500)
 *  - Costs are rounded up to ensure we never lose money
 *  - Cheaper models = fewer credits = users save money
 */

/* ── Chat model costs ── */
const CHAT_COSTS: Record<string, number> = {
    // ⚡ Speed tier (DeepSeek) — cheapest
    'deepseek-v4-flash': 1,
    'deepseek-r1': 2,
    'deepseek-v4': 3,

    // ✍️ Writer tier (OpenAI)
    'gpt-5.4': 8,
    'gpt-5.5': 15,

    // 💻 Pro tier (Anthropic)
    'claude-sonnet-4.6': 5,
    'claude-opus-4.7': 25,

    // 📚 Research tier (Google)
    'gemini-2.5-flash': 2,
    'gemini-2.5-pro': 10,
    'gemini-3.1-pro': 12,

    // Other
    'grok-4.3': 8,
};

/* ── Image model costs ── */
const IMAGE_COSTS: Record<string, number> = {
    'flux-schnell': 3,
    'flux-2-pro': 10,
    'gpt-image-2': 15,
    'nano-banana-pro': 12,
    'ideogram-v3': 10,
};

/* ── Video model costs ── */
const VIDEO_COSTS: Record<string, number> = {
    'seedance-2.0': 25,
    'kling-3': 40,
    'veo-3.1-fast': 40,
    'veo-3.1': 75,
    'veo-3.1-pro': 60,
    'runway-gen4.5': 100,
};

/* ── Music model costs ── */
const MUSIC_COSTS: Record<string, number> = {
    'suno': 20,
    'udio': 20,
};

/* ── Slides / Sheets / Docs (text generation, same as chat) ── */
const PRODUCTIVITY_COSTS: Record<string, number> = {
    ...CHAT_COSTS,
};

/* ── All cost tables by tool ── */
const COST_TABLES: Record<string, Record<string, number>> = {
    chat: CHAT_COSTS,
    image: IMAGE_COSTS,
    video: VIDEO_COSTS,
    music: MUSIC_COSTS,
    slides: PRODUCTIVITY_COSTS,
    sheets: PRODUCTIVITY_COSTS,
    docs: PRODUCTIVITY_COSTS,
    developer: CHAT_COSTS,
};

/**
 * Get the credit cost for a specific tool + model combination.
 * Returns a default cost if the model isn't found in the lookup.
 */
export function getCreditCost(tool: string, modelId: string): number {
    const table = COST_TABLES[tool];
    if (!table) return 5; // safe default for unknown tools

    const cost = table[modelId];
    if (cost !== undefined) return cost;

    // Fallback defaults by tool type
    switch (tool) {
        case 'image': return 10;
        case 'video': return 50;
        case 'music': return 20;
        default: return 5;
    }
}

/**
 * Validate whether a user can afford a specific operation.
 * Returns { affordable, cost } without side effects.
 */
export function canAfford(balance: number, tool: string, modelId: string): { affordable: boolean; cost: number } {
    const cost = getCreditCost(tool, modelId);
    return { affordable: balance >= cost, cost };
}

/**
 * Get all costs for a specific tool (for UI display).
 */
export function getToolCosts(tool: string): Record<string, number> {
    return COST_TABLES[tool] || {};
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
