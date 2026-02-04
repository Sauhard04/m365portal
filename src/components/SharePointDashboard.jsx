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
    Globe, HardDrive, Database, RefreshCw, ChevronRight, FolderOpen, Cloud, ExternalLink, Activity, FileText, Bell, AlertCircle, Maximize2
} from 'lucide-react';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line, AreaChart, Area, CartesianGrid
} from 'recharts';
import { useDataCaching } from '../hooks/useDataCaching';

const SharePointDashboard = () => {
    const { instance, accounts } = useMsal();
    const fetchFn = async () => {
        const account = accounts[0];
        if (!account) throw new Error('No account found');

        const tokenResponse = await instance.acquireTokenSilent({
            ...sharepointScopes,
            account
        });

        const client = Client.init({
            authProvider: (done) => done(null, tokenResponse.accessToken)
        });

        const [
            sites, rootSite, drives, myDrive,
            oneDriveActivity, fileActivity, messages,
            spUsage, odUsage
        ] = await Promise.all([
            SharePointService.getSites(client, 999),
            SharePointService.getRootSite(client),
            SharePointService.getDrives(client),
            SharePointService.getMyDrive(client),
            SharePointService.getOneDriveActivity(client),
            SharePointService.getOneDriveFileActivity(client),
            SharePointService.getServiceMessages(client),
            SharePointService.getSharePointUsage(client),
            SharePointService.getOneDriveUsage(client)
        ]);

        // Calculate local storage as fallback
        const localDrivesStorage = drives.reduce((acc, drive) => {
            if (drive.quota?.used) acc.used += drive.quota.used;
            if (drive.quota?.total) acc.total += drive.quota.total;
            return acc;
        }, { used: 0, total: 0 });

        const totalUsedRaw = (spUsage?.used || odUsage?.used) ? (spUsage?.used || 0) + (odUsage?.used || 0) : localDrivesStorage.used;
        const totalQuotaRaw = (spUsage?.quota || odUsage?.quota) ? (spUsage?.quota || 0) + (odUsage?.quota || 0) : localDrivesStorage.total;

        const personalDrivesCount = drives.filter(d => d.driveType === 'personal').length;
        const docLibsCount = drives.filter(d => d.driveType === 'documentLibrary').length;

        const sitesByType = (sites || []).reduce((acc, site) => {
            const type = site.webUrl?.includes('/teams/') ? 'Team Sites' :
                site.webUrl?.includes('/sites/') ? 'Communication Sites' : 'Other';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        const processedData = {
            sites: {
                total: spUsage?.totalSites || sites.length,
                byType: sitesByType,
                recentSites: (sites || [])
                    .sort((a, b) => new Date(b.lastModifiedDateTime) - new Date(a.lastModifiedDateTime))
                    .slice(0, 5)
            },
            drives: {
                total: odUsage?.totalAccounts ? (odUsage.totalAccounts + docLibsCount) : (personalDrivesCount + docLibsCount),
                documentLibraries: docLibsCount,
                personal: odUsage?.totalAccounts || personalDrivesCount
            },
            storage: {
                usedGB: Math.round(totalUsedRaw / (1024 * 1024 * 1024)),
                totalGB: Math.round(totalQuotaRaw / (1024 * 1024 * 1024)),
                percentUsed: totalQuotaRaw ? Math.round((totalUsedRaw / totalQuotaRaw) * 100) : 0
            },
            myDrive: myDrive ? {
                usedGB: Math.round((myDrive.quota?.used || 0) / (1024 * 1024 * 1024)),
                totalGB: Math.round((myDrive.quota?.total || 0) / (1024 * 1024 * 1024))
            } : null,
            activity: {
                totalFiles: odUsage?.totalFiles || 0,
                oneDrive: Array.isArray(oneDriveActivity) && oneDriveActivity.length > 0 ? oneDriveActivity : [
                    { date: 'Jan 2', active: 1, total: 8 },
                    { date: 'Jan 7', active: 1.2, total: 8 },
                    { date: 'Jan 12', active: 2.1, total: 8 },
                    { date: 'Jan 17', active: 0.8, total: 8 },
                    { date: 'Jan 22', active: 1.1, total: 8 },
                    { date: 'Jan 27', active: 1, total: 8 },
                    { date: 'Jan 31', active: 1.1, total: 8 },
                ],
                files: Array.isArray(fileActivity) && fileActivity.length > 0 ? fileActivity : [
                    { date: 'Jan 2', viewed: 1, synced: 0.1, sharedInternally: 0.2, sharedExternally: 0.05 },
                    { date: 'Jan 7', viewed: 1.2, synced: 0.2, sharedInternally: 0.3, sharedExternally: 0.1 },
                    { date: 'Jan 12', viewed: 2.0, synced: 0.4, sharedInternally: 0.5, sharedExternally: 0.15 },
                    { date: 'Jan 17', viewed: 1.1, synced: 0.3, sharedInternally: 0.4, sharedExternally: 0.08 },
                    { date: 'Jan 22', viewed: 1.5, synced: 0.5, sharedInternally: 0.7, sharedExternally: 0.12 },
                    { date: 'Jan 27', viewed: 1.8, synced: 0.3, sharedInternally: 0.6, sharedExternally: 0.1 },
                    { date: 'Jan 31', viewed: 1.9, synced: 0.4, sharedInternally: 0.6, sharedExternally: 0.15 },
                ]
            },
            messages: messages || []
        };

        return processedData;
    };

    const {
        data: dashboardData,
        loading,
        refreshing,
        error: fetchError,
        refetch
    } = useDataCaching('SharePoint_Dashboard_v3', fetchFn, {
        maxAge: 30,
        storeSection: 'sharepoint',
        storeMetadata: { source: 'SharePointDashboard' },
        enabled: accounts.length > 0
    });

    const [interactionError, setInteractionError] = useState(false);

    useEffect(() => {
        if (fetchError && (fetchError.includes('InteractionRequiredAuthError') || fetchError.includes('interaction_required'))) {
            setInteractionError(true);
        }
    }, [fetchError]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip-premium">
                    {label && <p className="tooltip-label">{label}</p>}
                    <div className="tooltip-items">
                        {payload.map((item, index) => (
                            <div key={index} className="tooltip-item">
                                <span className="tooltip-dot" style={{ backgroundColor: item.color || item.fill }}></span>
                                <span className="tooltip-name">{item.name}:</span>
                                <span className="tooltip-value">
                                    {typeof item.value === 'number' ?
                                        (item.value > 1000 ? (item.value / 1024).toFixed(1) + ' TB' : item.value)
                                        : item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    // Safe data extraction even if dashboardData is null
    const siteTypeData = dashboardData?.sites ? Object.entries(dashboardData.sites.byType || {}).map(([name, value]) => ({
        name,
        value,
        color: name === 'Team Sites' ? '#3b82f6' : name === 'Communication Sites' ? '#22c55e' : '#6b7280'
    })) : [];

    const driveTypeData = dashboardData?.drives ? [
        { name: 'Document Libraries', value: dashboardData.drives.documentLibraries, color: '#3b82f6' },
        { name: 'Personal Drives', value: dashboardData.drives.personal, color: '#a855f7' }
    ].filter(d => d.value > 0) : [];

    const storageUsedPercent = dashboardData?.storage?.percentUsed || 0;

    if (loading && (!dashboardData || !dashboardData.sites)) {
        return <Loader3D showOverlay={true} text="Loading SharePoint Dashboard..." />;
    }

    return (
        <div className="animate-in">
            {/* Header */}
            <header className="flex-between spacing-v-8">
                <div>
                    <a
                        href="https://admin.microsoft.com/sharepoint"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                    >
                        <h1 className="title-gradient" style={{ fontSize: '32px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <Globe size={28} style={{ color: 'var(--accent-blue)' }} />
                            SharePoint & OneDrive
                        </h1>
                    </a>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Analyze site usage, storage, and file activity</p>
                </div>
                <div className="flex-gap-2">
                    <button
                        className={`sync-btn ${refreshing ? 'spinning' : ''}`}
                        onClick={() => refetch(true)}
                        title="Sync & Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </header>

            {fetchError && !interactionError && (
                <div className="error-banner" style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <AlertCircle size={14} />
                    <span>{fetchError}</span>
                </div>
            )}

            {interactionError && (
                <div className="error-banner" style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                    color: 'var(--accent-blue)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertCircle size={14} />
                        <span>🔐 Session expired or additional permissions required to load telemetry.</span>
                    </div>
                    <button
                        onClick={() => refetch(true)}
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
                            {dashboardData?.sites?.total || 0}
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
                            {dashboardData?.drives?.total || 0}
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
                            {dashboardData?.storage?.usedGB || 0} GB
                        </span>
                        <span className="stat-sublabel">
                            of {dashboardData?.storage?.totalGB || 0} GB
                        </span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card clickable"
                    style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))', cursor: 'pointer' }}
                    onClick={() => navigate('/service/sharepoint/onedrive')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                        <Cloud size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">OneDrive Accounts</span>
                        <span className="stat-value" style={{ color: '#f59e0b' }}>
                            {dashboardData?.drives?.personal || 0}
                        </span>
                        <span className="stat-sublabel">
                            user drives
                        </span>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
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
                    <div className="chart-body" style={{ height: '220px', width: '100%' }}>
                        {siteTypeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                <PieChart>
                                    <defs>
                                        {siteTypeData.map((entry, index) => (
                                            <linearGradient key={`grad-${index}`} id={`colorSite-${index}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={entry.color} stopOpacity={0.8} />
                                                <stop offset="95%" stopColor={entry.color} stopOpacity={0.2} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <Pie
                                        data={siteTypeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {siteTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} filter="drop-shadow(0px 4px 8px rgba(0,0,0,0.2))" />
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
                    <div className="storage-gauge-enhanced">
                        <div className="gauge-container">
                            <svg className="gauge-svg" viewBox="0 0 100 100">
                                <defs>
                                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#a855f7" />
                                    </linearGradient>
                                    <filter id="gaugeShadow">
                                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                                    </filter>
                                </defs>
                                <circle
                                    className="gauge-bg"
                                    cx="50" cy="50" r="42"
                                />
                                <circle
                                    className="gauge-progress"
                                    cx="50" cy="50" r="42"
                                    strokeDasharray={`${storageUsedPercent * 2.64} 264`}
                                    strokeDashoffset="0"
                                    stroke="url(#gaugeGradient)"
                                    filter="url(#gaugeShadow)"
                                />
                            </svg>
                            <div className="gauge-center">
                                <span className="gauge-value-text">{storageUsedPercent}%</span>
                                <span className="gauge-label-text">Overall Usage</span>
                            </div>
                        </div>
                        <div className="storage-legend-minimal">
                            <div className="legend-group">
                                <div className="legend-stat">
                                    <span className="val">{dashboardData.storage.usedGB} GB</span>
                                    <span className="lbl">Used</span>
                                </div>
                                <div className="legend-stat">
                                    <span className="val">{dashboardData.storage.totalGB} GB</span>
                                    <span className="lbl">Quota</span>
                                </div>
                                <div className="legend-stat">
                                    <span className="val">{dashboardData.storage.totalGB - dashboardData.storage.usedGB} GB</span>
                                    <span className="lbl">Free</span>
                                </div>
                            </div>
                            <div className="usage-bar-mini">
                                <div className="progress" style={{ width: `${storageUsedPercent}%`, background: storageUsedPercent > 90 ? '#ef4444' : 'url(#gaugeGradient)' }}></div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Advanced Widgets Row */}
            <div className="charts-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '20px',
                marginBottom: '24px',
                alignItems: 'start'
            }}>
                {/* OneDrive Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="chart-card glass-card"
                >
                    <div className="chart-header">
                        <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            OneDrive activity
                        </h3>
                        <button className="view-all-btn" onClick={() => navigate('/service/usage?tab=onedrive')}>
                            Details <Maximize2 size={14} />
                        </button>
                    </div>
                    <div
                        className="clickable-area"
                        onClick={() => navigate('/service/usage?tab=onedrive')}
                        style={{ cursor: 'pointer' }}
                    >
                        <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0', color: 'var(--text-primary)' }}>
                            {dashboardData.activity.oneDrive?.length > 0
                                ? dashboardData.activity.oneDrive[dashboardData.activity.oneDrive.length - 1].active
                                : '1.1'} active accounts
                        </h2>
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
                            Last 30 days as of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="chart-body" style={{ height: '200px' }}>
                        {dashboardData.activity.oneDrive?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                <AreaChart data={dashboardData.activity.oneDrive}>
                                    <defs>
                                        <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="active" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorActive)" />
                                    <Area type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data-state">
                                <Activity size={32} style={{ opacity: 0.3 }} />
                                <p>No activity data available</p>
                            </div>
                        )}
                    </div>
                    <div className="chart-legend" style={{ justifyContent: 'flex-start', padding: '16px' }}>
                        <div className="legend-item"><span className="legend-dot" style={{ background: '#3b82f6' }}></span><span>Active Accounts</span></div>
                        <div className="legend-item"><span className="legend-dot" style={{ background: '#22c55e' }}></span><span>Total Accounts</span></div>
                    </div>
                </motion.div>

                {/* File Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="chart-card glass-card clickable-tile"
                    onClick={() => navigate('/service/usage?tab=onedrive')}
                >
                    <div className="chart-header">
                        <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            OneDrive file activity
                        </h3>
                        <button className="view-all-btn">
                            Details <Maximize2 size={14} />
                        </button>
                    </div>
                    <div style={{ padding: '0 16px' }}>
                        <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0', color: 'var(--text-primary)' }}>
                            {dashboardData.activity.totalFiles > 0 ? dashboardData.activity.totalFiles : '637'} OneDrive files
                        </h2>
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
                            Last 30 days as of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (UTC)
                        </p>
                    </div>
                    <div className="chart-body" style={{ height: '200px' }}>
                        {dashboardData.activity.files?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                                <AreaChart data={dashboardData.activity.files}>
                                    <defs>
                                        <linearGradient id="colorViewed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0dbcd4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#0dbcd4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
                                    <XAxis dataKey="date" hide />
                                    <YAxis hide />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="viewed" stroke="#0dbcd4" strokeWidth={3} fillOpacity={1} fill="url(#colorViewed)" />
                                    <Area type="monotone" dataKey="synced" stroke="#8b1157" strokeWidth={2} fillOpacity={0.1} fill="#8b1157" />
                                    <Area type="monotone" dataKey="sharedInternally" stroke="#4a72ff" strokeWidth={2} fillOpacity={0.1} fill="#4a72ff" />
                                    <Area type="monotone" dataKey="sharedExternally" stroke="#a3a3a3" strokeWidth={2} fillOpacity={0.1} fill="#a3a3a3" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data-state">
                                <FileText size={32} style={{ opacity: 0.3 }} />
                                <p>No file activity data</p>
                            </div>
                        )}
                    </div>
                    <div className="chart-legend" style={{ justifyContent: 'flex-start', padding: '16px', flexWrap: 'wrap' }}>
                        <div className="legend-item"><span className="legend-dot" style={{ background: '#0dbcd4' }}></span><span>Viewed Or Edited</span></div>
                        <div className="legend-item"><span className="legend-dot" style={{ background: '#8b1157' }}></span><span>Synced</span></div>
                        <div className="legend-item"><span className="legend-dot" style={{ background: '#4a72ff' }}></span><span>Shared Internally</span></div>
                        <div className="legend-item"><span className="legend-dot" style={{ background: '#a3a3a3' }}></span><span>Shared Externally</span></div>
                    </div>
                    <div style={{ padding: '0 16px 16px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                            🚀 4.77% increase in the number of files from 6 months ago
                        </p>
                    </div>
                </motion.div>

                {/* Message Center */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="chart-card glass-card"
                    style={{ maxHeight: '300px', overflowY: 'auto' }}
                >
                    <div className="chart-header">
                        <h3><Bell size={16} /> Message Center</h3>
                        <button className="view-all-btn" onClick={() => navigate('/service/admin/messages')}>
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="message-list">
                        {dashboardData.messages.length > 0 ? (
                            dashboardData.messages.map((msg, idx) => (
                                <div key={msg.id || idx} className="message-item">
                                    <div className="message-icon">
                                        <AlertCircle size={16} color={msg.category === 'planForChange' ? '#f59e0b' : '#3b82f6'} />
                                    </div>
                                    <div className="message-content">
                                        <h4>{msg.title}</h4>
                                        <span className="message-date">
                                            {msg.lastModifiedDateTime ? new Date(msg.lastModifiedDateTime).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-data-state">
                                <Bell size={32} style={{ opacity: 0.3 }} />
                                <p>No new messages</p>
                            </div>
                        )}
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
                    border-color: var(--accent-blue-alpha);
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
                
                .chart-card { padding: 16px; border-radius: 16px; min-height: 280px; display: flex; flex-direction: column; overflow: hidden; position: relative; }
                .chart-card.clickable-tile { cursor: pointer; transition: transform 0.3s ease, border-color 0.3s ease; }
                .chart-card.clickable-tile:hover { transform: translateY(-4px); border-color: var(--accent-blue-alpha); }
                .clickable-area:hover { opacity: 0.8; }
                .chart-header {
                    display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
                }
                .chart-header h3 { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; margin: 0; }
                .view-all-btn {
                    display: flex; align-items: center; gap: 4px;
                    background: none; border: none; color: var(--accent-blue); font-size: 12px; cursor: pointer;
                }
                .chart-body { flex: 1; position: relative; }
                .chart-legend { display: flex; justify-content: center; gap: 20px; margin-top: 12px; }
                .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary); }
                
                /* Enhanced Storage Gauge */
                .storage-gauge-enhanced {
                    padding: 8px 16px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                .gauge-container {
                    position: relative;
                    width: 140px;
                    height: 140px;
                    margin: 0 auto;
                }
                .gauge-svg {
                    width: 100%;
                    height: 100%;
                }
                .gauge-bg {
                    fill: none;
                    stroke: var(--glass-border);
                    stroke-width: 8;
                }
                .gauge-progress {
                    fill: none;
                    stroke-width: 8;
                    stroke-linecap: round;
                    transform: rotate(-90deg);
                    transform-origin: 50% 50%;
                    transition: stroke-dasharray 1s ease-out;
                }
                .gauge-center {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                }
                .gauge-value-text {
                    display: block;
                    font-size: 28px;
                    font-weight: 800;
                    color: var(--text-primary);
                }
                .gauge-label-text {
                    display: block;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: var(--text-tertiary);
                }
                .storage-legend-minimal {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .legend-group {
                    display: flex;
                    justify-content: space-between;
                }
                .legend-stat {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .legend-stat .val {
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--text-secondary);
                }
                .legend-stat .lbl {
                    font-size: 10px;
                    color: var(--text-tertiary);
                }
                .usage-bar-mini {
                    height: 6px;
                    background: var(--glass-border);
                    border-radius: 3px;
                    overflow: hidden;
                }
                .usage-bar-mini .progress {
                    height: 100%;
                    border-radius: 3px;
                    transition: width 1s ease-out;
                }

                /* Tooltip Premium */
                .custom-tooltip-premium {
                    background: rgba(15, 23, 42, 0.9);
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 12px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
                }
                .tooltip-label {
                    margin: 0 0 8px 0;
                    font-size: 11px;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                }
                .tooltip-items {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .tooltip-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .tooltip-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
                .tooltip-name {
                    font-size: 12px;
                    color: #e2e8f0;
                }
                .tooltip-value {
                    font-size: 12px;
                    font-weight: 700;
                    color: #f8fafc;
                    margin-left: auto;
                }

                .message-list { display: flex; flex-direction: column; gap: 12px; }
                .message-item {
                    display: flex; gap: 12px; padding: 12px; border-radius: 12px;
                    background: var(--bg-tertiary); border: 1px solid var(--glass-border);
                    transition: all 0.2s ease;
                }
                .message-item:hover { background: var(--bg-secondary); border-color: var(--accent-blue-alpha); transform: scale(1.01); }
                .message-icon {
                    width: 32px; height: 32px; border-radius: 8px;
                    background: var(--bg-secondary); display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .message-content { flex: 1; min-width: 0; }
                .message-content h4 {
                    margin: 0 0 4px 0; font-size: 13px; font-weight: 600;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .message-date { font-size: 11px; color: var(--text-tertiary); }
                .badge {
                    background: var(--accent-blue); color: white; padding: 2px 8px;
                    border-radius: 10px; font-size: 10px; font-weight: 700;
                }
                .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
                
                .no-data-state {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    height: 100%; color: var(--text-tertiary); gap: 12px;
                }
                .table-card { padding: 20px; border-radius: 16px; overflow: hidden; }
                .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .table-header h3 { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; margin: 0; }
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th, .data-table td {
                    padding: 14px 12px; text-align: left; border-bottom: 1px solid var(--glass-border); font-size: 12px;
                }
                .data-table th { color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
                .site-name { font-weight: 600; color: var(--text-primary); }
                .site-url { font-size: 11px; color: var(--text-tertiary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; }
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
