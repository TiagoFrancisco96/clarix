import { NextRequest, NextResponse } from 'next/server';
import { addUserCredits, updateUserPlan } from '@/lib/db';

/**
 * POST /api/stripe/webhook — Handles Stripe webhook events.
 *
 * Events handled:
 * - checkout.session.completed → add credits or upgrade plan
 * - invoice.payment_succeeded → monthly credit reset for subscribers
 * - customer.subscription.deleted → downgrade to free
 */
export async function POST(req: NextRequest) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeKey) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(stripeKey);

        let event;

        if (webhookSecret) {
            // Verify webhook signature in production
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } else {
            // In development, parse without verification
            event = JSON.parse(body);
            console.warn('[Stripe Webhook] No webhook secret configured — skipping signature verification');
        }

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata?.userId;

                if (!userId) {
                    console.error('[Stripe Webhook] No userId in session metadata');
                    break;
                }

                if (session.metadata?.packId) {
                    // Credit pack purchase
                    const credits = parseInt(session.metadata.credits || '0', 10);
                    if (credits > 0) {
                        await addUserCredits(
                            userId,
                            credits,
                            `purchase:${session.metadata.packId}`,
                            JSON.stringify({ sessionId: session.id, amount: session.amount_total })
                        );
                        console.log(`[Stripe] Added ${credits} credits for user ${userId}`);
                    }
                } else if (session.metadata?.planId) {
                    // Plan subscription
                    const planId = session.metadata.planId;
                    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
                    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

                    await updateUserPlan(
                        userId,
                        planId,
                        customerId || undefined,
                        subscriptionId || undefined
                    );
                    console.log(`[Stripe] Upgraded user ${userId} to ${planId}`);
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                // Monthly subscription renewal — credits already managed by plan
                const invoice = event.data.object;
                const customerId = typeof invoice.customer === 'string' ? invoice.customer : '';

                if (customerId && invoice.billing_reason === 'subscription_cycle') {
                    console.log(`[Stripe] Monthly renewal for customer ${customerId}`);
                    // The monthly reset will be handled by a scheduled function
                    // that checks reset_at dates, not by the webhook
                }
                break;
            }

            case 'customer.subscription.deleted': {
                // Downgrade to free
                const subscription = event.data.object;
                const userId = subscription.metadata?.userId;

                if (userId) {
                    await updateUserPlan(userId, 'free');
                    console.log(`[Stripe] Downgraded user ${userId} to free`);
                }
                break;
            }

            default:
                console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('[Stripe Webhook] Error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 400 }
        );
    }
}
