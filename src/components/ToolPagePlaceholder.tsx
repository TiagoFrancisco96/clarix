'use client';

import React from 'react';

interface ToolPagePlaceholderProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    features: string[];
    creditCost: string;
}

export default function ToolPagePlaceholder({
    title,
    description,
    icon,
    color,
    features,
    creditCost,
}: ToolPagePlaceholderProps) {
    return (
        <div className="tool-placeholder animate-fade-in-up">
            <div className="tool-placeholder__icon" style={{ color, background: `${color}15` }}>
                {icon}
            </div>
            <h1 className="tool-placeholder__title">{title}</h1>
            <p className="tool-placeholder__desc">{description}</p>

            <div className="tool-placeholder__features">
                {features.map((f, i) => (
                    <div key={i} className="tool-placeholder__feature">
                        <span className="tool-placeholder__feature-dot" style={{ background: color }} />
                        <span>{f}</span>
                    </div>
                ))}
            </div>

            <div className="tool-placeholder__credit">
                <span>⚡</span> {creditCost}
            </div>

            <div className="tool-placeholder__coming-soon">
                <div className="tool-placeholder__pulse" />
                <span>Coming Soon</span>
            </div>

            <style jsx>{`
        .tool-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 500px;
          margin: var(--space-16) auto;
          gap: var(--space-4);
        }

        .tool-placeholder__icon {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tool-placeholder__title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .tool-placeholder__desc {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .tool-placeholder__features {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin-top: var(--space-4);
          align-items: flex-start;
        }

        .tool-placeholder__feature {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .tool-placeholder__feature-dot {
          width: 6px;
          height: 6px;
          border-radius: var(--radius-full);
          flex-shrink: 0;
        }

        .tool-placeholder__credit {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          font-size: 0.8rem;
          color: var(--accent-gold);
          background: var(--accent-gold-muted);
          padding: var(--space-1) var(--space-3);
          border-radius: var(--radius-full);
          margin-top: var(--space-2);
        }

        .tool-placeholder__coming-soon {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-top: var(--space-6);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .tool-placeholder__pulse {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
          background: var(--accent-gold);
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
}
