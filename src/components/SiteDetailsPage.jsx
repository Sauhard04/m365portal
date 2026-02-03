import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { motion } from 'framer-motion';
import { sharepointScopes } from '../authConfig';
import { SharePointService } from '../services/sharepoint/sharepoint.service';
import Loader3D from './Loader3D';
import {
    ArrowLeft, Globe, HardDrive, List, Database, ExternalLink, Calendar, RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const SiteDetailsPage = () => {
    const navigate = useNavigate();
    const { siteId } = useParams();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [siteData, setSiteData] = useState({
        site: null,
        drives: [],
        lists: [],
        storage: { usedGB: 0, totalGB: 0, percentUsed: 0 }
    });
    const [error, setError] = useState(null);

    const fetchSiteDetails = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const account = accounts[0];
            if (!account) throw new Error('No account found');

            const tokenResponse = await instance.acquireTokenSilent({
                ...sharepointScopes,
                account
            });

            const client = Client.init({
                authProvider: (done) => done(null, tokenResponse.accessToken)
            });

            const data = await SharePointService.getSiteDetails(client, siteId);
            setSiteData(data);
        } catch (err) {
            console.error('Failed to fetch site details:', err);
            setError(err.message || 'Failed to load site details');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSiteDetails();
    }, [siteId, instance, accounts]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(12px)'
                }}>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--tooltip-text)', fontSize: '12px' }}>
                        {payload[0].name}: {payload[0].value} GB
                    </p>
                </div>
            );
        }
        return null;
    };

    const storageData = siteData.drives.map((drive, idx) => ({
        name: drive.name || `Drive ${idx + 1}`,
        value: drive.usedGB,
        color: ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444'][idx % 5]
    })).filter(d => d.value > 0);

    if (loading) {
        return <Loader3D showOverlay={true} text="Loading Site Details..." />;
    }

    if (error || !siteData.site) {
        return (
            <div className="error-page">
                <h2>Failed to Load Site</h2>
                <p>{error || 'Site not found'}</p>
                <button className="glass-btn" onClick={() => navigate('/service/sharepoint/sites')}>
                    <ArrowLeft size={16} />
                    Back to Sites
                </button>
            </div>
        );
    }

    return (
        <div className="animate-in">
            {/* Header */}
            <header className="flex-between spacing-v-8">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <button className="glass-btn btn-back-nav" onClick={() => navigate('/service/sharepoint/sites')}>
                            <ArrowLeft size={18} />
                            Back to Sites
                        </button>
                    </div>
                    <h1 className="title-gradient" style={{ fontSize: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Globe size={28} style={{ color: 'var(--accent-blue)' }} />
                        {siteData.site.displayName || siteData.site.name}
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
                        {siteData.site.description || 'SharePoint Site'}
                    </p>
                    {siteData.site.webUrl && (
                        <a
                            href={siteData.site.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent-blue)', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}
                        >
                            <ExternalLink size={14} />
                            Open in SharePoint
                        </a>
                    )}
                </div>
                <button
                    className={`sync-btn ${refreshing ? 'spinning' : ''}`}
                    onClick={() => fetchSiteDetails(true)}
                    title="Refresh"
                >
                    <RefreshCw size={16} />
                </button>
            </header>

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
                    className="glass-card stat-card"
                    style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.02))' }}
                >
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                        <HardDrive size={20} style={{ color: '#3b82f6' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Document Libraries</span>
                        <span className="stat-value" style={{ color: '#3b82f6' }}>
                            {siteData.drives.length}
                        </span>
                        <span className="stat-sublabel">active drives</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card stat-card"
                    style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.02))' }}
                >
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                        <List size={20} style={{ color: '#22c55e' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Lists</span>
                        <span className="stat-value" style={{ color: '#22c55e' }}>
                            {siteData.lists.length}
                        </span>
                        <span className="stat-sublabel">site lists</span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card stat-card"
                    style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(168, 85, 247, 0.02))' }}
                >
                    <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.2)' }}>
                        <Database size={20} style={{ color: '#a855f7' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Storage Used</span>
                        <span className="stat-value" style={{ color: '#a855f7' }}>
                            {siteData.storage.usedGB} GB
                        </span>
                        <span className="stat-sublabel">of {siteData.storage.totalGB} GB</span>
                    </div>
                </motion.div>
            </div>

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {/* Document Libraries */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="chart-card glass-card"
                >
                    <div className="chart-header">
                        <h3><HardDrive size={16} /> Document Libraries</h3>
                    </div>
                    <div className="chart-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {siteData.drives.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {siteData.drives.map((drive, idx) => (
                                    <div key={drive.id || idx} className="drive-item">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                                                    {drive.name || 'Unnamed Drive'}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    {drive.driveType || 'Unknown type'}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {drive.usedGB} GB
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    of {drive.totalGB} GB
                                                </div>
                                            </div>
                                        </div>
                                        {drive.webUrl && (
                                            <a
                                                href={drive.webUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: 'var(--accent-blue)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}
                                            >
                                                <ExternalLink size={10} />
                                                Open
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="no-data-state" style={{ padding: '40px' }}>
                                <HardDrive size={40} style={{ opacity: 0.3 }} />
                                <p>No document libraries found</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Storage Breakdown */}
                {storageData.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="chart-card glass-card"
                    >
                        <div className="chart-header">
                            <h3><Database size={16} /> Storage Breakdown</h3>
                        </div>
                        <div className="chart-body" style={{ height: '220px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={storageData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {storageData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="chart-legend">
                            {storageData.map((item, idx) => (
                                <div key={idx} className="legend-item">
                                    <span className="legend-dot" style={{ background: item.color }}></span>
                                    <span>{item.name}: {item.value} GB</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Lists Table */}
            {siteData.lists.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="table-card glass-card"
                >
                    <div className="table-header">
                        <h3><List size={16} /> Site Lists</h3>
                    </div>
                    <div className="table-body">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>List Name</th>
                                    <th>Created</th>
                                    <th>Modified</th>
                                </tr>
                            </thead>
                            <tbody>
                                {siteData.lists.map((list, idx) => (
                                    <tr key={list.id || idx}>
                                        <td style={{ fontWeight: 500 }}>{list.displayName || list.name || 'Unnamed List'}</td>
                                        <td>{list.createdDateTime ? new Date(list.createdDateTime).toLocaleDateString() : 'N/A'}</td>
                                        <td>{list.lastModifiedDateTime ? new Date(list.lastModifiedDateTime).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            <style>{`
                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 20px;
                    border-radius: 16px;
                    border: 1px solid var(--glass-border);
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
                .chart-card { padding: 16px; border-radius: 16px; }
                .chart-header {
                    display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
                }
                .chart-header h3 { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; margin: 0; }
                .chart-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 12px; }
                .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary); }
                .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
                .drive-item {
                    padding: 12px;
                    background: var(--bg-tertiary);
                    border-radius: 8px;
                    border: 1px solid var(--glass-border);
                }
                .table-card { padding: 20px; border-radius: 16px; }
                .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .table-header h3 { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; margin: 0; }
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th, .data-table td {
                    padding: 12px; text-align: left; border-bottom: 1px solid var(--glass-border); font-size: 12px;
                }
                .data-table th { color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; font-size: 10px; }
                .no-data-state {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    color: var(--text-tertiary); gap: 12px;
                }
                .error-page {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 60vh;
                    gap: 16px;
                }
                .btn-back-nav { display: flex; align-items: center; gap: 8px; padding: 8px 16px; }
            `}</style>
        </div>
    );
};

export default SiteDetailsPage;
