import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
    listCreations,
    insertCreation,
    deleteCreation,
    getCreation,
    insertDriveFile,
} from '@/lib/db';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

/* ── Auth helper ── */
async function getUser() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
}

/* ── Tool → Drive folder mapping ── */
function toolToFolder(tool: string): string {
    const map: Record<string, string> = {
        music: 'audio',
        docs: 'documents',
        slides: 'documents',
        sheets: 'documents',
        designer: 'images',
        developer: 'documents',
        'meeting-notes': 'documents',
        podcasts: 'audio',
        image: 'images',
        video: 'video',
    };
    return map[tool] || 'documents';
}

function toolToMime(tool: string): string {
    const map: Record<string, string> = {
        music: 'audio/wav',
        docs: 'text/markdown',
        slides: 'text/markdown',
        sheets: 'application/json',
        designer: 'image/svg+xml',
        developer: 'text/html',
        'meeting-notes': 'text/plain',
        podcasts: 'text/plain',
        image: 'image/png',
        video: 'video/mp4',
    };
    return map[tool] || 'text/plain';
}

function toolToDriveType(tool: string): string {
    const map: Record<string, string> = {
        music: 'audio',
        docs: 'document',
        slides: 'slides',
        sheets: 'spreadsheet',
        designer: 'image',
        developer: 'code',
        'meeting-notes': 'document',
        podcasts: 'audio',
        image: 'image',
        video: 'video',
    };
    return map[tool] || 'document';
}

/* ── GET: List creations for a tool ── */
export async function GET(request: NextRequest) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tool = request.nextUrl.searchParams.get('tool');
    if (!tool) return NextResponse.json({ error: 'Missing tool parameter' }, { status: 400 });

    const creations = listCreations(user.id, tool);
    return NextResponse.json({ creations });
}

/* ── POST: Save a new creation ── */
export async function POST(request: NextRequest) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { tool, title, metadata, content, binaryBase64 } = body as {
        tool: string;
        title: string;
        metadata?: Record<string, unknown>;
        content?: string;
        binaryBase64?: string; // base64-encoded binary data (audio, images)
    };

    if (!tool || !title) {
        return NextResponse.json({ error: 'Missing tool or title' }, { status: 400 });
    }

    const creationId = randomUUID();
    const driveFileId = randomUUID();
    let filePath: string | null = null;
    let sizeBytes = 0;

    // If there's binary data, save to disk
    if (binaryBase64) {
        const uploadDir = path.resolve(process.cwd(), `./uploads/${user.id}`);
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const ext = tool === 'music' ? '.wav' : tool === 'designer' ? '.svg' : tool === 'image' ? '.png' : '.bin';
        const diskFilename = `${creationId}${ext}`;
        filePath = path.join(uploadDir, diskFilename);

        const buffer = Buffer.from(binaryBase64, 'base64');
        fs.writeFileSync(filePath, buffer);
        sizeBytes = buffer.length;
    } else if (content) {
        // Save text content to disk too so Drive can serve it
        const uploadDir = path.resolve(process.cwd(), `./uploads/${user.id}`);
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const ext = tool === 'docs' || tool === 'slides' ? '.md' : tool === 'sheets' ? '.json' : tool === 'developer' ? '.html' : '.txt';
        const diskFilename = `${creationId}${ext}`;
        filePath = path.join(uploadDir, diskFilename);

        fs.writeFileSync(filePath, content, 'utf-8');
        sizeBytes = Buffer.byteLength(content, 'utf-8');
    }

    // Register in drive_files so it appears in Drive
    const mime = toolToMime(tool);
    const fileName = `${title}${filePath ? path.extname(filePath) : ''}`;

    insertDriveFile({
        id: driveFileId,
        user_id: user.id,
        name: fileName,
        type: toolToDriveType(tool),
        source: `AI ${tool.charAt(0).toUpperCase() + tool.slice(1)}`,
        size_bytes: sizeBytes,
        mime_type: mime,
        folder: toolToFolder(tool),
        is_favorite: 0,
        disk_path: filePath,
    });

    // Insert creation record
    insertCreation({
        id: creationId,
        user_id: user.id,
        tool,
        title,
        metadata: JSON.stringify(metadata || {}),
        content: content || '',
        file_path: filePath,
        drive_file_id: driveFileId,
    });

    return NextResponse.json({ success: true, creationId, driveFileId });
}

/* ── DELETE: Remove a creation ── */
export async function DELETE(request: NextRequest) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { creationId } = await request.json();
    if (!creationId) return NextResponse.json({ error: 'Missing creationId' }, { status: 400 });

    // Get the creation to clean up disk file
    const creation = getCreation(creationId, user.id);
    if (creation?.file_path && fs.existsSync(creation.file_path)) {
        fs.unlinkSync(creation.file_path);
    }

    deleteCreation(creationId, user.id);
    return NextResponse.json({ success: true });
}
