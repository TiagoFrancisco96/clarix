'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Creation {
    id: string;
    user_id: string;
    tool: string;
    title: string;
    metadata: Record<string, unknown>;
    content: string;
    file_path: string | null;
    drive_file_id: string | null;
    created_at: string;
    updated_at: string;
}

interface SaveCreationInput {
    title: string;
    metadata?: Record<string, unknown>;
    content?: string;
    binaryBase64?: string;
}

export function useCreations(tool: string) {
    const [creations, setCreations] = useState<Creation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch(`/api/creations?tool=${encodeURIComponent(tool)}`);
            if (res.ok) {
                const data = await res.json();
                const parsed = (data.creations || []).map((c: Creation & { metadata: string }) => ({
                    ...c,
                    metadata: typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata,
                }));
                setCreations(parsed);
            }
        } catch (err) {
            console.error('Failed to load creations:', err);
        } finally {
            setIsLoading(false);
        }
    }, [tool]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const saveCreation = useCallback(async (input: SaveCreationInput): Promise<{ creationId: string; driveFileId: string } | null> => {
        try {
            const res = await fetch('/api/creations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tool, ...input }),
            });
            if (res.ok) {
                const data = await res.json();
                // Refresh the list
                refresh();
                return { creationId: data.creationId, driveFileId: data.driveFileId };
            }
        } catch (err) {
            console.error('Failed to save creation:', err);
        }
        return null;
    }, [tool, refresh]);

    const removeCreation = useCallback(async (creationId: string) => {
        try {
            await fetch('/api/creations', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creationId }),
            });
            setCreations(prev => prev.filter(c => c.id !== creationId));
        } catch (err) {
            console.error('Failed to delete creation:', err);
        }
    }, []);

    return { creations, isLoading, saveCreation, removeCreation, refresh };
}
