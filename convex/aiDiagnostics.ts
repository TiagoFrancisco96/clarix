import { v } from "convex/values";
import { action } from "./_generated/server";

export const triggerE2EAudit = action({
  args: {
    siteUrl: v.string(),
    owner: v.optional(v.string()),
    repo: v.optional(v.string()),
    ref: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Only authenticated administrators can trigger E2E click audits.");
    }

    // 2. Resolve credentials
    const pat = process.env.GITHUB_PAT;
    if (!pat) {
      throw new Error("Missing GITHUB_PAT inside Convex environment settings.");
    }

    const githubOwner = args.owner || process.env.GITHUB_OWNER || "example-owner";
    const githubRepo = args.repo || process.env.GITHUB_REPO || "example-repo";
    const githubRef = args.ref || process.env.GITHUB_REF || "main";

    const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/e2e-on-demand.yml/dispatches`;

    console.log(`[E2E DISPATCH] Triggering GitHub workflow on ${githubOwner}/${githubRepo} for URL: ${args.siteUrl}...`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${pat}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "Clarix-SRE-Dispatcher",
        },
        body: JSON.stringify({
          ref: githubRef,
          inputs: {
            site_url: args.siteUrl,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`GitHub Actions API returned ${response.status}: ${errText}`);
      }

      console.log(`[E2E DISPATCH] Successfully triggered workflow dispatch on ${githubOwner}/${githubRepo}.`);
      return {
        success: true,
        message: `Successfully dispatched Playwright E2E clicks audit on ${githubOwner}/${githubRepo} at ref ${githubRef}.`,
      };
    } catch (err) {
      console.error("[E2E DISPATCH] Error dispatching workflow:", err);
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  },
});
