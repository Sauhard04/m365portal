import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { useMsal } from '@azure/msal-react';
import {
    ShieldCheck, Smartphone, Lock, LogOut, LayoutDashboard, Menu, Search, Bell, Settings as SettingsIcon, BarChart3, Activity, Command, BookOpen, Sun, Moon, User, Shield, Key, FolderOpen, MessageCircle, LifeBuoy
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
    const { instance, accounts } = useMsal();
    const { getAccessToken } = useToken();
    const activeTenantId = useActiveTenant();
    const { theme, toggleTheme } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [unresolvedAlertsCount, setUnresolvedAlertsCount] = useState(0);
    const username = localStorage.getItem('m365_user') || 'Admin';

    // Initialize user context and guard against tenant mismatch.
    // This is the critical safety check: if MSAL has a cached account from a
    // DIFFERENT tenant than what's currently active (e.g., Pilot account is cached
    // but Akarsh tenant is selected), force a logout + re-login with the correct tenant.
    useEffect(() => {
        if (accounts && accounts.length > 0) {
            const account = accounts[0];
            RuntimeConfig.setCurrentUser(account.homeAccountId);

            const activeTenantId = RuntimeConfig.getActiveTenantId();
            const accountTenantId = account.tenantId; // The tenant this account's token is from

            // If the logged-in account's tenant doesn't match the intended active tenant,
            // start a forced re-login for the correct tenant.
            if (activeTenantId && accountTenantId && activeTenantId !== accountTenantId) {
                console.warn(`[Layout] ⚠️ TENANT MISMATCH DETECTED!`);
                console.warn(`[Layout]   Active tenant: ${activeTenantId}`);
                console.warn(`[Layout]   Account tenant: ${accountTenantId}`);
                console.warn(`[Layout]   Forcing re-login with correct tenant credentials...`);

                RuntimeConfig.setPendingTenant(activeTenantId);
                instance.logoutRedirect({
                    postLogoutRedirectUri: window.location.origin,
                }).catch(err => {
                    console.error('[Layout] Forced logout failed:', err);
                });
                return; // Don't initialize anything with the wrong account
            }

            const tenantId = RuntimeConfig.getActiveTenantId();
            SiteDataStore.ensureInitialized(tenantId).then(() => {
                console.log('SiteDataStore initialized in Layout for tenant:', tenantId);
            });
        }
    }, [accounts, instance]);


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

    // Fetch unresolved alerts count
    useEffect(() => {
        const fetchAlertCount = async () => {
            try {
                if (!accounts || accounts.length === 0) return;

                const AlertsService = (await import('../services/alerts/alerts.service')).default;
                const { Client } = await import('@microsoft/microsoft-graph-client');

                const accessToken = await getAccessToken({
                    scopes: ['https://graph.microsoft.com/.default']
                });

                const client = Client.init({
                    authProvider: (done) => {
                        done(null, accessToken);
                    }
                });

                const alerts = await AlertsService.getAllAlerts(client);
                const unresolved = alerts.filter(a => a.status === 'unresolved').length;
                setUnresolvedAlertsCount(unresolved);
            } catch (error) {
                console.debug('Could not fetch alert count:', error);
            }
        };

        fetchAlertCount();

    }, [instance, accounts, getAccessToken, activeTenantId]);

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

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <div className="app-container" style={{ '--current-sidebar-width': isSidebarOpen ? 'var(--sidebar-width)' : '80px' }}>
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

                        <button
                            onClick={() => navigate('/service/admin/alerts')}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative' }}
                        >
                            <Bell size={18} />
                            {unresolvedAlertsCount > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-6px',
                                    background: 'var(--accent-error)',
                                    color: 'white',
                                    borderRadius: '10px',
                                    padding: '2px 5px',
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    minWidth: '16px',
                                    textAlign: 'center',
                                    border: '1.5px solid var(--bg-primary)'
                                }}>
                                    {unresolvedAlertsCount > 99 ? '99+' : unresolvedAlertsCount}
                                </span>
                            )}
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
