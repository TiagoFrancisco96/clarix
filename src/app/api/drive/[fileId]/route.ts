import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getDriveFile, updateDriveFile } from '@/lib/db';
import fs from 'fs';

/* ── Auth helper ── */
async function getUser() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
}

/* ── GET: Download / serve file ── */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ fileId: string }> }
) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileId } = await params;
    const file = getDriveFile(fileId, user.id);
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });
    if (!file.disk_path || !fs.existsSync(file.disk_path)) {
        return NextResponse.json({ error: 'File data missing' }, { status: 404 });
    }

    const buffer = fs.readFileSync(file.disk_path);
    return new NextResponse(buffer, {
        headers: {
            'Content-Type': file.mime_type,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
            'Content-Length': String(file.size_bytes),
        },
    });
}

/* ── PATCH: Update file metadata ── */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ fileId: string }> }
) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileId } = await params;
    const body = await request.json();
    const updates: Partial<{ name: string; folder: string; is_favorite: number; is_deleted: number }> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.folder !== undefined) updates.folder = body.folder;
    if (body.is_favorite !== undefined) updates.is_favorite = body.is_favorite ? 1 : 0;
    if (body.is_deleted !== undefined) updates.is_deleted = body.is_deleted ? 1 : 0;

    updateDriveFile(fileId, user.id, updates);
    return NextResponse.json({ success: true });
}
