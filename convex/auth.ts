import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { betterAuth } from "better-auth";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { convex } from "@convex-dev/better-auth/plugins";
import { query } from "./_generated/server";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    database: authComponent.adapter(ctx),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: {
        clientId: process.env.AUTH_GOOGLE_ID || '',
        clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
      },
    },
    plugins: [
      convex({
        authConfig: {
          providers: [
            {
              applicationID: "convex",
              domain: process.env.BETTER_AUTH_URL || "",
            },
          ],
        },
      }),
    ],
  });
};

// Helper query to retrieve the current user details reactively
export const getOptionalUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});
