import React from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

/**
 * Mini Sparkline - Production-grade trend line with gradient fill
 * @param {Array} data - Array of {value: number}
 * @param {string} color - Line color
 * @param {number} height - Chart height in pixels
 */
export const MiniSparkline = ({ data, color = '#3b82f6', height = 35 }) => {
    if (!data || data.length === 0) return null;

    // Generate unique gradient ID
    const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div style={{ width: '100%', height: `${height}px`, minWidth: '0' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                        </linearGradient>
                        <filter id={`glow-${gradientId}`}>
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={3}
                        dot={false}
                        fill={`url(#${gradientId})`}
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                        filter={`url(#glow-${gradientId})`}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );

};

/**
 * Mini Progress Bar - Production-grade progress indicator with gradients
 * @param {number} value - Current value
 * @param {number} max - Maximum value
 * @param {string} color - Bar color (auto-calculated if not provided)
 * @param {number} height - Bar height in pixels
 */
export const MiniProgressBar = ({ value, max, color, height = 6, showLabel = false, showPercentage = true }) => {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

    // Auto-calculate color based on percentage if not provided
    const barColor = color || (
        percentage > 90 ? '#ef4444' :
            percentage > 75 ? '#f59e0b' :
                '#10b981'
    );

    // Create gradient colors
    const gradientStart = barColor;
    const gradientEnd = barColor + 'cc'; // Add transparency

    return (
        <div style={{ width: '100%', position: 'relative' }}>
            {showLabel && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                    fontSize: '10px',
                    color: 'var(--text-dim)',
                    fontWeight: 500
                }}>
                    <span>{value.toLocaleString()}</span>
                    <span>{max.toLocaleString()}</span>
                </div>
            )}
            <div style={{
                width: '100%',
                height: `${height}px`,
                background: 'var(--progress-track)',
                borderRadius: `${height / 2}px`,
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)'
            }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    style={{
                        height: '100%',
                        background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
                        boxShadow: `0 0 12px ${barColor}60, inset 0 1px 0 rgba(255,255,255,0.3)`,
                        borderRadius: `${height / 2}px`,
                        position: 'relative'
                    }}
                >
                    {/* Shimmer effect */}
                    <motion.div
                        animate={{
                            x: ['-100%', '200%']
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '50%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                            pointerEvents: 'none'
                        }}
                    />
                </motion.div>
            </div>
            {showPercentage && percentage > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '8px',
                        fontWeight: 700,
                        color: barColor,
                        marginTop: showLabel ? '12px' : 0
                    }}
                >
                    {percentage.toFixed(0)}%
                </motion.div>
            )}
        </div>
    );
};

/**
 * Mini Segmented Bar - Production-grade multi-segment bar with hover effects
 * @param {Array} segments - Array of {label, value, color}
 * @param {number} height - Bar height in pixels
 */
export const MiniSegmentedBar = ({ segments, height = 8, showLabels = false }) => {
    if (!segments || segments.length === 0) return null;

    const total = segments.reduce((sum, seg) => sum + seg.value, 0);
    const [hoveredIndex, setHoveredIndex] = React.useState(null);

    return (
        <div style={{ width: '100%' }}>
            {showLabels && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '9px',
                    color: 'var(--text-dim)',
                    flexWrap: 'wrap',
                    gap: '6px',
                    fontWeight: 500
                }}>
                    {segments.map((seg, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: seg.color,
                                boxShadow: `0 0 4px ${seg.color}80`
                            }} />
                            <span>{seg.label}: {seg.value}</span>
                        </div>
                    ))}
                </div>
            )}
            <div style={{
                width: '100%',
                height: `${height}px`,
                background: 'var(--progress-track)',
                borderRadius: `${height / 2}px`,
                overflow: 'hidden',
                display: 'flex',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
                border: '1px solid var(--glass-border)'
            }}>
                {segments.map((seg, idx) => {
                    const percentage = total > 0 ? (seg.value / total) * 100 : 0;
                    const isHovered = hoveredIndex === idx;

                    return (
                        <motion.div
                            key={idx}
                            initial={{ width: 0 }}
                            animate={{
                                width: `${percentage}%`,
                                scale: isHovered ? 1.05 : 1
                            }}
                            transition={{
                                width: { duration: 1.2, delay: idx * 0.1, ease: "easeOut" },
                                scale: { duration: 0.2 }
                            }}
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            style={{
                                height: '100%',
                                background: `linear-gradient(180deg, ${seg.color}, ${seg.color}dd)`,
                                borderRight: idx < segments.length - 1 ? '1px solid rgba(0,0,0,0.3)' : 'none',
                                cursor: 'pointer',
                                position: 'relative',
                                boxShadow: isHovered ? `0 0 8px ${seg.color}` : 'none',
                                transition: 'box-shadow 0.2s ease'
                            }}
                            title={`${seg.label}: ${seg.value} (${percentage.toFixed(1)}%)`}
                        >
                            {/* Highlight overlay */}
                            {isHovered && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'rgba(255,255,255,0.2)',
                                    pointerEvents: 'none'
                                }} />
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * Mini Severity Strip - Production-grade severity indicator with pulse animation
 * @param {string} severity - 'low', 'medium', 'high', 'critical'
 * @param {number|string} count - Number to display or custom text
 */
export const MiniSeverityStrip = ({ severity = 'low', count = 0, height = 24 }) => {
    const severityConfig = {
        low: { color: '#10b981', label: 'Low Risk', emoji: '✓' },
        medium: { color: '#f59e0b', label: 'Medium Risk', emoji: '⚠' },
        high: { color: '#ef4444', label: 'High Risk', emoji: '⚠' },
        critical: { color: '#b91c1c', label: 'Critical', emoji: '🔴' }
    };

    const config = severityConfig[severity.toLowerCase()] || severityConfig.low;
    const baseColor = config.color;
    const isCssVar = typeof baseColor === 'string' && baseColor.startsWith('var(');

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: isCssVar ? baseColor : `linear-gradient(135deg, ${config.color}18, ${config.color}08)`,
                backgroundOpacity: isCssVar ? 0.1 : 1,
                border: `1.5px solid ${isCssVar ? baseColor : config.color}`,
                borderOpacity: 0.3,
                borderRadius: '8px',
                height: `${height}px`,
                boxShadow: isCssVar ? 'none' : `0 2px 8px ${config.color}20, inset 0 1px 0 rgba(255,255,255,0.1)`
            }}
        >
            {/* Pulsing dot indicator */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.8, 1, 0.8]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: config.color,
                    boxShadow: `0 0 10px ${config.color}, inset 0 1px 1px rgba(255,255,255,0.3)`,
                    border: `1px solid ${config.color}`
                }}
            />
            <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: config.color,
                letterSpacing: '0.3px',
                textShadow: isCssVar ? 'none' : `0 1px 2px ${config.color}30`
            }}>
                {count > 0 || typeof count === 'string' ? count : config.label}
            </span>
        </motion.div>
    );
};

/**
 * Mini Status Generic - Generic status pill for any content
 * @param {string} status - Text to display
 * @param {string} color - Color hex or var
 */
export const MiniStatusGeneric = ({ status, color = 'var(--accent-blue)', height = 22 }) => {
    const isCssVar = typeof color === 'string' && color.startsWith('var(');

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: isCssVar ? color : `linear-gradient(135deg, ${color}18, ${color}08)`,
                backgroundOpacity: isCssVar ? 0.1 : 1,
                border: `1.5px solid ${color}`,
                borderOpacity: isCssVar ? 1 : 0.3,
                borderRadius: '8px',
                height: `${height}px`,
                minWidth: 'fit-content',
                maxWidth: '100%',
                boxShadow: isCssVar ? 'none' : `0 2px 8px ${color}20, inset 0 1px 0 rgba(255,255,255,0.1)`
            }}
        >
            {/* Pulsing dot indicator */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.8, 1, 0.8]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                    boxShadow: `0 0 8px ${color}`,
                    border: `1px solid ${color}`
                }}
            />
            <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: color,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1
            }}>
                {status}
            </span>
        </motion.div>
    );
};

/**
 * Mini Bar Chart - Compact horizontal bar chart
 * @param {Array} data - Array of {name, value, color}
 * @param {number} height - Chart height
 */
export const MiniBarChart = ({ data, height = 40 }) => {
    if (!data || data.length === 0) return null;

    return (
        <div style={{ width: '100%', height: `${height}px`, minWidth: '0' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Bar dataKey="value" radius={[2, 2, 2, 2]} animationDuration={800}>
                        {data.map((entry, index) => (
                            <rect key={`bar-${index}`} fill={entry.color || 'var(--accent-blue)'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

/**
 * Time Ago Label - Shows "Last updated X minutes ago"
 * @param {Date|number} timestamp - Timestamp or Date object
 */
export const TimeAgoLabel = ({ timestamp }) => {
    if (!timestamp) return null;

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    let timeAgo;
    if (diff < 60) timeAgo = 'just now';
    else if (diff < 3600) timeAgo = `${Math.floor(diff / 60)}m ago`;
    else if (diff < 86400) timeAgo = `${Math.floor(diff / 3600)}h ago`;
    else timeAgo = `${Math.floor(diff / 86400)}d ago`;

    return (
        <div style={{
            fontSize: '9px',
            color: 'var(--text-dim)',
            fontStyle: 'italic',
            marginTop: '4px'
        }}>
            Updated {timeAgo}
        </div>
    );
};
