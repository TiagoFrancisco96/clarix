'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './drive.css';

/* ── Types ── */
interface DriveFile {
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

interface DriveData {
    files: DriveFile[];
    storageUsed: number;
    folderCounts: Record<string, number>;
}

/* ── Constants ── */
const FOLDERS = [
    { id: 'all', name: 'All Files', icon: '📁' },
    { id: 'images', name: 'Images', icon: '🖼️' },
    { id: 'documents', name: 'Documents', icon: '📄' },
    { id: 'presentations', name: 'Presentations', icon: '📊' },
    { id: 'code', name: 'Code Projects', icon: '💻' },
    { id: 'media', name: 'Media', icon: '🎵' },
];

const QUICK_ACCESS = [
    { id: 'recent', name: 'Recent', icon: '🕒' },
    { id: 'favorites', name: 'Favorites', icon: '⭐' },
    { id: 'trash', name: 'Trash', icon: '🗑️' },
];

const FILE_ICONS: Record<string, string> = {
    image: '🖼️', document: '📄', spreadsheet: '📊',
    slides: '📑', code: '💻', audio: '🎵',
    video: '🎬',
};

const SOURCE_COLORS: Record<string, string> = {
    'Upload': '#64748b', 'AI Image': '#e74c3c', 'AI Docs': '#2ecc71',
    'AI Sheets': '#27ae60', 'AI Slides': '#f39c12', 'AI Developer': '#9b59b6',
    'AI Designer': '#00b894', 'AI Music': '#e84393', 'AI Video': '#6c5ce7',
    'Meeting Notes': '#00cec9',
};

function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr + 'Z');
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return date.toLocaleDateString();
}

/* ── Main Drive Page ── */
export default function DrivePage() {
    const [data, setData] = useState<DriveData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeFolder, setActiveFolder] = useState('all');
    const [activeQuick, setActiveQuick] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
    const [sortBy, setSortBy] = useState<'modified' | 'name' | 'size'>('modified');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [renamingFile, setRenamingFile] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ── Fetch files ── */
    const fetchFiles = useCallback(async () => {
        const params = new URLSearchParams();
        if (activeQuick === 'trash') {
            params.set('trash', '1');
        } else if (activeQuick === 'favorites') {
            // handled client-side after fetch
        } else if (activeFolder !== 'all') {
            params.set('folder', activeFolder);
        }
        if (searchQuery) params.set('search', searchQuery);
        params.set('sort', sortBy);

        try {
            const res = await fetch(`/api/drive?${params.toString()}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) {
            console.error('Failed to fetch drive files:', err);
        } finally {
            setLoading(false);
        }
    }, [activeFolder, activeQuick, searchQuery, sortBy]);

    useEffect(() => { fetchFiles(); }, [fetchFiles]);

    /* ── Upload handler ── */
    const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
        const files = Array.from(fileList);
        if (files.length === 0) return;

        setUploading(true);
        setUploadProgress(0);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', activeFolder === 'all' ? 'documents' : activeFolder);

            try {
                await fetch('/api/drive', { method: 'POST', body: formData });
            } catch (err) {
                console.error('Upload failed:', err);
            }
            setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        }

        setUploading(false);
        setUploadProgress(0);
        fetchFiles();
    }, [activeFolder, fetchFiles]);

    /* ── Drag & Drop ── */
    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
    const handleDragLeave = useCallback(() => setDragOver(false), []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
    }, [uploadFiles]);

    /* ── Actions ── */
    const toggleFavorite = async (fileId: string, current: number) => {
        await fetch(`/api/drive/${fileId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_favorite: !current }),
        });
        fetchFiles();
    };

    const deleteFile = async (fileId: string, permanent = false) => {
        await fetch('/api/drive', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId, permanent }),
        });
        setSelectedFile(null);
        fetchFiles();
    };

    const restoreFile = async (fileId: string) => {
        await fetch(`/api/drive/${fileId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_deleted: false }),
        });
        fetchFiles();
    };

    const renameFile = async (fileId: string) => {
        if (!renameValue.trim()) return;
        await fetch(`/api/drive/${fileId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: renameValue.trim() }),
        });
        setRenamingFile(null);
        fetchFiles();
    };

    const downloadFile = (fileId: string) => {
        window.open(`/api/drive/${fileId}`, '_blank');
    };

    /* ── Derived state ── */
    let displayFiles = data?.files || [];
    if (activeQuick === 'favorites') {
        displayFiles = displayFiles.filter(f => f.is_favorite);
    } else if (activeQuick === 'recent') {
        displayFiles = displayFiles.slice(0, 10);
    }

    const storageUsed = data?.storageUsed || 0;
    const storageLimit = 1024 * 1024 * 1024; // 1 GB
    const storagePercent = Math.min((storageUsed / storageLimit) * 100, 100);
    const folderCounts = data?.folderCounts || {};

    const handleFolderClick = (folderId: string) => { setActiveFolder(folderId); setActiveQuick(null); };
    const handleQuickClick = (quickId: string) => { setActiveQuick(quickId); setActiveFolder('all'); };
    const cycleSortBy = () => {
        const order: Array<'modified' | 'name' | 'size'> = ['modified', 'name', 'size'];
        setSortBy(order[(order.indexOf(sortBy) + 1) % order.length]);
    };

    const currentFolderName = activeQuick
        ? QUICK_ACCESS.find(q => q.id === activeQuick)?.name || 'All Files'
        : FOLDERS.find(f => f.id === activeFolder)?.name || 'All Files';

    return (
        <div
            className={`drive-page animate-fade-in-up ${dragOver ? 'drive-page--drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* ── Drag Overlay ── */}
            {dragOver && (
                <div className="drive-drag-overlay">
                    <div className="drive-drag-overlay__content">
                        <div className="drive-drag-overlay__icon">📂</div>
                        <div className="drive-drag-overlay__title">Drop files to upload</div>
                        <div className="drive-drag-overlay__desc">Files will be added to {currentFolderName}</div>
                    </div>
                </div>
            )}

            {/* ── Upload Progress ── */}
            {uploading && (
                <div className="drive-upload-bar">
                    <div className="drive-upload-bar__track">
                        <div className="drive-upload-bar__fill" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <span className="drive-upload-bar__text">Uploading... {uploadProgress}%</span>
                </div>
            )}

            {/* ── Hidden file input ── */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ''; }}
            />

            {/* ── Sidebar ── */}
            <aside className="drive-sidebar">
                <div className="drive-sidebar__title">Quick Access</div>
                {QUICK_ACCESS.map(item => (
                    <button
                        key={item.id}
                        className={`drive-sidebar__item ${activeQuick === item.id ? 'active' : ''}`}
                        onClick={() => handleQuickClick(item.id)}
                    >
                        <span className="drive-sidebar__item-icon">{item.icon}</span>
                        {item.name}
                    </button>
                ))}

                <div className="drive-sidebar__divider" />

                <div className="drive-sidebar__title">Folders</div>
                {FOLDERS.map(folder => (
                    <button
                        key={folder.id}
                        className={`drive-sidebar__item ${activeFolder === folder.id && !activeQuick ? 'active' : ''}`}
                        onClick={() => handleFolderClick(folder.id)}
                    >
                        <span className="drive-sidebar__item-icon">{folder.icon}</span>
                        {folder.name}
                        <span className="drive-sidebar__item-count">{folderCounts[folder.id] || 0}</span>
                    </button>
                ))}

                {/* Storage Meter */}
                <div className="drive-sidebar__storage">
                    <div className="drive-sidebar__storage-label">
                        <span>Storage</span>
                        <span>{formatSize(storageUsed)} / 1 GB</span>
                    </div>
                    <div className="drive-sidebar__storage-bar">
                        <div className="drive-sidebar__storage-fill" style={{ width: `${storagePercent}%` }} />
                    </div>
                </div>
            </aside>

            {/* ── Main ── */}
            <div className="drive-main">
                {/* Toolbar */}
                <div className="drive-toolbar">
                    <div className="drive-toolbar__search">
                        <svg className="drive-toolbar__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search files, folders, sources..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="drive-toolbar__spacer" />

                    <button className="drive-toolbar__sort" onClick={cycleSortBy}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M3 12h12M3 18h6" />
                        </svg>
                        {sortBy === 'modified' ? 'Recent' : sortBy === 'name' ? 'Name' : 'Size'}
                    </button>

                    <div className="drive-toolbar__view-toggle">
                        <button
                            className={`drive-toolbar__view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                            </svg>
                        </button>
                        <button
                            className={`drive-toolbar__view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                                <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                                <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                        </button>
                    </div>

                    <button className="drive-toolbar__upload" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Upload
                    </button>
                </div>

                {/* Breadcrumb */}
                <div className="drive-breadcrumb">
                    <button className="drive-breadcrumb__item" onClick={() => handleFolderClick('all')}>Drive</button>
                    {currentFolderName !== 'All Files' && (
                        <>
                            <span className="drive-breadcrumb__sep">/</span>
                            <span className="drive-breadcrumb__item current">{currentFolderName}</span>
                        </>
                    )}
                </div>

                {/* Content */}
                <div className="drive-content">
                    {loading ? (
                        /* ── Loading skeleton ── */
                        <div className="drive-grid">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="drive-file drive-file--skeleton">
                                    <div className="drive-file__preview"><div className="skeleton-shimmer" /></div>
                                    <div className="drive-file__info">
                                        <div className="skeleton-shimmer" style={{ height: 14, width: '70%', borderRadius: 4 }} />
                                        <div className="skeleton-shimmer" style={{ height: 10, width: '40%', borderRadius: 4, marginTop: 6 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : displayFiles.length === 0 ? (
                        /* ── Empty state ── */
                        <div className="drive-empty">
                            <div className="drive-empty__icon">
                                {activeQuick === 'trash' ? '🗑️' : activeQuick === 'favorites' ? '⭐' : '📂'}
                            </div>
                            <div className="drive-empty__title">
                                {activeQuick === 'trash'
                                    ? 'Trash is empty'
                                    : activeQuick === 'favorites'
                                        ? 'No favorites yet'
                                        : searchQuery
                                            ? 'No files found'
                                            : 'Your Drive is empty'}
                            </div>
                            <div className="drive-empty__desc">
                                {activeQuick === 'trash'
                                    ? 'Deleted files will appear here.'
                                    : activeQuick === 'favorites'
                                        ? 'Star files to quickly find them later.'
                                        : searchQuery
                                            ? `No results for "${searchQuery}". Try a different search.`
                                            : 'Upload files or create something with any AI tool — it will show up here automatically.'}
                            </div>
                            {!activeQuick && !searchQuery && (
                                <button className="drive-empty__upload-btn" onClick={() => fileInputRef.current?.click()}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    Upload your first file
                                </button>
                            )}
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* ── Grid View ── */
                        <>
                            {activeFolder === 'all' && !activeQuick && (
                                <>
                                    <div className="drive-section-title">Folders</div>
                                    <div className="drive-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                                        {FOLDERS.filter(f => f.id !== 'all').map(folder => (
                                            <button key={folder.id} className="drive-folder" onClick={() => handleFolderClick(folder.id)}>
                                                <span className="drive-folder__icon">{folder.icon}</span>
                                                <div className="drive-folder__info">
                                                    <div className="drive-folder__name">{folder.name}</div>
                                                    <div className="drive-folder__count">{folderCounts[folder.id] || 0} items</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="drive-section-title">
                                {activeQuick === 'favorites' ? 'Favorites' : activeQuick === 'recent' ? 'Recent' : activeQuick === 'trash' ? 'Trash' : 'Files'}
                                {' '}({displayFiles.length})
                            </div>
                            <div className="drive-grid">
                                {displayFiles.map(file => {
                                    const icon = FILE_ICONS[file.type] || '📄';
                                    const srcColor = SOURCE_COLORS[file.source] || '#666';
                                    return (
                                        <div
                                            key={file.id}
                                            className={`drive-file ${selectedFile?.id === file.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedFile(file)}
                                        >
                                            {!file.is_deleted && (
                                                <button
                                                    className={`drive-file__favorite ${file.is_favorite ? 'active' : ''}`}
                                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(file.id, file.is_favorite); }}
                                                >
                                                    {file.is_favorite ? '★' : '☆'}
                                                </button>
                                            )}
                                            <div className="drive-file__preview">
                                                <div className="drive-file__preview-bg" style={{ background: `linear-gradient(135deg, ${srcColor}22, ${srcColor}08)` }} />
                                                <span className="drive-file__preview-icon">{icon}</span>
                                            </div>
                                            <div className="drive-file__info">
                                                {renamingFile === file.id ? (
                                                    <input
                                                        className="drive-file__rename-input"
                                                        value={renameValue}
                                                        onChange={(e) => setRenameValue(e.target.value)}
                                                        onBlur={() => renameFile(file.id)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') renameFile(file.id); if (e.key === 'Escape') setRenamingFile(null); }}
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <div className="drive-file__name">{file.name}</div>
                                                )}
                                                <div className="drive-file__meta">
                                                    <span className="drive-file__source" style={{ background: `${srcColor}18`, color: srcColor }}>
                                                        {file.source}
                                                    </span>
                                                    <span className="drive-file__meta-item">{formatSize(file.size_bytes)}</span>
                                                    <span className="drive-file__meta-item">{timeAgo(file.updated_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        /* ── List View ── */
                        <div className="drive-list">
                            <div className="drive-list__header">
                                <span>Name</span><span>Source</span><span>Modified</span><span>Size</span><span></span>
                            </div>
                            {displayFiles.map(file => {
                                const icon = FILE_ICONS[file.type] || '📄';
                                const srcColor = SOURCE_COLORS[file.source] || '#666';
                                return (
                                    <div key={file.id} className="drive-list__row" onClick={() => setSelectedFile(file)}>
                                        <div className="drive-list__name">
                                            <span className="drive-list__name-icon">{icon}</span>
                                            {file.name}
                                        </div>
                                        <div className="drive-list__cell">
                                            <span className="drive-file__source" style={{ background: `${srcColor}18`, color: srcColor }}>{file.source}</span>
                                        </div>
                                        <div className="drive-list__cell">{timeAgo(file.updated_at)}</div>
                                        <div className="drive-list__cell">{formatSize(file.size_bytes)}</div>
                                        <div className="drive-list__actions">
                                            {!file.is_deleted && (
                                                <button className="drive-list__action-btn" onClick={(e) => { e.stopPropagation(); toggleFavorite(file.id, file.is_favorite); }}>
                                                    {file.is_favorite ? '★' : '☆'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── File Detail Modal ── */}
            {selectedFile && (
                <div className="drive-detail-overlay" onClick={() => setSelectedFile(null)}>
                    <div className="drive-detail" onClick={(e) => e.stopPropagation()}>
                        <div className="drive-detail__preview">
                            <div className="drive-detail__preview-bg" style={{ background: `linear-gradient(135deg, ${SOURCE_COLORS[selectedFile.source] || '#666'}30, ${SOURCE_COLORS[selectedFile.source] || '#666'}10)` }} />
                            <span style={{ position: 'relative', zIndex: 1, fontSize: '3rem' }}>{FILE_ICONS[selectedFile.type] || '📄'}</span>
                            <button className="drive-detail__close" onClick={() => setSelectedFile(null)}>✕</button>
                        </div>
                        <div className="drive-detail__body">
                            <div className="drive-detail__name">{selectedFile.name}</div>
                            <div className="drive-detail__meta-grid">
                                <div>
                                    <div className="drive-detail__meta-label">Source</div>
                                    <div className="drive-detail__meta-value">{selectedFile.source}</div>
                                </div>
                                <div>
                                    <div className="drive-detail__meta-label">Size</div>
                                    <div className="drive-detail__meta-value">{formatSize(selectedFile.size_bytes)}</div>
                                </div>
                                <div>
                                    <div className="drive-detail__meta-label">Modified</div>
                                    <div className="drive-detail__meta-value">{timeAgo(selectedFile.updated_at)}</div>
                                </div>
                                <div>
                                    <div className="drive-detail__meta-label">Type</div>
                                    <div className="drive-detail__meta-value" style={{ textTransform: 'capitalize' }}>{selectedFile.type}</div>
                                </div>
                            </div>
                            <div className="drive-detail__actions">
                                {selectedFile.is_deleted ? (
                                    <>
                                        <button className="drive-detail__action drive-detail__action--primary" onClick={() => { restoreFile(selectedFile.id); setSelectedFile(null); }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></svg>
                                            Restore
                                        </button>
                                        <button className="drive-detail__action drive-detail__action--danger" onClick={() => deleteFile(selectedFile.id, true)}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                            Delete Forever
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button className="drive-detail__action drive-detail__action--primary" onClick={() => downloadFile(selectedFile.id)}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                            Download
                                        </button>
                                        <button className="drive-detail__action drive-detail__action--secondary" onClick={() => { setRenamingFile(selectedFile.id); setRenameValue(selectedFile.name); setSelectedFile(null); }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            Rename
                                        </button>
                                        <button className="drive-detail__action drive-detail__action--danger" onClick={() => deleteFile(selectedFile.id)}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                            Move to Trash
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
