import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
    listDriveFiles,
    insertDriveFile,
    updateDriveFile,
    getDriveStorageUsed,
    getDriveFolderCounts,
} from '@/lib/db';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

/* ── Auth helper ── */
async function getUser() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
}

/* ── Mime → type mapping ── */
function mimeToType(mime: string): string {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('video/')) return 'video';
    if (mime.includes('spreadsheet') || mime.includes('csv') || mime.includes('excel')) return 'spreadsheet';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slides';
    if (mime.includes('javascript') || mime.includes('typescript') || mime.includes('python') || mime.includes('json') || mime.includes('xml') || mime.includes('html') || mime.includes('css')) return 'code';
    if (mime.includes('pdf') || mime.includes('document') || mime.includes('text') || mime.includes('markdown')) return 'document';
    return 'document';
}

/* ── GET: List files ── */
export async function GET(request: NextRequest) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sp = request.nextUrl.searchParams;
    const folder = sp.get('folder') || undefined;
    const search = sp.get('search') || undefined;
    const sortBy = (sp.get('sort') as 'name' | 'size' | 'modified') || undefined;
    const showDeleted = sp.get('trash') === '1';

    const files = listDriveFiles(user.id, { folder, search, sortBy, showDeleted });
    const storageUsed = getDriveStorageUsed(user.id);
    const folderCounts = getDriveFolderCounts(user.id);
    const totalCount = Object.values(folderCounts).reduce((s, c) => s + c, 0);

    return NextResponse.json({
        files,
        storageUsed,
        folderCounts: { all: totalCount, ...folderCounts },
    });
}

/* ── POST: Upload file ── */
export async function POST(request: NextRequest) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'all';

    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Size limit: 50 MB
    if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 413 });
    }

    // Storage limit: 1 GB for free tier
    const currentUsage = getDriveStorageUsed(user.id);
    const limit = 1024 * 1024 * 1024; // 1 GB
    if (currentUsage + file.size > limit) {
        return NextResponse.json({ error: 'Storage limit exceeded. Upgrade for more space.' }, { status: 413 });
    }

    // Save to disk
    const fileId = randomUUID();
    const uploadDir = path.resolve(process.cwd(), `./uploads/${user.id}`);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || '';
    const diskFilename = `${fileId}${ext}`;
    const diskPath = path.join(uploadDir, diskFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(diskPath, buffer);

    // Insert DB record
    insertDriveFile({
        id: fileId,
        user_id: user.id,
        name: file.name,
        type: mimeToType(file.type),
        source: 'Upload',
        size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        folder,
        is_favorite: 0,
        disk_path: diskPath,
    });

    return NextResponse.json({ success: true, fileId });
}

/* ── DELETE: Trash or permanent delete ── */
export async function DELETE(request: NextRequest) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileId, permanent } = await request.json();
    if (!fileId) return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });

    if (permanent) {
        // TODO: also delete from disk
        const { permanentDeleteDriveFile, getDriveFile } = await import('@/lib/db');
        const file = getDriveFile(fileId, user.id);
        if (file?.disk_path && fs.existsSync(file.disk_path)) {
            fs.unlinkSync(file.disk_path);
        }
        permanentDeleteDriveFile(fileId, user.id);
    } else {
        updateDriveFile(fileId, user.id, { is_deleted: 1 });
    }

    return NextResponse.json({ success: true });
}
