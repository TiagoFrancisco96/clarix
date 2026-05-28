import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listNotifications = query({
  args: {
    userId: v.string(),
    type: v.optional(v.string()),
    unreadOnly: v.optional(v.boolean()),
    showArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    let q = ctx.db.query("notifications").withIndex("by_user", (q) =>
      q.eq("user_id", args.userId).eq("is_archived", args.showArchived ? 1 : 0)
    );

    let notifs = await q.collect();

    if (args.type && args.type !== "all") {
      notifs = notifs.filter((n) => n.type === args.type);
    }
    if (args.unreadOnly) {
      notifs = notifs.filter((n) => n.is_read === 0);
    }

    notifs.sort((a, b) => b._creationTime - a._creationTime);
    return notifs;
  },
});

export const insertNotification = mutation({
  args: {
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    icon: v.string(),
    color: v.string(),
    link: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db.insert("notifications", {
      user_id: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      icon: args.icon,
      color: args.color,
      link: args.link,
      is_read: 0,
      is_archived: 0,
    });
  },
});

export const updateNotification = mutation({
  args: {
    notifId: v.id("notifications"),
    userId: v.string(),
    isRead: v.optional(v.number()),
    isArchived: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) return;

    const notif = await ctx.db.get(args.notifId);
    if (!notif || notif.user_id !== args.userId) return;

    const updates: {
      is_read?: number;
      is_archived?: number;
    } = {};
    if (args.isRead !== undefined) updates.is_read = args.isRead;
    if (args.isArchived !== undefined) updates.is_archived = args.isArchived;

    await ctx.db.patch(args.notifId, updates);
  },
});

export const markAllNotificationsRead = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId).eq("is_archived", 0))
      .filter((q) => q.eq(q.field("is_read"), 0))
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { is_read: 1 });
    }
  },
});

export const getUnreadNotificationCount = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      return 0;
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId).eq("is_archived", 0))
      .filter((q) => q.eq(q.field("is_read"), 0))
      .collect();
    return unread.length;
  },
});

export const hasWelcomeNotification = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      return false;
    }

    const notifs = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId).eq("is_archived", 0))
      .filter((q) => q.eq(q.field("type"), "system"))
      .collect();
    return notifs.some((n) => n.title.includes("Welcome"));
  },
});
