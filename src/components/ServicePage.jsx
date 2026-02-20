import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { DataPersistenceService } from '../services/dataPersistence';
import { motion } from 'framer-motion';
import { Settings, RefreshCw, Filter, Download, AlertCircle, CheckCircle2, XCircle, Shield, Activity, AlertTriangle, Users, Mail, Globe, CreditCard, LayoutGrid, Trash2, ArrowRight, Lock, Terminal } from 'lucide-react';
import Loader3D from './Loader3D';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { MiniSparkline, MiniProgressBar, MiniSegmentedBar, MiniStatusGeneric } from './charts/MicroCharts';
import { useDataCaching } from '../hooks/useDataCaching';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';

const ServicePage = ({ serviceId: propServiceId }) => {
    const params = useParams();
    const serviceId = propServiceId || params.serviceId;
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken } = useToken();
    const activeTenantId = useActiveTenant();
    const isAdmin = serviceId === 'admin';

    const fetchFn = async () => {
        if (!isAdmin) return null;
        const accessToken = await getAccessToken({
            ...loginRequest
        });
        const graphService = new GraphService(accessToken);

        const [exchangeResult, licensingResult, domainsCount, groups, deletedUsersCount, score, health, signIns] = await Promise.all([
            graphService.getExchangeMailboxReport().catch(() => ({ reports: [] })),
            graphService.getLicensingData().catch(() => ({ skus: [], users: [] })),
            graphService.getDomains().then(d => d.length),
            graphService.getGroups(),
            graphService.getDeletedUsers().then(u => u?.length || 0),
            graphService.getSecureScore(),
            graphService.getServiceHealth(),
            graphService.getRecentSignIns(24)
        ]);

        console.log(`[ServicePage] API Response - Sign-ins:`, signIns?.length || 0);
        if (signIns && signIns.length > 0) {
            console.log(`[ServicePage] Sample Sign-in:`, signIns[0]);
        }

        const persistenceData = {
            mailboxes: { total: exchangeResult.reports?.length || 0, status: "Live" },
            licenses: { used: licensingResult.skus?.reduce((acc, curr) => acc + (curr.consumedUnits || 0), 0) || 0, status: "Active" },
            groups: { count: groups.length, action: "Manage" },
            domains: { count: domainsCount, action: "Manage" },
            users: { deleted_count: deletedUsersCount, action: "Restore" },
            security: {
                secure_score_percentage: score ? `${Math.round((score.currentScore / score.maxScore) * 100)}%` : "0%",
                secure_score_points: score?.currentScore || 0,
                total_signins_24h: signIns?.length || 0,
                failed_signins_24h: signIns?.filter(s => s.status?.errorCode !== 0).length || 0,
                action: "Review"
            },
            service_health: { issues_count: health?.filter(s => s.status !== 'ServiceOperational').length || 0, status: "View Status" }
        };

        DataPersistenceService.save('AdminCenter_Legacy', persistenceData);

        const result = {
            exchangeData: exchangeResult.reports || [],
            licensingSummary: licensingResult.skus || [],
            domainsCount,
            groupsCount: groups.length,
            groups: groups,
            deletedUsersCount,
            secureScore: score,
            serviceHealth: health,
            signIns: signIns
        };
        return result;
    };

    const {
        data: dashboardData,
        loading,
        refreshing,
        error: fetchError,
        refetch
    } = useDataCaching('AdminCenter_v5', fetchFn, {
        maxAge: 30,
        enabled: accounts.length > 0 && isAdmin,
        storeSection: 'admincenter',
        storeMetadata: { source: 'ServicePage' },
        dependencies: [activeTenantId]
    });

    const exchangeData = dashboardData?.exchangeData || [];
    const licensingSummary = dashboardData?.licensingSummary || [];
    const domainsCount = dashboardData?.domainsCount || 0;
    const groupsCount = dashboardData?.groupsCount || 0;
    const groups = dashboardData?.groups || [];
    const deletedUsersCount = dashboardData?.deletedUsersCount || 0;
    const secureScore = dashboardData?.secureScore || null;
    const serviceHealth = dashboardData?.serviceHealth || [];
    const signIns = dashboardData?.signIns || [];

    const [interactionError, setInteractionError] = useState(false);

    useEffect(() => {
        if (fetchError && (fetchError.includes('InteractionRequiredAuthError') || fetchError.includes('interaction_required'))) {
            setInteractionError(true);
        }
    }, [fetchError]);

    const serviceNames = {
        admin: 'Admin Center'
    };



    const stats = [
        { label: 'Total Mailboxes', value: exchangeData.length, icon: Mail, color: 'var(--accent-blue)', path: '/service/admin/report', trend: 'Live' },
        { label: 'Licenses Used', value: licensingSummary.reduce((acc, curr) => acc + (curr.consumedUnits || 0), 0), icon: CreditCard, color: 'var(--accent-cyan)', path: '/service/admin/licenses', trend: 'Active' },
        { label: 'Groups', value: groupsCount, icon: Users, color: 'var(--accent-indigo)', path: '/service/admin/groups', trend: 'Manage' },
        { label: 'Domains', value: domainsCount, icon: Globe, color: 'var(--accent-success)', path: '/service/admin/domains', trend: 'Manage' },
        { label: 'Deleted Users', value: deletedUsersCount, icon: Trash2, color: 'var(--accent-error)', path: '/service/admin/deleted-users', trend: 'Restore' },
        { label: 'Secure Score', value: secureScore ? `${Math.round((secureScore.currentScore / secureScore.maxScore) * 100)}%` : '--', icon: Shield, color: 'var(--accent-blue)', path: '/service/admin/secure-score', trend: `${secureScore?.currentScore || 0} Pts` },
        { label: 'Sign-in Events (24h)', value: signIns.length, icon: Activity, color: 'var(--accent-success)', path: '/service/entra/sign-in-logs', trend: 'Live' }
    ];

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-4">
                <div>
                    <a
                        href="https://admin.microsoft.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                    >
                        <h1 className="title-gradient" style={{ fontSize: '18px', cursor: 'pointer' }}>
                            {serviceNames[serviceId]} Overview
                        </h1>
                    </a>
                    <p style={{ color: 'var(--text-dim)', fontSize: '10px' }}>Real-time operational telemetry and management</p>
                </div>
                <div className="flex-gap-2">
                    <button className={`sync-btn ${refreshing ? 'spinning' : ''}`} onClick={() => refetch(true)} title="Sync & Refresh">
                        <RefreshCw size={14} />
                    </button>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }}>
                        <Download size={14} />
                        Export Data
                    </button>
                </div>
            </header>

            {fetchError && !interactionError && (
                <div className="error-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
                    <AlertCircle size={14} style={{ marginRight: '8px' }} />
                    <span>{fetchError}</span>
                </div>
            )}

            {interactionError && (
                <div className="error-banner" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: 'var(--accent-blue)' }}>
                    <Lock size={14} style={{ marginRight: '8px' }} />
                    <span>🔐 Session expired or additional permissions required.</span>
                    <button onClick={() => refetch(true)} className="reconnect-btn">Reconnect</button>
                </div>
            )}

            <div className="stat-grid">
                {stats.map((stat, i) => {
                    // Prepare micro figures for Admin Center cards
                    let microFigure = null;

                    if (i === 0) {
                        // Mailboxes - Active vs Inactive
                        const activeMailboxes = exchangeData.filter(mb => {
                            const lastActivity = new Date(mb.lastActivityDate);
                            const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
                            return daysSinceActivity <= 30;
                        }).length;
                        const inactiveMailboxes = exchangeData.length - activeMailboxes;

                        if (exchangeData.length > 0) {
                            const segments = [
                                { label: 'Active', value: activeMailboxes, color: '#10b981' }, // Green
                                { label: 'Inactive', value: inactiveMailboxes, color: '#f59e0b' } // Amber
                            ].filter(s => s.value > 0);

                            microFigure = (
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '6px' }}>User Status</div>
                                    <MiniSegmentedBar segments={segments} height={8} />
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                        {segments.map((seg, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: seg.color }}></div>
                                                <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{seg.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                    } else if (i === 1) {
                        // Licenses - Utilization Progress for top 3
                        const topLicenses = licensingSummary.slice(0, 3);
                        if (topLicenses.length > 0) {
                            microFigure = (
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '6px' }}>Top License Types</div>
                                    {(() => {
                                        const colors = ['#3b82f6', '#10b981', '#f59e0b']; // Blue, Green, Amber
                                        const segments = topLicenses.map((lic, idx) => ({
                                            label: lic.name || lic.skuPartNumber,
                                            value: lic.consumedUnits || 0,
                                            color: colors[idx % colors.length]
                                        }));

                                        return <MiniSegmentedBar segments={segments} height={10} />;
                                    })()}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                        {topLicenses.map((lic, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ['#3b82f6', '#10b981', '#f59e0b'][idx] }}></div>
                                                <span style={{ fontSize: '9px', color: 'var(--text-dim)', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {lic.name || lic.skuPartNumber}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                    } else if (i === 2) {
                        // Groups - Type breakdown
                        const m365Groups = groups.filter(g => g.groupTypes?.includes('Unified')).length;
                        const securityGroups = groups.filter(g => g.securityEnabled && !g.groupTypes?.includes('Unified')).length;
                        const distributionGroups = groups.filter(g => g.mailEnabled && !g.securityEnabled && !g.groupTypes?.includes('Unified')).length;
                        const otherGroups = groups.length - (m365Groups + securityGroups + distributionGroups);

                        if (groups.length > 0) {
                            const segments = [
                                { label: 'M365', value: m365Groups, color: 'var(--accent-pink)' },
                                { label: 'Security', value: securityGroups, color: 'var(--accent-purple)' },
                                { label: 'Dist', value: distributionGroups, color: 'var(--accent-success)' }
                            ].filter(s => s.value > 0);

                            if (otherGroups > 0) {
                                segments.push({ label: 'Other', value: otherGroups, color: 'var(--text-dim)' });
                            }

                            microFigure = (
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '6px' }}>Group Breakdown</div>
                                    <MiniSegmentedBar segments={segments} height={8} />
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                        {segments.map((seg, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: seg.color }}></div>
                                                <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                                                    {seg.label}: {seg.value.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                    } else if (i === 6) {
                        // Sign-in Events - Success vs Failure breakdown
                        const failedCount = signIns.filter(s => s.status?.errorCode !== 0).length;
                        const totalCount = signIns.length;
                        const successCount = totalCount - failedCount;

                        if (totalCount > 0) {
                            const segments = [
                                { label: 'Success', value: successCount, color: '#10b981' }, // Green
                                { label: 'Failure', value: failedCount, color: '#ef4444' }   // Red
                            ].filter(s => s.value > 0);

                            microFigure = (
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '6px' }}>Auth Trends</div>
                                    <MiniSegmentedBar segments={segments} height={8} />
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                        {segments.map((seg, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: seg.color }}></div>
                                                <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                                                    {seg.label}: {seg.value.toLocaleString()} ({Math.round((seg.value / totalCount) * 100)}%)
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                    }

                    // Generic Fallback -> Upgrade to Rich Visuals if not already set
                    if (!microFigure) {
                        if (stat.label.includes('Health') || stat.label.includes('Status')) {
                            microFigure = (
                                <div style={{ marginTop: '12px' }}>
                                    <MiniStatusGeneric status={stat.trend || 'Healthy'} color={stat.color} />
                                </div>
                            );
                        } else if (stat.label.includes('Requests') || stat.label.includes('Groups')) {
                            // Removed fake sparkData 
                            microFigure = null;
                        } else {
                            microFigure = (
                                <div style={{ marginTop: '12px' }}>
                                    <MiniStatusGeneric status={stat.trend || 'Active'} color={stat.color} />
                                </div>
                            );
                        }
                    }

                    return (
                        <motion.div
                            key={i}
                            whileHover={{ y: -5 }}
                            className="glass-card stat-card"
                            onClick={() => stat.path && navigate(stat.path)}
                            style={{ cursor: stat.path ? 'pointer' : 'default' }}
                        >
                            <div className="flex-between spacing-v-2">
                                <span className="stat-label">{stat.label}</span>
                                <stat.icon size={14} style={{ color: stat.color }} />
                            </div>
                            <div className="stat-value">{stat.value}</div>

                            {microFigure}
                        </motion.div>
                    );
                })}
            </div>

            {/* Main Analytics for Admin Center */}
            {!loading && exchangeData.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmin(400px, 1fr))',
                    gap: '16px',
                    marginTop: '24px'
                }}>
                    {/* Grouped Bar: Users/Groups/Devices */}
                    <div className="glass-card" style={{ padding: '14px' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '16px' }}>
                            Entity Overview
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={[
                                { name: 'Users', count: exchangeData.length },
                                { name: 'Groups', count: groupsCount },
                                { name: 'Domains', count: domainsCount }
                            ]} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="gradEntity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#2563eb" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="var(--text-dim)" />
                                <YAxis stroke="var(--text-dim)" />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--tooltip-bg)',
                                        border: '1px solid var(--tooltip-border)',
                                        borderRadius: '12px',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                        color: 'var(--tooltip-text)'
                                    }}
                                    itemStyle={{ color: 'var(--tooltip-text)', fontSize: '12px', fontWeight: 600 }}
                                />
                                <Bar dataKey="count" fill="url(#gradEntity)" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* User Growth Trend Removed (was using fake data) */}
                </div>
            )}

            {exchangeData.length > 0 && (
                <div className="glass-card" style={{ marginTop: '16px', padding: '14px' }}>
                    <div className="flex-between spacing-v-4">
                        <h3 className="flex-center flex-gap-2" style={{ fontSize: '12px' }}>
                            <Mail size={14} color="var(--accent-blue)" />
                            Recent Mailboxes
                        </h3>
                        <motion.button
                            whileHover={{ scale: 1.05, x: -4 }}
                            whileTap={{ scale: 0.95 }}
                            className="btn btn-secondary"
                            style={{
                                padding: '6px 14px',
                                fontSize: '11px',
                                border: '1px solid var(--glass-border)',
                                background: 'hsla(0,0%,100%,0.05)',
                                color: 'var(--text-secondary)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 600
                            }}
                            onClick={() => navigate('/service/admin/report')}
                        >
                            View All Reports
                            <ArrowRight size={12} />
                        </motion.button>
                    </div>
                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Archive</th>
                                    <th>Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exchangeData.slice(0, 8).map((mb, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mb.displayName}</td>
                                        <td style={{ fontSize: '12px' }}>{mb.emailAddress}</td>
                                        <td>
                                            <span className={`badge ${mb.archivePolicy ? 'badge-success' : 'badge-info'}`}>
                                                {mb.archivePolicy ? 'Active' : 'Not Set'}
                                            </span>
                                        </td>
                                        <td>{mb.mailboxSize || '0 KB'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {loading && (
                <Loader3D showOverlay={true} />
            )}
        </div>
    );
};

export default ServicePage;
