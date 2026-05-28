'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import './inbox.css';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useSession } from '@/lib/auth-client';
import { Id } from '../../../../convex/_generated/dataModel';
interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    body: string;
    icon: string;
    color: string;
    is_read: number;
    is_archived: number;
    link: string | null;
    created_at: string;
}

/* ── Constants ── */
const CATEGORIES = [
    { id: 'all', label: 'All', icon: '📬' },
    { id: 'activity', label: 'Activity', icon: '⚡' },
    { id: 'system', label: 'System', icon: '⚙️' },
    { id: 'alert', label: 'Alerts', icon: '🔔' },
];

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr + 'Z');
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
}

/* ── Main Page ── */
export default function InboxPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    const { data: sessionData } = useSession();
    const userId = sessionData?.user?.id;

    // Convex queries
    const rawNotifications = useQuery(api.notifications.listNotifications, userId ? {
        userId,
        type: activeCategory !== 'all' ? activeCategory : undefined,
        showArchived: showArchived
    } : "skip");

    const unreadCountConvex = useQuery(api.notifications.getUnreadNotificationCount, userId ? { userId } : "skip");
    
    const updateNotif = useMutation(api.notifications.updateNotification);
    const markAllReadMutation = useMutation(api.notifications.markAllNotificationsRead);

    useEffect(() => {
        if (rawNotifications !== undefined) {
            setLoading(false);
            const notifs = rawNotifications.map(n => ({
                id: n._id,
                user_id: n.user_id,
                type: n.type,
                title: n.title,
                body: n.body,
                icon: n.icon,
                color: n.color,
                is_read: n.is_read,
                is_archived: n.is_archived,
                link: n.link,
                created_at: new Date(n._creationTime).toISOString()
            }));
            setNotifications(notifs);
            setUnreadCount(unreadCountConvex || 0);
        }
    }, [rawNotifications, unreadCountConvex]);

    /* ── Actions ── */
    const markRead = async (notifId: string) => {
        if (!userId) return;
        await updateNotif({ notifId: notifId as Id<"notifications">, userId, isRead: 1 });
    };

    const markAllRead = async () => {
        if (!userId) return;
        await markAllReadMutation({ userId });
    };

    const archiveNotif = async (notifId: string) => {
        if (!userId) return;
        await updateNotif({ notifId: notifId as Id<"notifications">, userId, isArchived: 1 });
        if (selectedNotif?.id === notifId) setSelectedNotif(null);
    };

    const openNotif = (notif: Notification) => {
        if (notif.is_read === 0) markRead(notif.id);
        setSelectedNotif(notif);
    };

    /* ── Derived ── */
    const displayNotifs = notifications;

    return (
        <div className="inbox-page animate-fade-in-up">
            {/* ── Sidebar ── */}
            <aside className="inbox-sidebar">
                <div className="inbox-sidebar__header">
                    <h3>Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="inbox-sidebar__unread-badge">{unreadCount}</span>
                    )}
                </div>

                <div className="inbox-sidebar__categories">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            className={`inbox-sidebar__item ${activeCategory === cat.id ? 'active' : ''}`}
                            onClick={() => { setActiveCategory(cat.id); setSelectedNotif(null); }}
                        >
                            <span className="inbox-sidebar__item-icon">{cat.icon}</span>
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="inbox-sidebar__divider" />

                <button
                    className={`inbox-sidebar__item ${showArchived ? 'active' : ''}`}
                    onClick={() => { setShowArchived(!showArchived); setSelectedNotif(null); }}
                >
                    <span className="inbox-sidebar__item-icon">📦</span>
                    {showArchived ? 'Hide Archived' : 'Show Archived'}
                </button>

                {unreadCount > 0 && (
                    <button className="inbox-sidebar__mark-all" onClick={markAllRead}>
                        ✓ Mark all as read
                    </button>
                )}
            </aside>

            {/* ── Main ── */}
            <div className="inbox-main">
                {selectedNotif ? (
                    /* ── Detail View ── */
                    <div className="inbox-detail animate-fade-in-up">
                        <div className="inbox-detail__toolbar">
                            <button className="inbox-detail__back" onClick={() => setSelectedNotif(null)}>
                                ← Back
                            </button>
                            <div className="inbox-detail__toolbar-spacer" />
                            <button className="inbox-detail__action" onClick={() => archiveNotif(selectedNotif.id)}>
                                📦 Archive
                            </button>
                        </div>

                        <div className="inbox-detail__content">
                            <div className="inbox-detail__icon-wrap" style={{ background: `${selectedNotif.color}18` }}>
                                <span style={{ fontSize: '2rem' }}>{selectedNotif.icon}</span>
                            </div>
                            <h2 className="inbox-detail__title">{selectedNotif.title}</h2>
                            <div className="inbox-detail__meta">
                                <span className="inbox-detail__type-badge" style={{ background: `${selectedNotif.color}18`, color: selectedNotif.color }}>
                                    {selectedNotif.type}
                                </span>
                                <span className="inbox-detail__time">{timeAgo(selectedNotif.created_at)}</span>
                            </div>
                            <div className="inbox-detail__body">
                                {selectedNotif.body.split('\n').map((line, i) => (
                                    <p key={i}>{line || <br />}</p>
                                ))}
                            </div>
                            {selectedNotif.link && (
                                <Link href={selectedNotif.link} className="inbox-detail__link-btn">
                                    Open →
                                </Link>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ── List View ── */
                    <>
                        {/* Stats bar */}
                        <div className="inbox-stats">
                            <div className="inbox-stat">
                                <span className="inbox-stat__number">{unreadCount}</span>
                                <span className="inbox-stat__label">Unread</span>
                            </div>
                            <div className="inbox-stat">
                                <span className="inbox-stat__number">{notifications.length}</span>
                                <span className="inbox-stat__label">Total</span>
                            </div>
                        </div>

                        {/* AI Summary (when unread items exist) */}
                        {unreadCount > 0 && !showArchived && (
                            <div className="inbox-ai-summary">
                                <span className="inbox-ai-summary__icon">✨</span>
                                <div className="inbox-ai-summary__text">
                                    <strong>Summary:</strong>{' '}
                                    You have <strong>{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</strong>.
                                    {notifications.filter(n => !n.is_read && n.type === 'alert').length > 0 && (
                                        <> Including {notifications.filter(n => !n.is_read && n.type === 'alert').length} alert{notifications.filter(n => !n.is_read && n.type === 'alert').length !== 1 ? 's' : ''} that may need attention.</>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Notification List */}
                        <div className="inbox-list">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="inbox-notif inbox-notif--skeleton">
                                        <div className="inbox-notif__icon-skeleton skeleton-shimmer" />
                                        <div className="inbox-notif__content-skeleton">
                                            <div className="skeleton-shimmer" style={{ height: 14, width: '60%', borderRadius: 4 }} />
                                            <div className="skeleton-shimmer" style={{ height: 10, width: '80%', borderRadius: 4, marginTop: 8 }} />
                                        </div>
                                    </div>
                                ))
                            ) : displayNotifs.length === 0 ? (
                                <div className="inbox-empty">
                                    <div className="inbox-empty__icon">
                                        {showArchived ? '📦' : '🎉'}
                                    </div>
                                    <div className="inbox-empty__title">
                                        {showArchived ? 'No archived notifications' : 'All caught up!'}
                                    </div>
                                    <div className="inbox-empty__desc">
                                        {showArchived
                                            ? 'Archived notifications will appear here.'
                                            : 'No new notifications right now. Keep creating and they will show up here.'}
                                    </div>
                                </div>
                            ) : (
                                displayNotifs.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`inbox-notif ${notif.is_read ? '' : 'unread'}`}
                                        onClick={() => openNotif(notif)}
                                    >
                                        <div className="inbox-notif__icon" style={{ background: `${notif.color}18` }}>
                                            {notif.icon}
                                        </div>
                                        <div className="inbox-notif__content">
                                            <div className="inbox-notif__header">
                                                <span className="inbox-notif__title">{notif.title}</span>
                                                <span className="inbox-notif__time">{timeAgo(notif.created_at)}</span>
                                            </div>
                                            <div className="inbox-notif__body">{notif.body}</div>
                                            <div className="inbox-notif__footer">
                                                <span className="inbox-notif__type" style={{ background: `${notif.color}18`, color: notif.color }}>
                                                    {notif.type}
                                                </span>
                                                {!notif.is_read && <span className="inbox-notif__unread-dot" />}
                                            </div>
                                        </div>
                                        <button
                                            className="inbox-notif__archive-btn"
                                            onClick={(e) => { e.stopPropagation(); archiveNotif(notif.id); }}
                                            title="Archive"
                                        >
                                            📦
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
