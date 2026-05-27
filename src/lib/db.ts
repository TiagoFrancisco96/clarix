

import Database from 'better-sqlite3';
import path from 'path';

/* ── Singleton SQLite connection (reuses auth.db) ── */
let _db: InstanceType<typeof Database> | null = null;

function getDb() {
    if (!_db) {
        const dbPath = path.resolve(process.cwd(), './auth.db');
        _db = new Database(dbPath);
        _db.pragma('journal_mode = WAL');
        _db.pragma('foreign_keys = ON');
        initTables(_db);
    }
    return _db;
}

/* ── Auto-create tables ── */
function initTables(db: InstanceType<typeof Database>) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS drive_files (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'document',
            source TEXT NOT NULL DEFAULT 'Upload',
            size_bytes INTEGER NOT NULL DEFAULT 0,
            mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
            folder TEXT NOT NULL DEFAULT 'all',
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            disk_path TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_drive_files_user ON drive_files(user_id, is_deleted);
        CREATE INDEX IF NOT EXISTS idx_drive_files_folder ON drive_files(user_id, folder, is_deleted);

        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'system',
            title TEXT NOT NULL,
            body TEXT NOT NULL DEFAULT '',
            icon TEXT NOT NULL DEFAULT '🔔',
            color TEXT NOT NULL DEFAULT '#d4a843',
            is_read INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            link TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_archived);

        CREATE TABLE IF NOT EXISTS user_creations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            tool TEXT NOT NULL,
            title TEXT NOT NULL,
            metadata TEXT NOT NULL DEFAULT '{}',
            content TEXT NOT NULL DEFAULT '',
            file_path TEXT,
            drive_file_id TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_creations_user_tool ON user_creations(user_id, tool);
    `);
}

/* ── Types ── */
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
export function listDriveFiles(userId: string, opts?: {
    folder?: string;
    search?: string;
    sortBy?: 'name' | 'size' | 'modified';
    showDeleted?: boolean;
}) {
    const db = getDb();
    const conditions: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (opts?.showDeleted) {
        conditions.push('is_deleted = 1');
    } else {
        conditions.push('is_deleted = 0');
    }

    if (opts?.folder && opts.folder !== 'all') {
        conditions.push('folder = ?');
        params.push(opts.folder);
    }

    if (opts?.search) {
        conditions.push('(name LIKE ? OR source LIKE ? OR type LIKE ?)');
        const q = `%${opts.search}%`;
        params.push(q, q, q);
    }

    let orderClause = 'ORDER BY updated_at DESC';
    if (opts?.sortBy === 'name') orderClause = 'ORDER BY name ASC';
    if (opts?.sortBy === 'size') orderClause = 'ORDER BY size_bytes DESC';

    return db.prepare(`SELECT * FROM drive_files WHERE ${conditions.join(' AND ')} ${orderClause}`).all(...params) as DriveFileRow[];
}

export function getDriveFile(fileId: string, userId: string) {
    const db = getDb();
    return db.prepare('SELECT * FROM drive_files WHERE id = ? AND user_id = ?').get(fileId, userId) as DriveFileRow | undefined;
}

export function insertDriveFile(file: Omit<DriveFileRow, 'created_at' | 'updated_at' | 'is_deleted'>) {
    const db = getDb();
    db.prepare(`
        INSERT INTO drive_files (id, user_id, name, type, source, size_bytes, mime_type, folder, is_favorite, disk_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(file.id, file.user_id, file.name, file.type, file.source, file.size_bytes, file.mime_type, file.folder, file.is_favorite, file.disk_path);
}

export function updateDriveFile(fileId: string, userId: string, updates: Partial<Pick<DriveFileRow, 'name' | 'folder' | 'is_favorite' | 'is_deleted'>>) {
    const db = getDb();
    const sets: string[] = ["updated_at = datetime('now')"];
    const params: unknown[] = [];

    if (updates.name !== undefined) { sets.push('name = ?'); params.push(updates.name); }
    if (updates.folder !== undefined) { sets.push('folder = ?'); params.push(updates.folder); }
    if (updates.is_favorite !== undefined) { sets.push('is_favorite = ?'); params.push(updates.is_favorite); }
    if (updates.is_deleted !== undefined) { sets.push('is_deleted = ?'); params.push(updates.is_deleted); }

    params.push(fileId, userId);
    db.prepare(`UPDATE drive_files SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
}

export function permanentDeleteDriveFile(fileId: string, userId: string) {
    const db = getDb();
    db.prepare('DELETE FROM drive_files WHERE id = ? AND user_id = ?').run(fileId, userId);
}

export function getDriveStorageUsed(userId: string): number {
    const db = getDb();
    const row = db.prepare('SELECT COALESCE(SUM(size_bytes), 0) as total FROM drive_files WHERE user_id = ? AND is_deleted = 0').get(userId) as { total: number };
    return row.total;
}

export function getDriveFolderCounts(userId: string): Record<string, number> {
    const db = getDb();
    const rows = db.prepare('SELECT folder, COUNT(*) as count FROM drive_files WHERE user_id = ? AND is_deleted = 0 GROUP BY folder').all(userId) as { folder: string; count: number }[];
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.folder] = r.count;
    return counts;
}

/* ── Notification queries ── */
export function listNotifications(userId: string, opts?: {
    type?: string;
    unreadOnly?: boolean;
    showArchived?: boolean;
}) {
    const db = getDb();
    const conditions: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (!opts?.showArchived) {
        conditions.push('is_archived = 0');
    }
    if (opts?.type && opts.type !== 'all') {
        conditions.push('type = ?');
        params.push(opts.type);
    }
    if (opts?.unreadOnly) {
        conditions.push('is_read = 0');
    }

    return db.prepare(`SELECT * FROM notifications WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`).all(...params) as NotificationRow[];
}

export function insertNotification(n: Omit<NotificationRow, 'created_at' | 'is_read' | 'is_archived'>) {
    const db = getDb();
    db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, body, icon, color, link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(n.id, n.user_id, n.type, n.title, n.body, n.icon, n.color, n.link);
}

export function updateNotification(notifId: string, userId: string, updates: Partial<Pick<NotificationRow, 'is_read' | 'is_archived'>>) {
    const db = getDb();
    const sets: string[] = [];
    const params: unknown[] = [];

    if (updates.is_read !== undefined) { sets.push('is_read = ?'); params.push(updates.is_read); }
    if (updates.is_archived !== undefined) { sets.push('is_archived = ?'); params.push(updates.is_archived); }

    if (sets.length === 0) return;
    params.push(notifId, userId);
    db.prepare(`UPDATE notifications SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
}

export function markAllNotificationsRead(userId: string) {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
}

export function getUnreadNotificationCount(userId: string): number {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0 AND is_archived = 0').get(userId) as { count: number };
    return row.count;
}

export function hasWelcomeNotification(userId: string): boolean {
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND type = 'system' AND title LIKE '%Welcome%'").get(userId) as { count: number };
    return row.count > 0;
}

/* ── Creation types ── */
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

/* ── Creation queries ── */
export function listCreations(userId: string, tool: string) {
    const db = getDb();
    return db.prepare('SELECT * FROM user_creations WHERE user_id = ? AND tool = ? ORDER BY created_at DESC').all(userId, tool) as CreationRow[];
}

export function getCreation(creationId: string, userId: string) {
    const db = getDb();
    return db.prepare('SELECT * FROM user_creations WHERE id = ? AND user_id = ?').get(creationId, userId) as CreationRow | undefined;
}

export function insertCreation(c: Omit<CreationRow, 'created_at' | 'updated_at'>) {
    const db = getDb();
    db.prepare(`
        INSERT INTO user_creations (id, user_id, tool, title, metadata, content, file_path, drive_file_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(c.id, c.user_id, c.tool, c.title, c.metadata, c.content, c.file_path, c.drive_file_id);
}

export function deleteCreation(creationId: string, userId: string) {
    const db = getDb();
    db.prepare('DELETE FROM user_creations WHERE id = ? AND user_id = ?').run(creationId, userId);
}
