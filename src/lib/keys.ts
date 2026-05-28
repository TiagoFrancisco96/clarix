import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

/**
 * Dynamically resolves an API integration key.
 * Checks the Convex database first (gated by BETTER_AUTH_SECRET),
 * falling back to the standard environment variable if missing.
 */
export async function getApiKey(keyName: string): Promise<string | undefined> {
    // 1. Try to fetch the override from the Convex database first
    try {
        const systemSecret = process.env.BETTER_AUTH_SECRET;
        if (systemSecret) {
            const config = await convex.query(api.admin.getSystemConfigInternal, {
                key: keyName,
                systemSecret,
            });
            if (config?.value) {
                return config.value;
            }
        }
    } catch (e) {
        console.warn(`[API KEY] Failed to query dynamic key override for ${keyName}:`, e);
    }

    // 2. Fall back to the server environment variable
    return process.env[keyName];
}
