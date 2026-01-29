import React, { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * AnimatedTile - Production-grade animated card/tile component
 * Features: Staggered entry, hover lift, glowing border, shimmer effect, spring animations
 */
const AnimatedTile = ({
    children,
    onClick,
    index = 0,
    delay = 0, // Alias for index
    accentColor = 'var(--accent-blue)',
    variant = 'default', // 'default', 'critical', 'success', 'warning'
    className = '',
    style = {}
}) => {
    const [isHovered, setIsHovered] = useState(false);

    // Use delay if provided, otherwise use index
    const animationDelay = delay || index;

    // Variant-based color mapping
    const variantColors = {
        default: accentColor,
        critical: 'var(--accent-error)',
        success: 'var(--accent-success)',
        warning: 'var(--accent-warning)'
    };

    const glowColor = variantColors[variant] || accentColor;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                duration: 0.5,
                delay: animationDelay * 0.08, // Staggered animation
                ease: [0.25, 0.46, 0.45, 0.94] // Custom bezier for smooth motion
            }}
            whileHover={{
                y: -8,
                scale: 1.02,
                transition: {
                    type: 'spring',
                    stiffness: 400,
                    damping: 17
                }
            }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`glass-card stat-card ${className}`}
            style={{
                cursor: onClick ? 'pointer' : 'default',
                position: 'relative',
                overflow: 'hidden',
                willChange: 'transform',
                ...style,
                // Glowing border effect on hover
                boxShadow: isHovered
                    ? `0 8px 32px ${glowColor}40, 
                       0 0 0 1px ${glowColor}60,
                       inset 0 1px 0 rgba(255,255,255,0.1)`
                    : '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
                borderColor: isHovered ? `${glowColor}80` : 'var(--glass-border)',
                transition: 'box-shadow 0.3s ease, border-color 0.3s ease'
            }}
        >

            {/* Shimmer effect removed - was obscuring text */}

            {/* Glow pulse for critical tiles */}
            {variant === 'critical' && (
                <motion.div
                    animate={{
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.05, 1]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                    style={{
                        position: 'absolute',
                        top: -2,
                        left: -2,
                        right: -2,
                        bottom: -2,
                        borderRadius: 'inherit',
                        background: `radial-gradient(circle at 50% 50%, ${glowColor}30, transparent 70%)`,
                        pointerEvents: 'none',
                        zIndex: 0
                    }}
                />
            )}

            {/* Content wrapper */}
            <div style={{ position: 'relative', zIndex: 2 }}>
                {children}
            </div>

            {/* Hover indicator line at bottom */}
            <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: isHovered ? 1 : 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${glowColor}, ${glowColor}80)`,
                    transformOrigin: 'left',
                    borderRadius: '0 0 12px 12px',
                    boxShadow: `0 0 12px ${glowColor}`,
                    zIndex: 3
                }}
            />
        </motion.div>
    );
};

export default AnimatedTile;
