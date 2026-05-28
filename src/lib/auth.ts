import { fetchAuthQuery } from './auth-server';
import { api } from '../../convex/_generated/api';

/**
 * Mock auth object replicating standard Better Auth getSession API.
 * This proxies Next.js server-side session checks directly to the Convex backend,
 * enabling seamless auth checks in 10+ Next.js API routes without modifying them!
 */
export const auth = {
    api: {
        getSession: async (options?: { headers: Headers }) => {
            try {
                // Fetch the authenticated user from Convex backend
                const user = await fetchAuthQuery(api.auth.getOptionalUser, {});
                if (!user) return null;
                
                // Return standard Better Auth session format
                return {
                    user: {
                        id: user._id,
                        email: user.email,
                        emailVerified: user.emailVerified,
                        name: user.name,
                        image: user.image,
                        createdAt: new Date(user._creationTime),
                        updatedAt: new Date(user._creationTime),
                    },
                    session: {
                        id: "convex-session",
                        userId: user._id,
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Mock 30-day session expiry
                        token: "convex-token",
                        createdAt: new Date(user._creationTime),
                        updatedAt: new Date(user._creationTime),
                    }
                };
            } catch (e) {
                console.error("Error in Convex getSession proxy:", e);
                return null;
            }
        }
    }
};
