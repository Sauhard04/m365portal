import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Settings, LayoutGrid, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import RuntimeConfig from '../config';

const TenantSelector = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [switching, setSwitching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [tenants, setTenants] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const containerRef = useRef(null);

    useEffect(() => {
        fetch('/api/tenants')
            .then(res => res.json())
            .then(data => {
                setTenants(data);
                if (accounts && accounts.length > 0) {
                    RuntimeConfig.setCurrentUser(accounts[0].homeAccountId);
                }
                const currentTenantId = RuntimeConfig.getActiveTenantId();
                if (currentTenantId && data.find(t => t.tenantId === currentTenantId)) {
                    setActiveId(currentTenantId);
                } else if (data.length > 0) {
                    const defaultTenant = data[0];
                    setActiveId(defaultTenant.tenantId);
                    RuntimeConfig.setActiveTenant(defaultTenant.tenantId);
                }
            })
            .catch(err => console.error('[TenantSelector] Failed to fetch tenants:', err));
    }, [accounts]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeTenant = tenants.find(t => t.tenantId === activeId);

    if (tenants.length === 0) return null;

    const handleSelect = async (tenantId) => {
        if (tenantId === activeId || switching) { setIsOpen(false); return; }
        setIsOpen(false);
        setSwitching(true);

        // Find the full tenant object so we can store the clientId in localStorage.
        // This means initialize() can configure MSAL correctly WITHOUT a DB lookup.
        const tenant = tenants.find(t => t.tenantId === tenantId);
        if (!tenant) {
            console.error('[TenantSelector] Tenant not found in list:', tenantId);
            setSwitching(false);
            return;
        }

        console.log(`[TenantSelector] Switching to: ${tenant.displayName} (clientId: ${tenant.clientId})`);

        // Store the FULL config (not just tenantId) so MSAL can be initialized correctly.
        // autoLogin: true tells LandingPage to auto-trigger loginRedirect after the logout redirect.
        RuntimeConfig.setPendingTenant(tenant.tenantId, tenant.clientId, tenant.displayName, true);

        // Log out the current user — on redirect back, main.jsx reads the pending
        // tenant from localStorage and initialises MSAL with the correct credentials.
        try {
            await instance.logoutRedirect({
                postLogoutRedirectUri: window.location.origin,
            });
        } catch (err) {
            console.error('[TenantSelector] Logout failed:', err);
            RuntimeConfig.clearPendingTenant();
            setSwitching(false);
        }
    };


    // Generate a unique color per tenant based on name
    const getTenantColor = (name = '') => {
        const colors = [
            { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.4)', dot: '#818cf8' },   // indigo
            { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', dot: '#34d399' },   // emerald
            { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', dot: '#fbbf24' },   // amber
            { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.4)', dot: '#f472b6' },   // pink
            { bg: 'rgba(14,165,233,0.15)', border: 'rgba(14,165,233,0.4)', dot: '#38bdf8' },   // sky
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const activeColor = getTenantColor(activeTenant?.displayName);
    const initials = (activeTenant?.displayName || 'T').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            {/* Switching overlay */}
            {switching && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(6px)',
                }}>
                    <div style={{
                        width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)',
                        borderTop: '3px solid #818cf8', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', marginBottom: 14
                    }} />
                    <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600 }}>Switching Environment</div>
                    <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>Signing you out…</div>
                </div>
            )}
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: isOpen ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isOpen ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
                onMouseLeave={e => {
                    if (!isOpen) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    }
                }}
            >
                {/* Avatar */}
                <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: activeColor.bg,
                    border: `1px solid ${activeColor.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '11px',
                    fontWeight: 700,
                    color: activeColor.dot,
                    letterSpacing: '0.05em',
                }}>
                    {initials}
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#e2e8f0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.3,
                    }}>
                        {activeTenant?.displayName || 'Select Tenant'}
                    </div>
                    <div style={{
                        fontSize: '10px',
                        color: '#4b5563',
                        fontFamily: 'monospace',
                        marginTop: '1px',
                    }}>
                        {activeId ? activeId.substring(0, 8) + '…' : ''}
                    </div>
                </div>

                {/* Chevron */}
                <ChevronDown
                    size={13}
                    style={{
                        color: '#6b7280',
                        flexShrink: 0,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s ease',
                    }}
                />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            left: 0,
                            right: 0,
                            minWidth: '220px',
                            borderRadius: '14px',
                            background: 'rgba(15, 20, 35, 0.97)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
                            zIndex: 200,
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '10px 12px 8px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                        }}>
                            <LayoutGrid size={11} style={{ color: '#6366f1' }} />
                            <span style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.12em',
                            }}>
                                Switch Environment
                            </span>
                        </div>

                        {/* Tenant List */}
                        <div style={{ padding: '6px' }}>
                            {tenants.map((tenant) => {
                                const isActive = activeId === tenant.tenantId;
                                const color = getTenantColor(tenant.displayName);
                                const tInitials = (tenant.displayName || 'T').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

                                return (
                                    <button
                                        key={tenant.tenantId}
                                        onClick={() => handleSelect(tenant.tenantId)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '8px 10px',
                                            borderRadius: '10px',
                                            background: isActive ? color.bg : 'transparent',
                                            border: `1px solid ${isActive ? color.border : 'transparent'}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            textAlign: 'left',
                                            marginBottom: '2px',
                                        }}
                                        onMouseEnter={e => {
                                            if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        }}
                                        onMouseLeave={e => {
                                            if (!isActive) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        {/* Avatar */}
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '7px',
                                            background: color.bg,
                                            border: `1px solid ${color.border}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            color: color.dot,
                                        }}>
                                            {tInitials}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                color: isActive ? color.dot : '#cbd5e1',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}>
                                                {tenant.displayName}
                                            </div>
                                            <div style={{
                                                fontSize: '9px',
                                                color: '#374151',
                                                fontFamily: 'monospace',
                                                marginTop: '1px',
                                            }}>
                                                {tenant.tenantId.substring(0, 8)}…
                                            </div>
                                        </div>

                                        {/* Active Check */}
                                        {isActive && (
                                            <div style={{
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '50%',
                                                background: color.bg,
                                                border: `1px solid ${color.border}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                <Check size={10} style={{ color: color.dot }} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '6px',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <button
                                onClick={() => { setIsOpen(false); navigate('/service/tenants'); }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '7px 10px',
                                    borderRadius: '9px',
                                    background: 'transparent',
                                    border: '1px solid transparent',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    transition: 'all 0.15s ease',
                                    textAlign: 'left',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.color = '#a5b4fc';
                                    e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.color = '#6b7280';
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                            >
                                <Settings size={12} />
                                <span>Manage Tenants</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TenantSelector;
