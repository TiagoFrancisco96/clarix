'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCreations } from '@/hooks/useCreations';
import './sheets.css';

/* ── Types ── */
const SHEET_MODELS = [
    { id: 'deepseek-v4-flash', name: 'DeepSeek V4-Flash', provider: 'DeepSeek', color: '#a78bfa', description: 'Fastest · most affordable', credits: 1 },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', color: '#4285f4', description: 'Fast · great with data', credits: 3 },
    { id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', color: '#e8915a', description: 'Smart reasoning · finds trends', credits: 5 },
    { id: 'gpt-5.5', name: 'GPT-5.5', provider: 'OpenAI', color: '#10a37f', description: 'Best with formulas & data analysis', credits: 15 },
];

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const INITIAL_HEADERS = ['Product', 'Category', 'Q1 Revenue', 'Q2 Revenue', 'Q3 Revenue', 'Q4 Revenue', 'Total', 'Growth %'];
const INITIAL_DATA = [
    ['Pro Plan', 'SaaS', '$12,400', '$15,800', '$19,200', '$24,100', '$71,500', '+94%'],
    ['Enterprise', 'SaaS', '$45,000', '$52,300', '$61,800', '$78,200', '$237,300', '+74%'],
    ['API Credits', 'Usage', '$3,200', '$5,100', '$8,900', '$14,300', '$31,500', '+347%'],
    ['Consulting', 'Services', '$8,000', '$6,500', '$9,200', '$11,000', '$34,700', '+38%'],
    ['Add-ons', 'SaaS', '$1,800', '$2,400', '$3,100', '$4,200', '$11,500', '+133%'],
    ['Training', 'Services', '$2,000', '$3,000', '$2,500', '$4,000', '$11,500', '+100%'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
];

export default function SheetsPage() {
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [data, setData] = useState(INITIAL_DATA);

    const currentModel = SHEET_MODELS.find(m => m.id === selectedModel) || SHEET_MODELS[0];
    const modelDropdownRef = useRef<HTMLDivElement>(null);

    // Persistence
    const { creations, isLoading: isLoadingSheets, saveCreation } = useCreations('sheets');
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        if (!isLoadingSheets && creations.length > 0 && !hasLoaded) {
            let timer: NodeJS.Timeout;
            try {
                const savedData = JSON.parse(creations[0].content);
                if (Array.isArray(savedData)) {
                    timer = setTimeout(() => {
                        setData(savedData);
                        setHasLoaded(true);
                    }, 0);
                } else {
                    timer = setTimeout(() => {
                        setHasLoaded(true);
                    }, 0);
                }
            } catch {
                timer = setTimeout(() => {
                    setHasLoaded(true);
                }, 0);
            }
            return () => {
                if (timer) clearTimeout(timer);
            };
        }
    }, [isLoadingSheets, creations, hasLoaded]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
                setShowModelDropdown(false);
            }
        };
        if (showModelDropdown) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showModelDropdown]);

    const handleAiQuery = () => {
        if (!aiPrompt.trim() || isProcessing) return;
        setIsProcessing(true);

        setTimeout(() => {
            // Simulate AI modifying the sheet
            const updatedData = [...data.map(row => [...row])];
            if (aiPrompt.toLowerCase().includes('sort')) {
                updatedData.sort((a, b) => {
                    const aVal = a[6]?.replace(/[$,]/g, '') || '0';
                    const bVal = b[6]?.replace(/[$,]/g, '') || '0';
                    return parseFloat(bVal) - parseFloat(aVal);
                });
            }
            setData(updatedData);
            setIsProcessing(false);
            setAiPrompt('');
            // Save to server
            saveCreation({ title: `Spreadsheet — ${new Date().toLocaleDateString()}`, content: JSON.stringify(updatedData), metadata: { model: selectedModel } });
        }, 1500 + Math.random() * 1000);
    };

    return (
        <div className="sheets-page">
            {/* Toolbar */}
            <div className="sheets-toolbar">
                <div className="sheets-toolbar__title">
                    <span className="sheets-toolbar__title-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="3" y1="15" x2="21" y2="15" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                        </svg>
                    </span>
                    AI Sheets
                </div>

                <div className="sheets-toolbar__spacer" />

                {/* Model Selector */}
                <div className="sheets-model-selector" ref={modelDropdownRef}>
                    <button
                        className="sheets-model-selector__trigger"
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                    >
                        <span className="sheets-model-selector__dot" style={{ background: currentModel.color }} />
                        {currentModel.name}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                    {showModelDropdown && (
                        <div className="sheets-model-selector__dropdown">
                            {SHEET_MODELS.map(model => (
                                <button
                                    key={model.id}
                                    className={`sheets-model-selector__option ${selectedModel === model.id ? 'active' : ''}`}
                                    onClick={() => { setSelectedModel(model.id); setShowModelDropdown(false); }}
                                >
                                    <span className="sheets-model-selector__dot" style={{ background: model.color }} />
                                    <span className="sheets-model-selector__option-info">
                                        <span className="sheets-model-selector__option-name">{model.name}</span>
                                        <span className="sheets-model-selector__option-desc">{model.description}</span>
                                    </span>
                                    <span className="sheets-model-selector__option-credits">{model.credits}cr</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button className="sheets-toolbar__action" onClick={() => { const rows = [INITIAL_HEADERS, ...data]; const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Clarix-sheet.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Export CSV
                </button>
            </div>

            {/* AI Prompt Bar */}
            <div className="sheets-prompt-bar">
                <span className="sheets-prompt-bar__icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18m9-9H3" /></svg>
                </span>
                <input
                    className="sheets-prompt-bar__input"
                    placeholder='Ask AI: "Sort by total revenue" or "Add a chart of Q1-Q4 trends" or "Generate formula for growth rates"...'
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAiQuery(); }}
                />
                <button
                    className="sheets-prompt-bar__submit"
                    onClick={handleAiQuery}
                    disabled={!aiPrompt.trim() || isProcessing}
                >
                    {isProcessing ? <span className="sheets-prompt-bar__spinner" /> : 'Run'}
                </button>
            </div>

            {/* Sheet */}
            {data.length > 0 ? (
                <div className="sheets-table-wrap">
                    <table className="sheets-table">
                        <thead>
                            <tr>
                                <th></th>
                                {COLUMNS.map((col, i) => (
                                    <th key={col}>{col} — {INITIAL_HEADERS[i]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                    <td>{rowIdx + 1}</td>
                                    {row.map((cell, colIdx) => (
                                        <td key={colIdx}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="sheets-empty">
                    <div className="sheets-empty__icon">
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
                    </div>
                    <h3>AI-Powered Spreadsheets</h3>
                    <p>Analyze data with natural language, generate formulas, and create charts automatically.</p>
                    <div className="sheets-empty__features">
                        <span className="sheets-empty__feature">📊 AI Charts</span>
                        <span className="sheets-empty__feature">🧮 Formulas</span>
                        <span className="sheets-empty__feature">📈 Analysis</span>
                        <span className="sheets-empty__feature">📁 Import CSV</span>
                    </div>
                </div>
            )}
        </div>
    );
}
