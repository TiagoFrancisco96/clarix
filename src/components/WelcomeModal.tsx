'use client';

import React, { useState, useEffect } from 'react';

const FEATURES = [
    { icon: '💬', title: 'AI Chat', desc: 'Chat with 4 powerful AI models — auto-picks the best one for you' },
    { icon: '🖼️', title: 'Image & Video', desc: 'Generate stunning visuals from a simple text description' },
    { icon: '📄', title: 'Docs & Slides', desc: 'AI-powered writing, editing, and presentation creation' },
    { icon: '🎵', title: 'Music Studio', desc: 'Create original songs and beats with Suno AI integration' },
];

export function WelcomeModal() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const key = 'clarix_welcome_shown';
        if (!localStorage.getItem(key)) {
            // Small delay so the page renders first
            const t = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(t);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('clarix_welcome_shown', '1');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="welcome-overlay" onClick={handleDismiss}>
            <div className="welcome-modal" onClick={e => e.stopPropagation()}>
                <div className="welcome-modal__header">
                    <div className="welcome-modal__logo">C</div>
                    <h2 className="welcome-modal__title">Welcome to Clarix AI ✨</h2>
                    <p className="welcome-modal__subtitle">
                        Your all-in-one AI workspace. Here&apos;s what you can do:
                    </p>
                </div>

                <div className="welcome-modal__features">
                    {FEATURES.map((f) => (
                        <div key={f.title} className="welcome-modal__feature">
                            <span className="welcome-modal__feature-icon">{f.icon}</span>
                            <div>
                                <div className="welcome-modal__feature-title">{f.title}</div>
                                <div className="welcome-modal__feature-desc">{f.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="welcome-modal__tip">
                    💡 Tip: Press <kbd>Ctrl+K</kbd> anytime to quick-search
                </div>

                <button className="welcome-modal__cta" onClick={handleDismiss}>
                    Get Started →
                </button>
            </div>
        </div>
    );
}
