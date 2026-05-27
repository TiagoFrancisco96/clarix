import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = [
    '/',
    '/login',
    '/privacy',
    '/terms',
    '/security',
    '/status',
    '/api-docs',
];

const PUBLIC_PREFIXES = [
    '/api/auth',  // Better Auth API routes
    '/api/',      // Other API routes (video generate, etc.)
    '/_next',     // Next.js internals
    '/favicon',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public routes
    if (PUBLIC_ROUTES.includes(pathname)) {
        return NextResponse.next();
    }

    // Allow public prefixes
    if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
        return NextResponse.next();
    }

    // Allow static files
    if (pathname.includes('.')) {
        return NextResponse.next();
    }

    // Check for Better Auth session cookie
    const sessionCookie = request.cookies.get('better-auth.session_token');

    if (!sessionCookie) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico (favicon)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
