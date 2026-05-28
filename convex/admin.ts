import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper to verify admin identity
async function verifyAdmin(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: Not logged in");
  }
  
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const allowedAdmins = [
    adminEmail.toLowerCase(),
    "tiago@clarix.ai",
    "admin@clarix.ai",
    "tiagofrancisco96@gmail.com",
    "legal@clarix.ai"
  ];
  
  if (!identity.email || !allowedAdmins.includes(identity.email.toLowerCase())) {
    throw new Error(`Unauthorized: ${identity.email || "Unknown user"} is not authorized to access Admin functions.`);
  }
  return identity;
}

// List all users and their credit profiles
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await verifyAdmin(ctx);
    
    // Fetch all user credits
    const credits = await ctx.db.query("user_credits").collect();
    
    // Fetch names/emails from "users" table
    // Better Auth stores users in the "users" table in Convex
    const users = await ctx.db.query("users" as any).collect();
    const userMap = new Map(users.map(u => [u._id, u]));
    
    return credits.map(c => {
      // Find the corresponding user record in the user map
      const u = userMap.get(c.user_id as any) as any;
      return {
        ...c,
        name: u?.name || "Unknown User",
        email: u?.email || "No Email",
        image: u?.image,
        createdAt: u?._creationTime || c._creationTime,
      };
    });
  }
});

// Update a user's credits
export const updateUserCredits = mutation({
  args: {
    userId: v.string(),
    amount: v.number(),
    action: v.union(v.literal("set"), v.literal("add"), v.literal("deduct")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx);
    
    const record = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();
      
    if (!record) {
      throw new Error("User credits record not found");
    }
    
    let newBalance = record.balance;
    let ledgerAmount = 0;
    
    if (args.action === "set") {
      ledgerAmount = args.amount - record.balance;
      newBalance = args.amount;
    } else if (args.action === "add") {
      ledgerAmount = args.amount;
      newBalance = record.balance + args.amount;
    } else if (args.action === "deduct") {
      ledgerAmount = -args.amount;
      newBalance = Math.max(0, record.balance - args.amount);
    }
    
    await ctx.db.patch(record._id, {
      balance: newBalance,
      lifetime_used: ledgerAmount < 0 ? record.lifetime_used + Math.abs(ledgerAmount) : record.lifetime_used
    });
    
    await ctx.db.insert("credit_ledger", {
      user_id: args.userId,
      amount: ledgerAmount,
      balance_after: newBalance,
      reason: `admin_adjustment: ${args.reason}`,
      timestamp: Date.now(),
    });
    
    return { success: true, newBalance };
  }
});

// Update a user's subscription plan manually
export const updateUserPlan = mutation({
  args: {
    userId: v.string(),
    plan: v.string(), // "free" | "pro"
  },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx);
    
    const record = await ctx.db
      .query("user_credits")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .first();
      
    const planCredits = args.plan === "pro" ? 30_000 : 200;
    
    if (!record) {
      await ctx.db.insert("user_credits", {
        user_id: args.userId,
        balance: planCredits,
        lifetime_used: 0,
        plan: args.plan,
        plan_credits: planCredits,
        reset_at: Date.now(),
      });
      return { success: true };
    }
    
    const diff = planCredits - record.plan_credits;
    const newBalance = Math.max(0, record.balance + diff);
    
    await ctx.db.patch(record._id, {
      plan: args.plan,
      plan_credits: planCredits,
      balance: newBalance,
      reset_at: Date.now(),
    });
    
    await ctx.db.insert("credit_ledger", {
      user_id: args.userId,
      amount: diff,
      balance_after: newBalance,
      reason: `admin_plan_change: ${args.plan}`,
      timestamp: Date.now(),
    });
    
    return { success: true };
  }
});

// Get all system configs (integration keys) — masked value for list
export const getSystemConfigs = query({
  args: {},
  handler: async (ctx) => {
    await verifyAdmin(ctx);
    const configs = await ctx.db.query("system_configs").collect();
    
    // Mask the values for safety when showing in UI list
    return configs.map(c => {
      let masked = "••••••••";
      if (c.value && c.value.length > 8) {
        // Show prefix for recognizability (e.g. sk_... or similar)
        const prefix = c.value.substring(0, 5);
        masked = `${prefix}••••••••`;
      }
      return {
        _id: c._id,
        key: c.key,
        masked,
        description: c.description,
        updated_at: c.updated_at,
      };
    });
  }
});

// Set a system config
export const setSystemConfig = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx);
    
    const existing = await ctx.db
      .query("system_configs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
      
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        description: args.description || existing.description,
        updated_at: Date.now(),
      });
    } else {
      await ctx.db.insert("system_configs", {
        key: args.key,
        value: args.value,
        description: args.description,
        updated_at: Date.now(),
      });
    }
    
    return { success: true };
  }
});

// Delete a system config key
export const deleteSystemConfig = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAdmin(ctx);
    
    const existing = await ctx.db
      .query("system_configs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
      
    if (existing) {
      await ctx.db.delete(existing._id);
      return { success: true };
    }
    return { success: false, error: "Key not found" };
  }
});

// Server-to-server query to safely retrieve plain key values. Gated by BETTER_AUTH_SECRET.
export const getSystemConfigInternal = query({
  args: {
    key: v.string(),
    systemSecret: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.systemSecret || args.systemSecret !== process.env.BETTER_AUTH_SECRET) {
      throw new Error("Unauthorized: Invalid system secret");
    }
    
    const config = await ctx.db
      .query("system_configs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
      
    return config;
  }
});
