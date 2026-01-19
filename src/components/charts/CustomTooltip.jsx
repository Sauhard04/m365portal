import React from 'react';

/**
 * Production-Grade Custom Tooltip for Recharts
 * Features glassmorphism design with premium styling
 */
export const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.98), rgba(20, 20, 30, 0.98))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            minWidth: '180px',
            animation: 'tooltipFadeIn 0.2s ease-out'
        }}>
            {label && (
                <div style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginBottom: '8px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                }}>
                    {label}
                </div>
            )}
            {payload.map((entry, index) => (
                <div
                    key={index}
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        marginTop: index > 0 ? '6px' : 0
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: entry.color || entry.fill,
                            boxShadow: `0 0 8px ${entry.color || entry.fill}80, inset 0 1px 1px rgba(255,255,255,0.3)`,
                            border: `1px solid ${entry.color || entry.fill}`
                        }} />
                        <span style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                            {entry.name || entry.dataKey}
                        </span>
                    </div>
                    <span style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: entry.color || entry.fill,
                        textShadow: `0 0 10px ${entry.color || entry.fill}40`
                    }}>
                        {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

/**
 * Production-Grade Chart Header Component
 * Consistent header styling for all main analytical charts
 */
export const ChartHeader = ({ icon: Icon, title, subtitle, color = 'var(--accent-blue)' }) => {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
            {Icon && (
                <div style={{
                    padding: '8px',
                    background: `linear-gradient(135deg, ${color}25, ${color}10)`,
                    borderRadius: '10px',
                    border: `1px solid ${color}30`,
                    boxShadow: `0 4px 12px ${color}20`
                }}>
                    <Icon size={16} color={color} />
                </div>
            )}
            <div style={{ flex: 1 }}>
                <h3 style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--text-primary)',
                    letterSpacing: '0.3px'
                }}>
                    {title}
                </h3>
                {subtitle && (
                    <p style={{
                        fontSize: '10px',
                        color: 'var(--text-dim)',
                        margin: '2px 0 0 0',
                        fontWeight: 500
                    }}>
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
};

// Add CSS animation for tooltip
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes tooltipFadeIn {
            from {
                opacity: 0;
                transform: translateY(-5px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
    `;
    document.head.appendChild(style);
}
