import React from 'react';

const Logo = ({ size = 32, className = '' }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="logoGradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#3b82f6" /> {/* Blue-500 */}
                    <stop offset="100%" stopColor="#6366f1" /> {/* Indigo-500 */}
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Outer Hexagon / Shield Shape */}
            <path
                d="M20 2 L37.32 12 V32 L20 42 L2.68 32 V12 L20 2Z"
                fill="url(#logoGradient)"
                opacity="0.1"
            />

            {/* Modern "A" / Node Structure */}
            <path
                d="M20 8 L32 28 H8 L20 8Z"
                stroke="url(#logoGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <circle cx="20" cy="8" r="3" fill="url(#logoGradient)" />
            <circle cx="8" cy="28" r="3" fill="url(#logoGradient)" />
            <circle cx="32" cy="28" r="3" fill="url(#logoGradient)" />

            {/* Center Connection - Sphere Core */}
            <circle cx="20" cy="20" r="1.5" fill="white" fillOpacity="0.8" />
        </svg>
    );
};

export default Logo;
