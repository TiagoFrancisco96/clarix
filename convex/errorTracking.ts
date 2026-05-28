import { v } from "convex/values";
import { mutation, query, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

function sanitizeString(str: string): string {
  // Redact Stripe secret keys (sk_...), Stripe webhook keys (whsec_...), Resend api keys (re_...)
  // and passwords/secrets/tokens in standard formats.
  let sanitized = str;
  sanitized = sanitized.replace(/(sk_[a-zA-Z0-9]+)/g, "••••••••");
  sanitized = sanitized.replace(/(whsec_[a-zA-Z0-9]+)/g, "••••••••");
  sanitized = sanitized.replace(/(re_[a-zA-Z0-9]+)/g, "••••••••");
  sanitized = sanitized.replace(/(password|passphrase|secret|token|apiKey|api_key|auth_token)(["']?\s*[:=]\s*["'])([^"'\s]+)(["']?)/gi, "$1$2••••••••$4");
  return sanitized;
}

export const logError = mutation({
  args: {
    message: v.string(),
    stack: v.optional(v.string()),
    severity: v.string(), // "low" | "medium" | "high" | "critical"
    component: v.string(), // "frontend" | "backend" | "e2e"
    metadata: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Get identity if available
    const identity = await ctx.auth.getUserIdentity();
    const userId = args.userId ?? identity?.subject;


    // 2. Sanitize error message, stack, and metadata
    const sanitizedMessage = sanitizeString(args.message);
    const sanitizedStack = args.stack ? sanitizeString(args.stack) : undefined;
    const sanitizedMetadata = args.metadata ? sanitizeString(args.metadata) : undefined;

    // 3. Insert into functionErrors table
    const errorId = await ctx.db.insert("functionErrors", {
      message: sanitizedMessage,
      stack: sanitizedStack,
      severity: args.severity,
      component: args.component,
      user_id: userId,
      metadata: sanitizedMetadata,
      timestamp: Date.now(),
    });

    // 4. If critical, schedule the background email alert action
    if (args.severity === "critical") {
      await ctx.scheduler.runAfter(0, internal.errorTracking.sendErrorAlert, {
        message: sanitizedMessage,
        component: args.component,
        timestamp: Date.now(),
      });
    }

    return errorId;
  },
});

export const sendErrorAlert = internalAction({
  args: {
    message: v.string(),
    component: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    
    const emailSubject = `⚠️ CRITICAL ERROR ALERT [${args.component.toUpperCase()}]`;
    const emailBody = `
      <h2>Critical Error Detected</h2>
      <p><strong>Component:</strong> ${args.component}</p>
      <p><strong>Time:</strong> ${new Date(args.timestamp).toLocaleString()}</p>
      <p><strong>Message:</strong> ${args.message}</p>
      <p>Please check the admin health dashboard for full stack trace and diagnostic info.</p>
    `;

    console.log(`[SRE ALERT] Sending critical error email to ${adminEmail}...`);

    if (!resendApiKey) {
      console.warn("[SRE ALERT] RESEND_API_KEY not configured. Email alert skipped (logged to console above).");
      return;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Clarix Telemetry <alerts@updates.clarix.ai>",
          to: adminEmail,
          subject: emailSubject,
          html: emailBody,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Resend API returned status ${response.status}: ${errText}`);
      }

      console.log("[SRE ALERT] Critical error email sent successfully via Resend.");
    } catch (error) {
      console.error("[SRE ALERT] Failed to send email alert via Resend:", error);
    }
  },
});

export const getRecentErrors = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const limit = args.limit ?? 50;
    const errors = await ctx.db
      .query("functionErrors")
      .order("desc")
      .take(limit);

    return errors;
  },
});

export const getErrorStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const allErrors = await ctx.db.query("functionErrors").collect();
    
    const severityCounts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    const componentCounts: Record<string, number> = {
      frontend: 0,
      backend: 0,
      e2e: 0,
    };

    for (const err of allErrors) {
      if (err.severity in severityCounts) {
        severityCounts[err.severity]++;
      }
      if (err.component in componentCounts) {
        componentCounts[err.component]++;
      }
    }

    return {
      total: allErrors.length,
      severity: severityCounts,
      component: componentCounts,
    };
  },
});
