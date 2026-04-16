import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Calendar, ChevronDown, ChevronUp, Check, X } from 'lucide-react';

/**
 * DateRangePicker
 *
 * The dropdown is rendered via ReactDOM.createPortal into document.body,
 * so it is never clipped by any parent's overflow:hidden or z-index stacking context.
 *
 * Props:
 *  - fromDate: string (YYYY-MM-DD)
 *  - toDate: string (YYYY-MM-DD)
 *  - onChange: ({ fromDate, toDate, period }) => void
 *      `period` is the resolved Graph period string ('D7'|'D30'|'D90'|'D180') or null
 *  - mode: 'period' | 'exact'
 *      'period' - maps date range to nearest Graph period (for Usage Reports)
 *      'exact'  - passes exact ISO dates to the consumer (for Audit/Sign-In logs)
 */
const DateRangePicker = ({ fromDate, toDate, onChange, mode = 'period', label = 'Date Range' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [localFrom, setLocalFrom] = useState(fromDate || '');
    const [localTo, setLocalTo] = useState(toDate || '');
    const [activePreset, setActivePreset] = useState(null);
    const [panelStyle, setPanelStyle] = useState({});
    const buttonRef = useRef(null);
    const panelRef = useRef(null);

    const PRESETS = [
        { label: 'Last 7 Days', days: 7, period: 'D7' },
        { label: 'Last 30 Days', days: 30, period: 'D30' },
        { label: 'Last 90 Days', days: 90, period: 'D90' },
        { label: 'Last 180 Days', days: 180, period: 'D180' },
    ];

    // Sync props → local state
    useEffect(() => {
        setLocalFrom(fromDate || '');
        setLocalTo(toDate || '');
    }, [fromDate, toDate]);

    // Position & open dropdown
    const openDropdown = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const PANEL_WIDTH = 300;
            let left = rect.right - PANEL_WIDTH;
            // Keep within viewport
            if (left < 8) left = 8;
            if (left + PANEL_WIDTH > window.innerWidth - 8) left = window.innerWidth - PANEL_WIDTH - 8;
            setPanelStyle({
                position: 'fixed',
                top: rect.bottom + 8,
                left,
                width: PANEL_WIDTH,
                zIndex: 99999,
            });
        }
        setIsOpen(true);
    };

    // Close on outside click / scroll / resize
    useEffect(() => {
        if (!isOpen) return;
        const close = (e) => {
            if (e.target && panelRef.current?.contains(e.target)) return;
            if (e.target && buttonRef.current?.contains(e.target)) return;
            setIsOpen(false);
        };
        const forceClose = () => setIsOpen(false);
        document.addEventListener('mousedown', close);
        window.addEventListener('scroll', forceClose, true);
        window.addEventListener('resize', forceClose);
        return () => {
            document.removeEventListener('mousedown', close);
            window.removeEventListener('scroll', forceClose, true);
            window.removeEventListener('resize', forceClose);
        };
    }, [isOpen]);

    const resolveToGraphPeriod = (days) => {
        if (days <= 7) return 'D7';
        if (days <= 30) return 'D30';
        if (days <= 90) return 'D90';
        return 'D180';
    };

    const periodName = (p) => {
        const map = { D7: 'Last 7 Days', D30: 'Last 30 Days', D90: 'Last 90 Days', D180: 'Last 180 Days' };
        return map[p] || p;
    };

    const applyPreset = (preset) => {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - preset.days);
        const toStr = to.toISOString().split('T')[0];
        const fromStr = from.toISOString().split('T')[0];
        setLocalFrom(fromStr);
        setLocalTo(toStr);
        setActivePreset(preset.period);
        onChange({ fromDate: fromStr, toDate: toStr, period: preset.period });
        setIsOpen(false);
    };

    const applyCustomRange = () => {
        if (!localFrom || !localTo) return;
        if (new Date(localTo) < new Date(localFrom)) return;
        const diffDays = Math.ceil((new Date(localTo) - new Date(localFrom)) / 86400000);
        const period = mode === 'period' ? resolveToGraphPeriod(diffDays) : null;
        setActivePreset(null);
        onChange({ fromDate: localFrom, toDate: localTo, period });
        setIsOpen(false);
    };

    const displayLabel = () => {
        if (activePreset) return periodName(activePreset);
        if (fromDate && toDate) return `${fromDate}  →  ${toDate}`;
        return label;
    };

    const resolvedPeriod = () => {
        if (mode !== 'period' || activePreset || !localFrom || !localTo) return null;
        const diffDays = Math.ceil((new Date(localTo) - new Date(localFrom)) / 86400000);
        return resolveToGraphPeriod(diffDays);
    };

    const isInvalid = !localFrom || !localTo || new Date(localTo) < new Date(localFrom);

    // ── Panel rendered via Portal ──────────────────────────────────────────────
    const panel = isOpen && ReactDOM.createPortal(
        <div
            ref={panelRef}
            style={{
                ...panelStyle,
                background: '#0f1729',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
                animation: 'drp-appear 0.18s cubic-bezier(0.22,1,0.36,1)',
                fontFamily: 'inherit',
                color: '#e2e8f0',
            }}
            onClick={e => e.stopPropagation()}
        >
            <style>{`
                @keyframes drp-appear {
                    from { opacity: 0; transform: translateY(6px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1); }
                }
                .drp-preset-btn:hover {
                    background: rgba(255,255,255,0.08) !important;
                    color: #f1f5f9 !important;
                }
                .drp-date-input {
                    width: 100%; padding: 8px 10px; border-radius: 8px;
                    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
                    color: #e2e8f0; font-size: 12px; outline: none;
                    box-sizing: border-box; color-scheme: dark;
                }
                .drp-date-input:focus { border-color: rgba(59,130,246,0.5); }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={14} color="#3b82f6" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Date Range</span>
                </div>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, display: 'flex' }}>
                    <X size={14} />
                </button>
            </div>

            {/* Quick Presets */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Quick Presets</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {PRESETS.map(preset => {
                        const active = activePreset === preset.period;
                        return (
                            <button
                                key={preset.period}
                                className="drp-preset-btn"
                                onClick={() => applyPreset(preset)}
                                style={{
                                    padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                                    cursor: 'pointer', border: `1px solid ${active ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.07)'}`,
                                    background: active ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
                                    color: active ? '#60a5fa' : '#94a3b8',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    transition: 'all 0.15s',
                                }}
                            >
                                {active && <Check size={11} />}
                                {preset.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 16 }} />

            {/* Custom Range */}
            <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Custom Range</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                        <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600 }}>From</label>
                        <input type="date" className="drp-date-input" value={localFrom}
                            max={localTo || new Date().toISOString().split('T')[0]}
                            onChange={e => { setLocalFrom(e.target.value); setActivePreset(null); }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 600 }}>To</label>
                        <input type="date" className="drp-date-input" value={localTo}
                            min={localFrom || undefined}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={e => { setLocalTo(e.target.value); setActivePreset(null); }} />
                    </div>
                </div>
            </div>

            {/* Period resolution warning */}
            {mode === 'period' && !activePreset && localFrom && localTo && resolvedPeriod() && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', fontSize: 11, color: '#fbbf24', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>⚠</span>
                    <span>Graph API maps this to <strong>{periodName(resolvedPeriod())}</strong></span>
                </div>
            )}

            {/* Apply Button */}
            <button
                onClick={applyCustomRange}
                disabled={isInvalid}
                style={{
                    width: '100%', padding: '10px', borderRadius: 10,
                    background: isInvalid ? 'rgba(59,130,246,0.25)' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: isInvalid ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: isInvalid ? 0.5 : 1, transition: 'opacity 0.2s',
                }}
            >
                <Check size={14} /> Apply Range
            </button>
        </div>,
        document.body
    );

    return (
        <div style={{ display: 'inline-block', position: 'relative' }}>
            {/* Trigger Button */}
            <button
                ref={buttonRef}
                onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px',
                    background: isOpen ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isOpen ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 10, color: '#e2e8f0', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    minWidth: 190, justifyContent: 'space-between',
                    transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Calendar size={14} color="#3b82f6" />
                    <span>{displayLabel()}</span>
                </div>
                {isOpen ? <ChevronUp size={13} style={{ opacity: 0.6 }} /> : <ChevronDown size={13} style={{ opacity: 0.6 }} />}
            </button>

            {panel}
        </div>
    );
};

export default DateRangePicker;
