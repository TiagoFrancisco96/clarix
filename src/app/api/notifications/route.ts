import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
    listNotifications,
    insertNotification,
    updateNotification,
    markAllNotificationsRead,
    getUnreadNotificationCount,
    hasWelcomeNotification,
} from '@/lib/db';
import { randomUUID } from 'crypto';

/* ── Auth helper ── */
async function getUser() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
}

/* ── Welcome notifications for new users ── */
/* ── Welcome notifications for new users ── */
async function createWelcomeNotifications(userId: string) {
    const welcome = [
        {
            type: 'system',
            title: 'Welcome to Clarix!',
            body: 'Your AI workspace is ready. Start creating with Chat, Image, Docs, and 12+ more tools — all powered by the best AI models.',
            icon: '⚡',
            color: '#d4a843',
            link: '/chat',
        },
        {
            type: 'system',
            title: 'Upload files to Drive',
            body: 'Drag and drop files into Drive, or create content with any AI tool — it\'ll automatically show up here.',
            icon: '📁',
            color: '#4a9eff',
            link: '/drive',
        },
        {
            type: 'system',
            title: 'Credits & Usage',
            body: 'You start with 200 free credits. Each AI operation costs credits based on the model used. Check your balance in the sidebar.',
            icon: '💳',
            color: '#10b981',
            link: null,
        },
    ];

    for (const n of welcome) {
        await insertNotification({
            user_id: userId,
            type: n.type,
            title: n.title,
            body: n.body,
            icon: n.icon,
            color: n.color,
            link: n.link,
        });
    }
}

/* ── GET: List notifications ── */
export async function GET(request: NextRequest) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Auto-create welcome notifications for first-time users
    const hasWelcome = await hasWelcomeNotification(user.id);
    if (!hasWelcome) {
        await createWelcomeNotifications(user.id);
    }

    const sp = request.nextUrl.searchParams;
    const type = sp.get('type') || undefined;
    const unreadOnly = sp.get('unread') === '1';
    const showArchived = sp.get('archived') === '1';

    const notifications = await listNotifications(user.id, { type, unreadOnly, showArchived });
    const unreadCount = await getUnreadNotificationCount(user.id);

    return NextResponse.json({ notifications, unreadCount });
}

/* ── POST: Create notification ── */
export async function POST(request: NextRequest) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { type, title, message, icon, color, link } = body;

    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

    await insertNotification({
        user_id: user.id,
        type: type || 'activity',
        title,
        body: message || '',
        icon: icon || '🔔',
        color: color || '#d4a843',
        link: link || null,
    });

    return NextResponse.json({ success: true });
}

/* ── PATCH: Update notifications ── */
export async function PATCH(request: NextRequest) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { notificationId, action } = body;

    if (action === 'mark_all_read') {
        await markAllNotificationsRead(user.id);
        return NextResponse.json({ success: true });
    }

    if (!notificationId) return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 });

    if (action === 'read') {
        await updateNotification(notificationId, user.id, 'read');
    } else if (action === 'archive') {
        await updateNotification(notificationId, user.id, 'archive');
    } else {
        return NextResponse.json({ error: `Unknown action or unsupported: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
