import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMsal } from '@azure/msal-react';
import {
    ShieldCheck, Smartphone, Lock, LogOut, LayoutDashboard, Menu, Search, Bell, Settings as SettingsIcon, BarChart3, Command
} from 'lucide-react';
import SearchModal from './SearchModal';

const ServiceLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { instance, accounts } = useMsal();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [unresolvedAlertsCount, setUnresolvedAlertsCount] = useState(0);
    const username = localStorage.getItem('m365_user') || 'Admin';

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

                const accessToken = await instance.acquireTokenSilent({
                    scopes: ['https://graph.microsoft.com/.default'],
                    account: accounts[0]
                });

                const client = Client.init({
                    authProvider: (done) => {
                        done(null, accessToken.accessToken);
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
        // Refresh every 5 minutes
        const interval = setInterval(fetchAlertCount, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [instance, accounts]);

    const handleLogout = () => {
        localStorage.removeItem('m365_user');
        navigate('/');
    };

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className="sidebar" style={{ width: isSidebarOpen ? 'var(--sidebar-width)' : '80px' }}>
                <div className="sidebar-header" style={{ height: 'var(--header-height)', padding: '0 12px' }}>
                    <div className="flex-center" style={{
                        width: '24px',
                        height: '24px',
                        background: 'var(--glass-bg)',
                        borderRadius: '6px',
                        border: '1px solid var(--glass-border)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '2px',
                        padding: '3px'
                    }}>
                        <div style={{ backgroundColor: '#f25022', borderRadius: '1px' }}></div>
                        <div style={{ backgroundColor: '#7fba00', borderRadius: '1px' }}></div>
                        <div style={{ backgroundColor: '#00a4ef', borderRadius: '1px' }}></div>
                        <div style={{ backgroundColor: '#ffb900', borderRadius: '1px' }}></div>
                    </div>
                    {isSidebarOpen && <span className="font-bold" style={{ fontSize: '14px', marginLeft: '8px' }}>M365 Portal</span>}
                </div>

                <nav className="sidebar-nav">
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
                        active={isActive('/service/admin')}
                        isOpen={isSidebarOpen}
                        onClick={() => navigate('/service/admin')}
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
                </nav>

                <div style={{ padding: '12px', borderTop: '1px solid hsla(0,0%,100%,0.05)' }}>
                    <button className="btn-secondary w-full" onClick={handleLogout} style={{ justifyContent: isSidebarOpen ? 'flex-start' : 'center', padding: '8px', fontSize: '11px' }}>
                        <LogOut size={14} />
                        {isSidebarOpen && <span style={{ marginLeft: '8px' }}>Sign Out</span>}
                    </button>
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
                        <button
                            onClick={() => navigate('/service/admin/profile')}
                            className="flex-center flex-gap-2"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '8px', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0,0%,100%,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                            <div style={{ textAlign: 'right' }}>
                                <div className="font-semibold" style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{username}</div>
                                <div style={{ fontSize: '7px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Global Admin</div>
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
