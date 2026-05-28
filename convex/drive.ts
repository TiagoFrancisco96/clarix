import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listDriveFiles = query({
  args: {
    userId: v.string(),
    folder: v.optional(v.string()),
    search: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    showDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    let q = ctx.db.query("drive_files").withIndex("by_user", (q) =>
      q.eq("user_id", args.userId).eq("is_deleted", args.showDeleted ? 1 : 0)
    );

    let files = await q.collect();

    if (args.folder && args.folder !== "all") {
      files = files.filter((f) => f.folder === args.folder);
    }

    if (args.search) {
      const s = args.search.toLowerCase();
      files = files.filter(
        (f) =>
          f.name.toLowerCase().includes(s) ||
          f.type.toLowerCase().includes(s) ||
          f.source.toLowerCase().includes(s)
      );
    }

    if (args.sortBy === "name") {
      files.sort((a, b) => a.name.localeCompare(b.name));
    } else if (args.sortBy === "size") {
      files.sort((a, b) => b.size_bytes - a.size_bytes);
    } else {
      files.sort((a, b) => b._creationTime - a._creationTime);
    }

    return files;
  },
});

export const getDriveFile = query({
  args: { fileId: v.id("drive_files"), userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) return null;

    const file = await ctx.db.get(args.fileId);
    if (!file || file.user_id !== args.userId) return null;
    return file;
  },
});

export const insertDriveFile = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    type: v.string(),
    source: v.string(),
    sizeBytes: v.number(),
    mimeType: v.string(),
    folder: v.string(),
    isFavorite: v.number(),
    diskPath: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("drive_files", {
      user_id: args.userId,
      name: args.name,
      type: args.type,
      source: args.source,
      size_bytes: args.sizeBytes,
      mime_type: args.mimeType,
      folder: args.folder,
      is_favorite: args.isFavorite,
      is_deleted: 0,
      disk_path: args.diskPath,
    });
  },
});

export const updateDriveFile = mutation({
  args: {
    fileId: v.id("drive_files"),
    userId: v.string(),
    name: v.optional(v.string()),
    folder: v.optional(v.string()),
    isFavorite: v.optional(v.number()),
    isDeleted: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file || file.user_id !== args.userId) throw new Error("Not authorized");

    const updates: {
      name?: string;
      folder?: string;
      is_favorite?: number;
      is_deleted?: number;
    } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.folder !== undefined) updates.folder = args.folder;
    if (args.isFavorite !== undefined) updates.is_favorite = args.isFavorite;
    if (args.isDeleted !== undefined) updates.is_deleted = args.isDeleted;

    await ctx.db.patch(args.fileId, updates);
  },
});

export const permanentDeleteDriveFile = mutation({
  args: { fileId: v.id("drive_files"), userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file || file.user_id !== args.userId) throw new Error("Not authorized");
    await ctx.db.delete(args.fileId);
  },
});

export const getDriveStorageUsed = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      return 0;
    }

    const files = await ctx.db
      .query("drive_files")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId).eq("is_deleted", 0))
      .collect();
    return files.reduce((acc, f) => acc + f.size_bytes, 0);
  },
});

export const getDriveFolderCounts = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      return {};
    }

    const files = await ctx.db
      .query("drive_files")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId).eq("is_deleted", 0))
      .collect();
    const counts: Record<string, number> = {};
    for (const f of files) {
      counts[f.folder] = (counts[f.folder] || 0) + 1;
    }
    return counts;
  },
});
