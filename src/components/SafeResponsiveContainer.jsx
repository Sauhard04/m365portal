import React, { useRef, useState, useEffect } from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * A wrapper around Recharts ResponsiveContainer that ensures the container
 * has valid dimensions (width > 0 and height > 0) before rendering the chart.
 * This prevents "width(-1) and height(-1) should be greater than 0" errors.
 */
const SafeResponsiveContainer = ({ children, width = "100%", height = "100%", ...props }) => {
    const containerRef = useRef(null);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const checkDimensions = () => {
            const { clientWidth, clientHeight } = containerRef.current;
            // We use a small threshold like 1px to be safe, though > 0 is strictly required
            if (clientWidth > 0 && clientHeight > 0) {
                setShouldRender(true);
            } else {
                setShouldRender(false);
            }
        };

        // Initial check
        checkDimensions();

        // Observe resizes
        const observer = new ResizeObserver(() => {
            checkDimensions();
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    // If explicit minWidth/minHeight are passed, we honour them in the style
    // but ResponsiveContainer's logic still depends on measured size.
    const containerStyle = { width, height, ...props.style };

    return (
        <div ref={containerRef} style={containerStyle} className={props.className}>
            {shouldRender ? (
                <ResponsiveContainer width="100%" height="100%" {...props}>
                    {children}
                </ResponsiveContainer>
            ) : (
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.5,
                    fontSize: '12px',
                    color: 'var(--text-tertiary, #888)'
                }}>
                    {/* Placeholder keeps grid from collapsing if grid-template is auto */}
                </div>
            )}
        </div>
    );
};

export default SafeResponsiveContainer;
