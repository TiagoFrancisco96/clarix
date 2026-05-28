/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiDiagnostics from "../aiDiagnostics.js";
import type * as auth from "../auth.js";
import type * as creations from "../creations.js";
import type * as credits from "../credits.js";
import type * as drive from "../drive.js";
import type * as errorTracking from "../errorTracking.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as usageLogs from "../usageLogs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiDiagnostics: typeof aiDiagnostics;
  auth: typeof auth;
  creations: typeof creations;
  credits: typeof credits;
  drive: typeof drive;
  errorTracking: typeof errorTracking;
  http: typeof http;
  notifications: typeof notifications;
  usageLogs: typeof usageLogs;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
