import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { motion } from 'framer-motion';
import { sharepointScopes } from '../authConfig';
import { SharePointService } from '../services/sharepoint/sharepoint.service';
import { DataPersistenceService } from '../services/dataPersistence';
import AnimatedTile from './AnimatedTile';
import Loader3D from './Loader3D';
import {
    Globe, HardDrive, Database, RefreshCw, ChevronRight, FolderOpen, Cloud, ExternalLink
} from 'lucide-react';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis
} from 'recharts';

const SharePointDashboard = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dashboardData, setDashboardData] = useState({
        sites: { total: 0, byType: {}, recentSites: [] },
        drives: { total: 0, documentLibraries: 0, personal: 0 },
        storage: { totalGB: 0, usedGB: 0, percentUsed: 0 },
        myDrive: null
    });
    const [error, setError] = useState(null);

    const CACHE_KEY = 'sharepoint_dashboard';
    const CACHE_DURATION = 5 * 60 * 1000;

    const fetchDashboardData = async (isManual = false) => {
        if (accounts.length === 0) return;

        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            if (!isManual) {
                const cached = DataPersistenceService.load(CACHE_KEY, CACHE_DURATION);
                if (cached) {
                    setDashboardData(cached);
                    setLoading(false);
                    return;
                }
            }

            const account = accounts[0];
            if (!account) throw new Error('No account found');

            const tokenResponse = await instance.acquireTokenSilent({
                ...sharepointScopes,
                account
            }).catch(async (authErr) => {
                if (authErr.name === "InteractionRequiredAuthError" || authErr.errorCode === "invalid_grant") {
                    if (isManual) {
                        return await instance.acquireTokenPopup(sharepointScopes);
                    } else {
                        throw authErr;
                    }
                }
                throw authErr;
            });

            const client = Client.init({
                authProvider: (done) => done(null, tokenResponse.accessToken)
            });

            const data = await SharePointService.getDashboardSummary(client);
            setDashboardData(data);
            DataPersistenceService.save(CACHE_KEY, data);
        } catch (err) {
            if (err.name === "InteractionRequiredAuthError" || err.errorCode === "invalid_grant") {
                console.warn("Interaction required for SharePoint Dashboard");
                setError("InteractionRequired");
            } else {
                console.error('Failed to fetch SharePoint dashboard data:', err);
                setError(err.message || "Failed to load SharePoint data");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [instance, accounts]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(12px)',
                    minWidth: '140px'
                }}>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--tooltip-text)', fontSize: '12px' }}>
                        {payload[0].name}: {payload[0].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    const siteTypeData = Object.entries(dashboardData.sites.byType || {}).map(([name, value]) => ({
        name,
        value,
        color: name === 'Team Sites' ? '#3b82f6' : name === 'Communication Sites' ? '#22c55e' : '#6b7280'
    }));

    const driveTypeData = [
        { name: 'Document Libraries', value: dashboardData.drives.documentLibraries, color: '#3b82f6' },
        { name: 'Personal Drives', value: dashboardData.drives.personal, color: '#a855f7' }
    ].filter(d => d.value > 0);

    const storageUsedPercent = dashboardData.storage.percentUsed || 0;

    if (loading) {
        return <Loader3D showOverlay={true} text="Loading SharePoint Dashboard..." />;
    }

    return (
        <div className="animate-in">
            {/* Header */}
            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Globe size={28} style={{ color: 'var(--accent-blue)' }} />
                        SharePoint & OneDrive
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Manage sites, document libraries, and storage</p>
                </div>
                <div className="flex-gap-2">
                    <button
                        className={`sync-btn ${refreshing ? 'spinning' : ''}`}
                        onClick={() => fetchDashboardData(true)}
                        title="Sync & Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </header>

            {error && (
                <div className="error-banner" style={{
                    background: error === 'InteractionRequired' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${error === 'InteractionRequired' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                    color: error === 'InteractionRequired' ? 'var(--accent-blue)' : '#ef4444',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>{error === 'InteractionRequired' ? '🔐 SharePoint session expired. Additional permissions required to load telemetry.' : error}</span>
                    {error === 'InteractionRequired' && (
                        <button
                            onClick={() => fetchDashboardData(true)}
                            style={{
                                background: 'var(--accent-blue)',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Reconnect
                        </button>
                    )}
                </div>
            )}

            {/* Stats Row */}
            <div className="stats-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card clickable"
                    style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.02))', cursor: 'pointer' }}
                    onClick={() => navigate('/service/sharepoint/sites')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                        <Globe size={20} style={{ color: '#3b82f6' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">SharePoint Sites</span>
                        <span className="stat-value" style={{ color: '#3b82f6' }}>
                            {dashboardData.sites.total}
                        </span>
                        <span className="stat-sublabel">
                            active sites
                        </span>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card"
                    style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(168, 85, 247, 0.02))', cursor: 'default' }}
                >
                    <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.2)' }}>
                        <HardDrive size={20} style={{ color: '#a855f7' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Drives</span>
                        <span className="stat-value" style={{ color: '#a855f7' }}>
                            {dashboardData.drives.total}
                        </span>
                        <span className="stat-sublabel">
                            total drives
                        </span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card"
                    style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.02))', cursor: 'default' }}
                >
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                        <Database size={20} style={{ color: '#22c55e' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Storage Used</span>
                        <span className="stat-value" style={{ color: '#22c55e' }}>
                            {dashboardData.storage.usedGB} GB
                        </span>
                        <span className="stat-sublabel">
                            of {dashboardData.storage.totalGB} GB
                        </span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card"
                    style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))', cursor: 'default' }}
                >
                    <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                        <Cloud size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">My OneDrive</span>
                        <span className="stat-value" style={{ color: '#f59e0b' }}>
                            {dashboardData.myDrive?.usedGB || 0} GB
                        </span>
                        <span className="stat-sublabel">
                            personal storage
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* Charts Row */}
            <div className="charts-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '20px',
                marginBottom: '24px',
                alignItems: 'start'
            }}>
                {/* Site Types */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="chart-card glass-card"
                >
                    <div className="chart-header">
                        <h3><Globe size={16} /> Sites by Type</h3>
                        <button
                            className="view-all-btn"
                            onClick={() => navigate('/service/sharepoint/sites')}
                        >
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="chart-body" style={{ height: '220px' }}>
                        {siteTypeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={siteTypeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {siteTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data-state">
                                <Globe size={40} style={{ opacity: 0.3 }} />
                                <p>No sites data available</p>
                            </div>
                        )}
                    </div>
                    <div className="chart-legend">
                        {siteTypeData.map((item, idx) => (
                            <div key={idx} className="legend-item">
                                <span className="legend-dot" style={{ background: item.color }}></span>
                                <span>{item.name}: {item.value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Storage Usage */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="chart-card glass-card"
                >
                    <div className="chart-header">
                        <h3><Database size={16} /> Storage Overview</h3>
                    </div>
                    <div className="storage-gauge" style={{ padding: '20px' }}>
                        <div className="gauge-circle">
                            <svg viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="10"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke={storageUsedPercent > 80 ? '#ef4444' : storageUsedPercent > 50 ? '#f59e0b' : '#22c55e'}
                                    strokeWidth="10"
                                    strokeDasharray={`${storageUsedPercent * 2.51} 251`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 50 50)"
                                />
                            </svg>
                            <div className="gauge-value">
                                <span className="percent">{storageUsedPercent}%</span>
                                <span className="label">Used</span>
                            </div>
                        </div>
                        <div className="storage-details">
                            <div className="detail-row">
                                <span>Used</span>
                                <span>{dashboardData.storage.usedGB} GB</span>
                            </div>
                            <div className="detail-row">
                                <span>Total</span>
                                <span>{dashboardData.storage.totalGB} GB</span>
                            </div>
                            <div className="detail-row">
                                <span>Available</span>
                                <span>{dashboardData.storage.totalGB - dashboardData.storage.usedGB} GB</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Recent Sites */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="table-card glass-card"
            >
                <div className="table-header">
                    <h3><FolderOpen size={16} /> Recent Sites</h3>
                </div>
                <div className="table-body">
                    {dashboardData.sites.recentSites?.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Site Name</th>
                                    <th>URL</th>
                                    <th>Created</th>
                                    {/* Actions column removed */}
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardData.sites.recentSites.map((site, idx) => (
                                    <tr key={site.id || idx}>
                                        <td className="site-name">{site.displayName || site.name || 'Unnamed Site'}</td>
                                        <td className="site-url">{site.webUrl || 'N/A'}</td>
                                        <td>{site.createdDateTime ? new Date(site.createdDateTime).toLocaleDateString() : 'N/A'}</td>
                                        {/* Actions cell removed */}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="no-data-state" style={{ padding: '40px' }}>
                            <Globe size={40} style={{ opacity: 0.3 }} />
                            <p>No sites found</p>
                        </div>
                    )}
                </div>
            </motion.div>

            <style>{`
                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 20px;
                    border-radius: 16px;
                    border: 1px solid var(--glass-border);
                    transition: all 0.3s ease;
                }
                .stat-card.clickable { cursor: pointer; }
                .stat-card.clickable:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                }
                .stat-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .stat-content { flex: 1; display: flex; flex-direction: column; }
                .stat-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
                .stat-value { font-size: 28px; font-weight: 700; line-height: 1; }
                .stat-sublabel { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }
                .chart-card { padding: 16px; border-radius: 16px; max-height: 280px; }
                .chart-header {
                    display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
                }
                .chart-header h3 { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; margin: 0; }
                .view-all-btn {
                    display: flex; align-items: center; gap: 4px;
                    background: none; border: none; color: var(--accent-blue); font-size: 12px; cursor: pointer;
                }
                .chart-legend { display: flex; justify-content: center; gap: 20px; margin-top: 12px; }
                .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary); }
                .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
                .storage-gauge { display: flex; align-items: center; gap: 30px; }
                .gauge-circle { position: relative; width: 120px; height: 120px; }
                .gauge-circle svg { width: 100%; height: 100%; }
                .gauge-value {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    text-align: center;
                }
                .gauge-value .percent { display: block; font-size: 24px; font-weight: 700; color: var(--text-primary); }
                .gauge-value .label { display: block; font-size: 11px; color: var(--text-tertiary); }
                .storage-details { flex: 1; }
                .detail-row {
                    display: flex; justify-content: space-between; padding: 8px 0;
                    border-bottom: 1px solid var(--glass-border); font-size: 13px;
                }
                .detail-row:last-child { border-bottom: none; }
                .no-data-state {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    height: 100%; color: var(--text-tertiary); gap: 12px;
                }
                .table-card { padding: 20px; border-radius: 16px; }
                .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .table-header h3 { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; margin: 0; }
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th, .data-table td {
                    padding: 12px; text-align: left; border-bottom: 1px solid var(--glass-border); font-size: 12px;
                }
                .data-table th { color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; font-size: 10px; }
                .site-name { font-weight: 500; color: var(--text-primary); }
                .site-url { font-size: 11px; color: var(--text-tertiary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
                .action-link { color: var(--accent-blue); display: inline-flex; padding: 4px; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .loading-container {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    height: 60vh; gap: 16px;
                }
                .loading-spinner {
                    width: 40px; height: 40px;
                    border: 3px solid var(--glass-border); border-top-color: var(--accent-blue);
                    border-radius: 50%; animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default SharePointDashboard;
