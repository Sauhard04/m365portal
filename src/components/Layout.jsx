import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import {
    ShieldCheck, Smartphone, Lock, LogOut, LayoutDashboard, Menu, Search, Settings as SettingsIcon, BarChart3, Activity, Command, BookOpen, Sun, Moon, User, Shield, Key, FolderOpen, MessageCircle, LifeBuoy, Layers
} from 'lucide-react';
import SearchModal from './SearchModal';
import Logo from './Logo';
import Chatbot from './Chatbot/Chatbot';
import SiteDataStore from '../services/siteDataStore';
import TenantSelector from './TenantSelector';
import { Building2 } from 'lucide-react';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import RuntimeConfig from '../config';

const ServiceLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { instance, accounts, inProgress } = useMsal();
    const { getAccessToken } = useToken();
    const activeTenantId = useActiveTenant();
    const { theme, toggleTheme } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [sessionMismatch, setSessionMismatch] = useState(false);
    const username = localStorage.getItem('m365_user') || 'Admin';

    // Initialize user context and guard against tenant mismatch.
    // This is the critical safety check: if MSAL has a cached account from a
    // DIFFERENT tenant than what's currently active (e.g., Pilot account is cached
    // but Akarsh tenant is selected), force a logout + re-login with the correct tenant.
    useEffect(() => {
        // Wait for MSAL to finish interactions (login/token) before checking for mismatches.
        // This prevents the "Akarsh Loop" where a redirects happen before the state is settled.
        if (inProgress !== InteractionStatus.None) return;

        if (accounts && accounts.length > 0) {
            const activeTenantId = RuntimeConfig.getActiveTenantId();

            // Search for an account that matches our active tenant environment
            const matchingAccount = accounts.find(acc => acc.tenantId === activeTenantId);
            const preferredAccount = matchingAccount || accounts[0];

            // Set the correct user context. RuntimeConfig.setCurrentUser respects the 
            // active switch context and won't overwrite it with stale preferences.
            RuntimeConfig.setCurrentUser(preferredAccount.homeAccountId);

            // If we have accounts but NONE of them match the intended tenant,
            // then we have a genuine mismatch. We show an overlay instead of 
            // redirecting to break potential refresh loops.
            if (activeTenantId && !matchingAccount) {
                console.warn(`[Layout] 🔄 SESSION MISMATCH: Active session doesn't belong to ${activeTenantId}.`);
                setSessionMismatch(true);
                return;
            }

            setSessionMismatch(false);

            const tenantId = RuntimeConfig.getActiveTenantId();
            SiteDataStore.ensureInitialized(tenantId).then(() => {
                console.log('[Layout] SiteDataStore checked for tenant:', tenantId);
            });
        }
    }, [accounts, instance, navigate, inProgress]);


    // Log route changes for AI context
    useEffect(() => {
        const path = location.pathname;
        let title = path.split('/').pop() || 'Dashboard';
        title = title.charAt(0).toUpperCase() + title.slice(1);
        SiteDataStore.logRoute(path, title);
    }, [location]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Keyboard shortcut for search (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);


    const handleLogout = async () => {
        try {
            // Clear all cached data first
            localStorage.clear();
            sessionStorage.clear();

            // Log out from MSAL which will redirect to Microsoft logout page
            await instance.logoutRedirect({
                postLogoutRedirectUri: window.location.origin,
                account: accounts[0]
            });
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect to home page even if logout fails
            window.location.href = '/';
        }
    };

    const handleMismatchResolution = () => {
        const activeTenantId = RuntimeConfig.getActiveTenantId();
        const tenants = RuntimeConfig.getTenants();
        const target = tenants.find(t => t.tenantId === activeTenantId);

        // Re-arm state for LandingPage as an explicit manual switch
        RuntimeConfig.setPendingTenant(
            activeTenantId,
            target?.clientId || RuntimeConfig.get('VITE_CLIENT_ID'),
            target?.displayName || activeTenantId,
            true // autoLogin (interactive)
        );

        navigate('/');
    };

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <div className="app-container" style={{ '--current-sidebar-width': isSidebarOpen ? 'var(--sidebar-width)' : '80px' }}>
            {/* Session Mismatch Overlay */}
            <AnimatePresence>
                {sessionMismatch && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(6,8,20,0.85)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 10000, backdropFilter: 'blur(8px)', padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="glass-card"
                            style={{
                                maxWidth: '400px', width: '100%', padding: '32px',
                                textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                            }}
                        >
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px', color: '#ef4444'
                            }}>
                                <ShieldCheck size={32} />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>
                                Session Mismatch
                            </h2>
                            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: 1.6, marginBottom: '24px' }}>
                                You are trying to view the <strong>{RuntimeConfig.get('VITE_TENANT_ID') === 'cd11ff1b-3f29-41a1-a38a-ba4dd74fe2c0' ? 'Akarsh' : 'Pilot'}</strong> environment,
                                but your active Microsoft session belongs to a different account.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    onClick={handleMismatchResolution}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                        color: '#fff', border: 'none', fontWeight: 600,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <LogOut size={16} />
                                    <span>Sign in with matching account</span>
                                </button>
                                <button
                                    onClick={() => navigate('/')}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.05)', color: '#d1d5db',
                                        border: '1px solid rgba(255,255,255,0.1)', fontWeight: 500,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Sidebar */}
            <aside className="sidebar" style={{ width: isSidebarOpen ? 'var(--sidebar-width)' : '80px' }}>
                <div className="sidebar-header" style={{ height: 'var(--header-height)', padding: '0 12px' }}>
                    <div className="flex-center">
                        <Logo size={28} />
                    </div>
                    {isSidebarOpen && <span className="font-bold" style={{ fontSize: '14px', marginLeft: '8px' }}>AdminSphere</span>}
                </div>

                {/* Tenant Selector */}
                {isSidebarOpen && (
                    <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
                            Environment
                        </div>
                        <TenantSelector />
                    </div>
                )}

                <nav className="sidebar-nav" style={{ paddingTop: '12px' }}>
                    <NavItem
                        icon={BarChart3}
                        label="Overview"
                        active={isActive('/service/overview')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/overview')}
                    />
                    <NavItem
                        icon={LayoutDashboard}
                        label="Admin Center"
                        active={location.pathname === '/service/admin' || (location.pathname.startsWith('/service/admin/') && location.pathname !== '/service/admin/user-activity')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/admin')}
                    />
                    <NavItem
                        icon={Activity}
                        label="User Activity"
                        active={location.pathname === '/service/admin/user-activity'}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/admin/user-activity')}
                    />
                    <NavItem
                        icon={ShieldCheck}
                        label="Entra ID"
                        active={isActive('/service/entra')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/entra')}
                    />
                    <NavItem
                        icon={Smartphone}
                        label="Intune"
                        active={isActive('/service/intune')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/intune')}
                    />
                    <NavItem
                        icon={Lock}
                        label="Purview"
                        active={isActive('/service/purview')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/purview')}
                    />
                    <NavItem
                        icon={Shield}
                        label="Security"
                        active={isActive('/service/security')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/security')}
                    />
                    <NavItem
                        icon={Key}
                        label="Governance"
                        active={isActive('/service/governance')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/governance')}
                    />
                    <NavItem
                        icon={FolderOpen}
                        label="SharePoint"
                        active={isActive('/service/sharepoint')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/sharepoint')}
                    />
                    <NavItem
                        icon={MessageCircle}
                        label="Teams"
                        active={isActive('/service/teams')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/teams')}
                    />
                    <NavItem
                        icon={Activity}
                        label="Usage"
                        active={isActive('/service/usage')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/usage')}
                    />
                    <NavItem
                        icon={BookOpen}
                        label="Documentation"
                        active={isActive('/service/documentation')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/documentation')}
                    />
                    <NavItem
                        icon={Building2}
                        label="Manage Tenants"
                        active={isActive('/service/tenants')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/tenants')}
                    />
                    <NavItem
                        icon={Layers}
                        label="Multi-Tenant"
                        active={isActive('/service/admin/multi-tenant-dashboard')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/admin/multi-tenant-dashboard')}
                    />
                </nav>

                {/* Support Section - Fixed at Bottom */}
                <div style={{
                    marginTop: 'auto',
                    padding: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <NavItem
                        icon={LifeBuoy}
                        label="Get Support"
                        active={isActive('/service/support')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/support')}
                    />
                </div>
            </aside>

            {/* Main Wrapper */}
            <main className="app-main" style={{ marginLeft: isSidebarOpen ? 'var(--sidebar-width)' : '80px' }}>
                <header className="header-top">
                    <div className="flex-center flex-gap-4">
                        <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <Menu size={16} />
                        </button>

                        {/* Clickable Search Icon */}
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="flex-center"
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                transition: 'color 0.2s',
                                padding: '6px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                            title="Search (Ctrl+K)"
                        >
                            <Search size={18} />
                        </button>
                    </div>

                    <div className="flex-center flex-gap-4">
                        <button
                            onClick={toggleTheme}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <div style={{ width: '1px', height: '16px', background: 'var(--glass-border)' }}></div>
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="flex-center flex-gap-2"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '8px', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0,0%,100%,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                                <div style={{ textAlign: 'right' }}>
                                    <div className="font-semibold" style={{ fontSize: '11px', color: '#fff' }}>{username}</div>
                                    <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Global Admin</div>
                                </div>
                                <div className="avatar" style={{
                                    width: '24px',
                                    height: '24px',
                                    background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-indigo))',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '9px',
                                    border: '1px solid var(--glass-border)'
                                }}>
                                    {username.substring(0, 2).toUpperCase()}
                                </div>
                            </button>

                            {/* Profile Dropdown */}
                            {isProfileMenuOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    right: 0,
                                    width: '180px',
                                    background: '#1e293b',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '6px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                                    zIndex: 100,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px'
                                }}>
                                    <button
                                        onClick={() => {
                                            navigate('/service/admin/profile');
                                            setIsProfileMenuOpen(false);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all hover:bg-white/5 text-gray-300 hover:text-white"
                                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                    >
                                        <User size={15} />
                                        <span>Profile</span>
                                    </button>
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all hover:bg-red-500/10 text-red-400 hover:text-red-300"
                                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                    >
                                        <LogOut size={15} />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="main-content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Search Modal */}
            <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

            {/* AI Chatbot */}
            <Chatbot />
        </div>
    );
};

const NavItem = ({ icon: Icon, label, active, isOpen, onClick }) => (
    <div
        onClick={onClick}
        className={`nav-item ${active ? 'active' : ''}`}
        style={{ justifyContent: isOpen ? 'flex-start' : 'center' }}
    >
        <Icon size={13} style={{ flexShrink: 0 }} />
        {isOpen && <span>{label}</span>}
    </div>
);

export default ServiceLayout;
