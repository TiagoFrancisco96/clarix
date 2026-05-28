import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  drive_files: defineTable({
    user_id: v.string(),
    name: v.string(),
    type: v.string(),
    source: v.string(),
    size_bytes: v.number(),
    mime_type: v.string(),
    folder: v.string(),
    is_favorite: v.number(),
    is_deleted: v.number(),
    disk_path: v.union(v.string(), v.null()),
    storage_id: v.optional(v.id("_storage")),
  }).index("by_user", ["user_id", "is_deleted"])
    .index("by_folder", ["user_id", "folder", "is_deleted"]),

  notifications: defineTable({
    user_id: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    icon: v.string(),
    color: v.string(),
    is_read: v.number(),
    is_archived: v.number(),
    link: v.union(v.string(), v.null()),
  }).index("by_user", ["user_id", "is_archived"]),

  user_creations: defineTable({
    user_id: v.string(),
    tool: v.string(),
    title: v.string(),
    metadata: v.string(),
    content: v.string(),
    file_path: v.union(v.string(), v.null()),
    drive_file_id: v.union(v.string(), v.null()),
  }).index("by_user_tool", ["user_id", "tool"]),

  user_credits: defineTable({
    user_id: v.string(),
    balance: v.number(),
    lifetime_used: v.number(),
    plan: v.string(), // "free" | "plus" | "pro" | "enterprise"
    plan_credits: v.number(), // monthly allocation
    reset_at: v.number(), // epoch ms of last monthly reset
    stripe_customer_id: v.optional(v.string()),
    stripe_subscription_id: v.optional(v.string()),
  }).index("by_user", ["user_id"])
    .index("by_stripe_customer", ["stripe_customer_id"]),

  credit_ledger: defineTable({
    user_id: v.string(),
    amount: v.number(), // positive = add, negative = deduct
    balance_after: v.number(),
    reason: v.string(), // "chat:deepseek-v4-flash" | "purchase:10000" | "monthly_reset"
    metadata: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_user", ["user_id"]),

  usage_logs: defineTable({
    user_id: v.string(),
    tool: v.string(),           // "chat" | "image" | "video" | "music" | "slides" | ...
    model_id: v.string(),       // "deepseek-v4-flash" | "gpt-5.4" | ...
    provider: v.string(),       // "DeepSeek" | "OpenAI" | "Anthropic" | "Google"

    // Token tracking (optional — null for non-chat tools)
    input_tokens: v.optional(v.number()),
    output_tokens: v.optional(v.number()),
    total_tokens: v.optional(v.number()),

    // Cost breakdown
    base_cost: v.number(),      // Fixed overhead credits
    token_cost: v.number(),     // Variable token-based credits
    total_cost: v.number(),     // base_cost + token_cost = what was charged
    estimated_cost: v.number(), // What was pre-authorized

    // Safety & context
    fallback_from: v.optional(v.string()),
    token_source: v.string(),   // "provider" | "estimated" | "flat_rate"
    status: v.string(),         // "completed" | "failed" | "refunded" | "capped"
    cost_capped: v.optional(v.boolean()),
    duration_ms: v.optional(v.number()),
    metadata: v.optional(v.string()),

    timestamp: v.number(),
  }).index("by_user", ["user_id"])
    .index("by_user_tool", ["user_id", "tool"])
    .index("by_timestamp", ["timestamp"]),

  functionErrors: defineTable({
    message: v.string(),
    stack: v.optional(v.string()),
    severity: v.string(), // "low" | "medium" | "high" | "critical"
    component: v.string(), // "frontend" | "backend" | "e2e"
    user_id: v.optional(v.string()),
    metadata: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_severity", ["severity"])
    .index("by_component", ["component"]),
});

