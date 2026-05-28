import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getUserCredits, initUserCredits } from '@/lib/db';

/**
 * GET /api/credits — Returns the authenticated user's credit balance.
 * Used by the topbar and settings page to show live data.
 */
export async function GET() {
    try {
        const headersList = await headers();
        const session = await auth.api.getSession({ headers: headersList });

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Get current balance
        let credits = await getUserCredits(userId);

        // Auto-initialize if this is the user's first time
        if (!credits.initialized) {
            await initUserCredits(userId);
            credits = await getUserCredits(userId);
        }

        return NextResponse.json({
            balance: credits.balance,
            lifetime_used: credits.lifetime_used,
            plan: credits.plan,
            plan_credits: credits.plan_credits,
            reset_at: credits.reset_at,
        });
    } catch (error) {
        console.error('[Credits API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
    }
}
