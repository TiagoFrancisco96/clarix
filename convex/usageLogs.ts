import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/* ── Log a single usage event ── */
export const logUsage = mutation({
  args: {
    userId: v.string(),
    tool: v.string(),
    modelId: v.string(),
    provider: v.string(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    baseCost: v.number(),
    tokenCost: v.number(),
    totalCost: v.number(),
    estimatedCost: v.number(),
    fallbackFrom: v.optional(v.string()),
    tokenSource: v.string(),
    status: v.string(),
    costCapped: v.optional(v.boolean()),
    durationMs: v.optional(v.number()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("usage_logs", {
      user_id: args.userId,
      tool: args.tool,
      model_id: args.modelId,
      provider: args.provider,
      input_tokens: args.inputTokens,
      output_tokens: args.outputTokens,
      total_tokens: args.totalTokens,
      base_cost: args.baseCost,
      token_cost: args.tokenCost,
      total_cost: args.totalCost,
      estimated_cost: args.estimatedCost,
      fallback_from: args.fallbackFrom,
      token_source: args.tokenSource,
      status: args.status,
      cost_capped: args.costCapped,
      duration_ms: args.durationMs,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

/* ── Get paginated usage history for a user ── */
export const getUserUsage = query({
  args: {
    userId: v.string(),
    tool: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, tool, limit }) => {
    if (tool) {
      return await ctx.db
        .query("usage_logs")
        .withIndex("by_user_tool", (q) => q.eq("user_id", userId).eq("tool", tool))
        .order("desc")
        .take(limit || 50);
    }

    return await ctx.db
      .query("usage_logs")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .order("desc")
      .take(limit || 50);
  },
});

/* ── Get aggregated usage summary for a user ── */
export const getUserUsageSummary = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const logs = await ctx.db
      .query("usage_logs")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .collect();

    // Aggregate by tool
    const byTool: Record<string, { count: number; totalCost: number; totalTokens: number }> = {};
    // Aggregate by model
    const byModel: Record<string, { count: number; totalCost: number; totalTokens: number }> = {};

    let totalCreditsUsed = 0;
    let totalTokensConsumed = 0;
    let totalGenerations = 0;

    for (const log of logs) {
      // By tool
      if (!byTool[log.tool]) {
        byTool[log.tool] = { count: 0, totalCost: 0, totalTokens: 0 };
      }
      byTool[log.tool].count++;
      byTool[log.tool].totalCost += log.total_cost;
      byTool[log.tool].totalTokens += log.total_tokens || 0;

      // By model
      if (!byModel[log.model_id]) {
        byModel[log.model_id] = { count: 0, totalCost: 0, totalTokens: 0 };
      }
      byModel[log.model_id].count++;
      byModel[log.model_id].totalCost += log.total_cost;
      byModel[log.model_id].totalTokens += log.total_tokens || 0;

      totalCreditsUsed += log.total_cost;
      totalTokensConsumed += log.total_tokens || 0;
      totalGenerations++;
    }

    return {
      totalCreditsUsed,
      totalTokensConsumed,
      totalGenerations,
      byTool,
      byModel,
    };
  },
});
