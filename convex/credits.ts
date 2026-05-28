import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/* ── Plan definitions ── */
const PLAN_CREDITS: Record<string, number> = {
  free: 200,
  plus: 12_000,
  pro: 30_000,
  enterprise: 200_000,
};

/* ── Get user credit balance ── */
export const getBalance = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const record = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (!record) {
      // User has no credit record yet — return defaults
      return {
        balance: 200,
        lifetime_used: 0,
        plan: "free" as const,
        plan_credits: 200,
        reset_at: Date.now(),
        initialized: false,
      };
    }

    return {
      balance: record.balance,
      lifetime_used: record.lifetime_used,
      plan: record.plan,
      plan_credits: record.plan_credits,
      reset_at: record.reset_at,
      stripe_customer_id: record.stripe_customer_id,
      stripe_subscription_id: record.stripe_subscription_id,
      initialized: true,
    };
  },
});

/* ── Initialize credits for a new user ── */
export const initUserCredits = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Check if already initialized
    const existing = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (existing) return existing._id;

    const id = await ctx.db.insert("user_credits", {
      user_id: userId,
      balance: PLAN_CREDITS.free,
      lifetime_used: 0,
      plan: "free",
      plan_credits: PLAN_CREDITS.free,
      reset_at: Date.now(),
    });

    // Ledger entry for initial credits
    await ctx.db.insert("credit_ledger", {
      user_id: userId,
      amount: PLAN_CREDITS.free,
      balance_after: PLAN_CREDITS.free,
      reason: "initial_grant",
      timestamp: Date.now(),
    });

    return id;
  },
});

/* ── Deduct credits (atomic) ── */
export const deductCredits = mutation({
  args: {
    userId: v.string(),
    amount: v.number(),
    reason: v.string(),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, { userId, amount, reason, metadata }) => {
    const record = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (!record) {
      // Auto-initialize for the user
      const newBalance = PLAN_CREDITS.free - amount;
      if (newBalance < 0) {
        return { success: false, balance: PLAN_CREDITS.free, cost: amount };
      }

      const id = await ctx.db.insert("user_credits", {
        user_id: userId,
        balance: newBalance,
        lifetime_used: amount,
        plan: "free",
        plan_credits: PLAN_CREDITS.free,
        reset_at: Date.now(),
      });

      await ctx.db.insert("credit_ledger", {
        user_id: userId,
        amount: PLAN_CREDITS.free,
        balance_after: PLAN_CREDITS.free,
        reason: "initial_grant",
        timestamp: Date.now(),
      });

      await ctx.db.insert("credit_ledger", {
        user_id: userId,
        amount: -amount,
        balance_after: newBalance,
        reason,
        metadata,
        timestamp: Date.now() + 1,
      });

      return { success: true, balance: newBalance, cost: amount, creditId: id };
    }

    // Check balance
    if (record.balance < amount) {
      return { success: false, balance: record.balance, cost: amount };
    }

    // Deduct
    const newBalance = record.balance - amount;
    await ctx.db.patch(record._id, {
      balance: newBalance,
      lifetime_used: record.lifetime_used + amount,
    });

    // Ledger entry
    await ctx.db.insert("credit_ledger", {
      user_id: userId,
      amount: -amount,
      balance_after: newBalance,
      reason,
      metadata,
      timestamp: Date.now(),
    });

    return { success: true, balance: newBalance, cost: amount };
  },
});

/* ── Add credits (purchases, resets) ── */
export const addCredits = mutation({
  args: {
    userId: v.string(),
    amount: v.number(),
    reason: v.string(),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, { userId, amount, reason, metadata }) => {
    const record = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (!record) {
      // Auto-init with the added credits + default free credits
      const total = PLAN_CREDITS.free + amount;
      await ctx.db.insert("user_credits", {
        user_id: userId,
        balance: total,
        lifetime_used: 0,
        plan: "free",
        plan_credits: PLAN_CREDITS.free,
        reset_at: Date.now(),
      });

      await ctx.db.insert("credit_ledger", {
        user_id: userId,
        amount: total,
        balance_after: total,
        reason,
        metadata,
        timestamp: Date.now(),
      });

      return { success: true, balance: total };
    }

    const newBalance = record.balance + amount;
    await ctx.db.patch(record._id, { balance: newBalance });

    await ctx.db.insert("credit_ledger", {
      user_id: userId,
      amount,
      balance_after: newBalance,
      reason,
      metadata,
      timestamp: Date.now(),
    });

    return { success: true, balance: newBalance };
  },
});

/* ── Update plan (from Stripe webhook) ── */
export const updatePlan = mutation({
  args: {
    userId: v.string(),
    plan: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, plan, stripeCustomerId, stripeSubscriptionId }) => {
    const record = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    const planCredits = PLAN_CREDITS[plan] || PLAN_CREDITS.free;

    if (!record) {
      await ctx.db.insert("user_credits", {
        user_id: userId,
        balance: planCredits,
        lifetime_used: 0,
        plan,
        plan_credits: planCredits,
        reset_at: Date.now(),
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
      });
      return;
    }

    // Credit the difference between new plan and old plan
    const creditDiff = Math.max(0, planCredits - record.plan_credits);

    await ctx.db.patch(record._id, {
      plan,
      plan_credits: planCredits,
      balance: record.balance + creditDiff,
      reset_at: Date.now(),
      stripe_customer_id: stripeCustomerId || record.stripe_customer_id,
      stripe_subscription_id: stripeSubscriptionId || record.stripe_subscription_id,
    });

    if (creditDiff > 0) {
      await ctx.db.insert("credit_ledger", {
        user_id: userId,
        amount: creditDiff,
        balance_after: record.balance + creditDiff,
        reason: `plan_upgrade:${plan}`,
        timestamp: Date.now(),
      });
    }
  },
});

/* ── Monthly credit reset ── */
export const resetMonthlyCredits = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const record = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .first();

    if (!record) return;

    await ctx.db.patch(record._id, {
      balance: record.plan_credits,
      reset_at: Date.now(),
    });

    await ctx.db.insert("credit_ledger", {
      user_id: userId,
      amount: record.plan_credits - record.balance,
      balance_after: record.plan_credits,
      reason: "monthly_reset",
      timestamp: Date.now(),
    });
  },
});

/* ── Get recent ledger entries ── */
export const getLedger = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    const entries = await ctx.db
      .query("credit_ledger")
      .withIndex("by_user", (q) => q.eq("user_id", userId))
      .order("desc")
      .take(limit || 20);

    return entries;
  },
});

/* ── Lookup by Stripe customer ID ── */
export const getByStripeCustomer = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    return await ctx.db
      .query("user_credits")
      .withIndex("by_stripe_customer", (q) => q.eq("stripe_customer_id", stripeCustomerId))
      .first();
  },
});
