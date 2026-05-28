import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

export interface DriveFileRow {
    id: string;
    user_id: string;
    name: string;
    type: string;
    source: string;
    size_bytes: number;
    mime_type: string;
    folder: string;
    is_favorite: number;
    is_deleted: number;
    disk_path: string | null;
    created_at: string;
    updated_at: string;
}

export interface NotificationRow {
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

/* ── Drive queries ── */
export async function listDriveFiles(userId: string, opts?: { folder?: string; search?: string; sortBy?: 'name' | 'size' | 'modified'; showDeleted?: boolean; }) {
    const files = await convex.query(api.drive.listDriveFiles, {
        userId,
        folder: opts?.folder !== 'all' ? opts?.folder : undefined,
        search: opts?.search,
        sortBy: opts?.sortBy,
        showDeleted: opts?.showDeleted
    });
    return files.map((f) => ({ ...f, id: f._id }));
}

export async function getDriveFile(fileId: string, userId: string) {
    const file = await convex.query(api.drive.getDriveFile, { fileId: fileId as Id<"drive_files">, userId });
    return file ? { ...file, id: file._id } : undefined;
}

export async function insertDriveFile(file: Omit<DriveFileRow, 'created_at' | 'updated_at' | 'is_deleted'>) {
    await convex.mutation(api.drive.insertDriveFile, {
        userId: file.user_id,
        name: file.name,
        type: file.type,
        source: file.source,
        sizeBytes: file.size_bytes,
        mimeType: file.mime_type,
        folder: file.folder,
        isFavorite: file.is_favorite,
        diskPath: file.disk_path
    });
}

export async function updateDriveFile(fileId: string, userId: string, updates: Partial<Pick<DriveFileRow, 'name' | 'folder' | 'is_favorite' | 'is_deleted'>>) {
    await convex.mutation(api.drive.updateDriveFile, {
        fileId: fileId as Id<"drive_files">,
        userId,
        name: updates.name,
        folder: updates.folder,
        isFavorite: updates.is_favorite,
        isDeleted: updates.is_deleted
    });
}

export async function permanentDeleteDriveFile(fileId: string, userId: string) {
    await convex.mutation(api.drive.permanentDeleteDriveFile, { fileId: fileId as Id<"drive_files">, userId });
}

export async function getDriveStorageUsed(userId: string) {
    return await convex.query(api.drive.getDriveStorageUsed, { userId });
}

export async function getDriveFolderCounts(userId: string) {
    return await convex.query(api.drive.getDriveFolderCounts, { userId });
}

/* ── Notification queries ── */
export async function listNotifications(userId: string, opts?: { type?: string; unreadOnly?: boolean; showArchived?: boolean }) {
    const notifs = await convex.query(api.notifications.listNotifications, {
        userId,
        type: opts?.type,
        unreadOnly: opts?.unreadOnly,
        showArchived: opts?.showArchived
    });
    return notifs.map((n) => ({ ...n, id: n._id }));
}

export async function insertNotification(n: Omit<NotificationRow, 'created_at' | 'is_read' | 'is_archived' | 'id'>) {
    await convex.mutation(api.notifications.insertNotification, {
        userId: n.user_id,
        type: n.type,
        title: n.title,
        body: n.body,
        icon: n.icon,
        color: n.color,
        link: n.link
    });
}

export async function updateNotification(id: string, userId: string, action: 'read' | 'archive') {
    if (action === 'read') {
        await convex.mutation(api.notifications.updateNotification, { notifId: id as Id<"notifications">, userId, isRead: 1 });
    } else if (action === 'archive') {
        await convex.mutation(api.notifications.updateNotification, { notifId: id as Id<"notifications">, userId, isArchived: 1 });
    }
}

export async function markAllNotificationsRead(userId: string) {
    await convex.mutation(api.notifications.markAllNotificationsRead, { userId });
}

export async function getUnreadNotificationCount(userId: string) {
    return await convex.query(api.notifications.getUnreadNotificationCount, { userId });
}

export async function hasWelcomeNotification(userId: string) {
    return await convex.query(api.notifications.hasWelcomeNotification, { userId });
}

/* ── Creations queries ── */
export interface CreationRow {
    id: string;
    user_id: string;
    tool: string;
    title: string;
    metadata: string;
    content: string;
    file_path: string | null;
    drive_file_id: string | null;
    created_at: string;
    updated_at: string;
}

export async function insertCreation(c: Omit<CreationRow, 'created_at' | 'updated_at'>) {
    await convex.mutation(api.creations.insertCreation, {
        userId: c.user_id,
        tool: c.tool,
        title: c.title,
        metadata: c.metadata,
        content: c.content,
        filePath: c.file_path,
        driveFileId: c.drive_file_id
    });
}

export async function listCreations(userId: string, tool: string) {
    const c = await convex.query(api.creations.listCreations, { userId, tool });
    return c.map((cr) => ({ ...cr, id: cr._id }));
}

export async function getCreation(creationId: string, userId: string) {
    const c = await convex.query(api.creations.getCreation, { creationId: creationId as Id<"user_creations">, userId });
    return c ? { ...c, id: c._id } : undefined;
}

export async function deleteCreation(creationId: string, userId: string) {
    await convex.mutation(api.creations.deleteCreation, { creationId: creationId as Id<"user_creations">, userId });
}

export async function logTelemetryError(err: {
    message: string;
    stack?: string;
    severity: string;
    component: string;
    metadata?: string;
    userId?: string;
}) {
    return await convex.mutation(api.errorTracking.logError, {
        message: err.message,
        stack: err.stack,
        severity: err.severity,
        component: err.component,
        metadata: err.metadata,
        userId: err.userId,
    });
}

/* ── Credits queries ── */
export async function getUserCredits(userId: string) {
    return await convex.query(api.credits.getBalance, { userId });
}

export async function initUserCredits(userId: string) {
    return await convex.mutation(api.credits.initUserCredits, { userId });
}

export async function deductUserCredits(userId: string, amount: number, reason: string, metadata?: string) {
    return await convex.mutation(api.credits.deductCredits, { userId, amount, reason, metadata });
}

export async function addUserCredits(userId: string, amount: number, reason: string, metadata?: string) {
    return await convex.mutation(api.credits.addCredits, { userId, amount, reason, metadata });
}

export async function updateUserPlan(userId: string, plan: string, stripeCustomerId?: string, stripeSubscriptionId?: string) {
    return await convex.mutation(api.credits.updatePlan, { userId, plan, stripeCustomerId, stripeSubscriptionId });
}

export async function getCreditLedger(userId: string, limit?: number) {
    return await convex.query(api.credits.getLedger, { userId, limit });
}
