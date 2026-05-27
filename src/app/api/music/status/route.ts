import { NextRequest, NextResponse } from 'next/server';

/* ── Suno Music API — Poll task status ──
 *  GET https://api.sunoapi.org/api/v1/generate/record-info?taskId=xxx
 *  Returns status + audio URLs when generation completes
 *
 *  Response shape:
 *  { code: 200, msg: "success", data: {
 *      taskId, response: { sunoData: [{ id, audioUrl, imageUrl, ... }] }
 *  }}
 * ────────────────────────────────────────────────────────── */

const SUNO_API_KEY = process.env.SUNO_API_KEY;
const SUNO_BASE_URL = 'https://api.sunoapi.org/api/v1';

export async function GET(req: NextRequest) {
    try {
        if (!SUNO_API_KEY) {
            return NextResponse.json({ error: 'SUNO_API_KEY not configured' }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const taskId = searchParams.get('taskId');

        if (!taskId) {
            return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
        }

        const response = await fetch(`${SUNO_BASE_URL}/generate/record-info?taskId=${encodeURIComponent(taskId)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SUNO_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Music] Suno query error:', response.status, errorText);
            return NextResponse.json(
                { error: `Suno API error: ${response.status}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // The sunoapi.org response shape:
        // { code: 200, msg: "success", data: {
        //     taskId: "...",
        //     response: { taskId: "...", sunoData: [{id, audioUrl, imageUrl, ...}] }
        // }}

        const taskData = data.data;
        if (!taskData) {
            return NextResponse.json({ status: 'PENDING' });
        }

        // Check for sunoData in the response
        const sunoData = taskData.response?.sunoData;

        if (!sunoData || !Array.isArray(sunoData) || sunoData.length === 0) {
            // Still processing — no songs yet
            const rawStatus = taskData.status || taskData.state || '';
            return NextResponse.json({
                status: rawStatus ? rawStatus.toString().toUpperCase() : 'PROCESSING',
            });
        }

        // Check if any song has a non-empty audioUrl (generation complete)
        const readySongs = sunoData.filter(
            (s: Record<string, unknown>) => s.audioUrl && (s.audioUrl as string).length > 10
        );

        if (readySongs.length === 0) {
            // sunoData exists but audio not ready yet (streaming in progress)
            return NextResponse.json({ status: 'PROCESSING' });
        }

        // Songs are ready!
        const songs = readySongs.map((song: Record<string, unknown>) => ({
            songId: song.id || song.songId,
            title: song.title,
            audioUrl: song.audioUrl,
            streamUrl: song.streamUrl || song.stream_url,
            imageUrl: song.imageUrl || song.image_url,
            duration: song.duration,
            lyrics: song.lyric || song.lyrics,
            style: song.modelName || song.tags,
        }));

        console.log('[Music] Songs ready:', songs.length, 'tracks');

        return NextResponse.json({
            status: 'SUCCESS',
            songs,
        });
    } catch (error) {
        console.error('[Music] Query exception:', error);
        return NextResponse.json(
            { error: 'Failed to query music status' },
            { status: 500 }
        );
    }
}
