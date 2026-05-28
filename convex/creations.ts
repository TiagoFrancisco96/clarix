import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listCreations = query({
  args: { userId: v.string(), tool: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    const creations = await ctx.db
      .query("user_creations")
      .withIndex("by_user_tool", (q) =>
        q.eq("user_id", args.userId).eq("tool", args.tool)
      )
      .order("desc")
      .collect();
    return creations;
  },
});

export const getCreation = query({
  args: { creationId: v.id("user_creations"), userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) return null;

    const creation = await ctx.db.get(args.creationId);
    if (!creation || creation.user_id !== args.userId) return null;
    return creation;
  },
});

export const insertCreation = mutation({
  args: {
    userId: v.string(),
    tool: v.string(),
    title: v.string(),
    metadata: v.string(),
    content: v.string(),
    filePath: v.union(v.string(), v.null()),
    driveFileId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("user_creations", {
      user_id: args.userId,
      tool: args.tool,
      title: args.title,
      metadata: args.metadata,
      content: args.content,
      file_path: args.filePath,
      drive_file_id: args.driveFileId,
    });
  },
});

export const deleteCreation = mutation({
  args: { creationId: v.id("user_creations"), userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    const creation = await ctx.db.get(args.creationId);
    if (!creation || creation.user_id !== args.userId) throw new Error("Not authorized");
    await ctx.db.delete(args.creationId);
  },
});
