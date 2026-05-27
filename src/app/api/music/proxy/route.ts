import { NextRequest, NextResponse } from 'next/server';

/* ── Audio Proxy ──
 *  Downloads full audio from Suno CDN, then serves it locally.
 *  Handles Range requests for browser <audio> element compatibility.
 * ────────────────────────────────────────────────────────── */

export const runtime = 'nodejs';

// Simple in-memory cache to avoid re-downloading the same file
const audioCache = new Map<string, { data: Buffer; contentType: string }>();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const audioUrl = searchParams.get('url');

        if (!audioUrl) {
            return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
        }

        // Only allow known audio CDN domains
        let url: URL;
        try {
            url = new URL(audioUrl);
        } catch {
            return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
        }

        const allowedHosts = [
            'tempfile.aiquickdraw.com',
            'cdn1.suno.ai',
            'cdn2.suno.ai',
            'audiopipe.suno.ai',
            'cdn.suno.ai',
        ];
        if (!allowedHosts.some(h => url.hostname.endsWith(h))) {
            return NextResponse.json({ error: 'Audio URL domain not allowed' }, { status: 403 });
        }

        // Check cache first
        let cached = audioCache.get(audioUrl);
        
        if (!cached) {
            // Fetch the FULL file from CDN (no Range header!)
            console.log('[Music Proxy] Downloading full audio from CDN...');
            const audioResponse = await fetch(audioUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*',
                },
            });

            if (!audioResponse.ok) {
                console.error('[Music Proxy] CDN returned:', audioResponse.status);
                return NextResponse.json(
                    { error: `CDN error: ${audioResponse.status}` },
                    { status: audioResponse.status }
                );
            }

            const arrayBuf = await audioResponse.arrayBuffer();
            const data = Buffer.from(arrayBuf);
            const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
            
            console.log('[Music Proxy] Downloaded', data.length, 'bytes, type:', contentType);
            
            cached = { data, contentType };
            audioCache.set(audioUrl, cached);
            
            // Evict cache after 10 minutes to prevent memory leaks
            setTimeout(() => audioCache.delete(audioUrl), 10 * 60 * 1000);
        }

        const { data, contentType } = cached;
        const totalSize = data.length;

        // Handle Range requests from the browser
        const rangeHeader = req.headers.get('range');
        
        if (rangeHeader) {
            const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
            if (match) {
                const start = parseInt(match[1]);
                const end = match[2] ? Math.min(parseInt(match[2]), totalSize - 1) : totalSize - 1;
                const chunk = data.subarray(start, end + 1);

                return new NextResponse(new Uint8Array(chunk), {
                    status: 206,
                    headers: {
                        'Content-Type': contentType,
                        'Content-Length': chunk.length.toString(),
                        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
                        'Accept-Ranges': 'bytes',
                        'Cache-Control': 'public, max-age=3600',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }
        }

        // Check if this is a download request
        const downloadName = searchParams.get('download');

        // Extract a filename from the URL path
        const urlPath = url.pathname.split('/').pop() || 'track.mp3';
        const filename = downloadName || (urlPath.endsWith('.mp3') ? urlPath : `${urlPath}.mp3`);
        const disposition = downloadName ? 'attachment' : 'inline';

        // No range — return full file
        return new NextResponse(new Uint8Array(data), {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Length': totalSize.toString(),
                'Accept-Ranges': 'bytes',
                'Content-Disposition': `${disposition}; filename="${filename}"`,
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('[Music Proxy] Error:', error);
        return NextResponse.json(
            { error: 'Failed to proxy audio' },
            { status: 500 }
        );
    }
}
