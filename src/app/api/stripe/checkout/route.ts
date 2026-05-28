import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { PLAN_ALLOCATIONS, CREDIT_PACKS } from '@/lib/creditCosts';
import { getApiKey } from '@/lib/keys';

/**
 * POST /api/stripe/checkout — Creates a Stripe Checkout session.
 *
 * Body: { type: 'plan' | 'credits', planId?: string, packId?: string }
 *
 * If STRIPE_SECRET_KEY is not configured, returns a "coming soon" response.
 */
export async function POST(req: NextRequest) {
    try {
        const headersList = await headers();
        const session = await auth.api.getSession({ headers: headersList });

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { type, planId, packId } = body;

        const stripeKey = await getApiKey('STRIPE_SECRET_KEY');
        if (!stripeKey) {
            return NextResponse.json({
                error: 'Payments are not configured yet',
                message: 'Stripe is not set up. Contact the admin to enable payments.',
                coming_soon: true,
            }, { status: 503 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Dynamic import to avoid bundling issues when Stripe is not configured
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(stripeKey);

        if (type === 'plan') {
            // Plan subscription checkout
            const plan = PLAN_ALLOCATIONS[planId as keyof typeof PLAN_ALLOCATIONS];
            if (!plan || planId === 'free') {
                return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
            }

            const checkoutSession = await stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                customer_email: session.user.email || undefined,
                metadata: {
                    userId: session.user.id,
                    planId: planId as string,
                },
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Clarix ${plan.label} Plan`,
                            description: `${plan.credits.toLocaleString()} credits/month`,
                        },
                        unit_amount: plan.price * 100, // cents
                        recurring: { interval: 'month' },
                    },
                    quantity: 1,
                }],
                success_url: `${appUrl}/settings?tab=subscription&checkout=success`,
                cancel_url: `${appUrl}/settings?tab=subscription&checkout=cancelled`,
            });

            return NextResponse.json({ url: checkoutSession.url });
        }

        if (type === 'credits') {
            // Credit pack one-time purchase
            const pack = CREDIT_PACKS.find(p => p.id === packId);
            if (!pack) {
                return NextResponse.json({ error: 'Invalid credit pack' }, { status: 400 });
            }

            const checkoutSession = await stripe.checkout.sessions.create({
                mode: 'payment',
                payment_method_types: ['card'],
                customer_email: session.user.email || undefined,
                metadata: {
                    userId: session.user.id,
                    packId: pack.id,
                    credits: String(pack.credits),
                },
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${pack.credits.toLocaleString()} Credits Pack`,
                            description: `One-time purchase of ${pack.credits.toLocaleString()} credits for Clarix AI`,
                        },
                        unit_amount: pack.price * 100, // cents
                    },
                    quantity: 1,
                }],
                success_url: `${appUrl}/settings?tab=subscription&checkout=success`,
                cancel_url: `${appUrl}/settings?tab=subscription&checkout=cancelled`,
            });

            return NextResponse.json({ url: checkoutSession.url });
        }

        return NextResponse.json({ error: 'Invalid checkout type' }, { status: 400 });
    } catch (error) {
        console.error('[Stripe Checkout] Error:', error);
        return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
    }
}
