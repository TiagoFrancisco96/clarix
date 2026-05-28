'use client';

import { createAuthClient } from 'better-auth/react';
import { convexClient } from '@convex-dev/better-auth/client/plugins';

export const authClient = createAuthClient({
    // Direct all authentication client calls to your Convex HTTP router site URL
    baseURL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL || '',
    plugins: [
        convexClient(),
    ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
