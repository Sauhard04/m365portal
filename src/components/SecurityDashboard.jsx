import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { motion } from 'framer-motion';
import { securityScopes } from '../authConfig';
import { SecurityService } from '../services/security/security.service';
import { DataPersistenceService } from '../services/dataPersistence';
import AnimatedTile from './AnimatedTile';
import Loader3D from './Loader3D';
import { useDataCaching } from '../hooks/useDataCaching';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import {
    Shield, AlertTriangle, AlertOctagon, UserX, Activity, Lock,
    TrendingUp, RefreshCw, ChevronRight, Eye, FileWarning, Target
} from 'lucide-react';
import {
    ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
    Tooltip, LineChart, Line, AreaChart, Area
} from 'recharts';
import styles from './DetailPage.module.css';

const SecurityDashboard = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();

    const fetchFn = async () => {
        const accessToken = await acquireToken({
            ...securityScopes
        });

        const client = Client.init({
            authProvider: (done) => done(null, accessToken)
        });

        return await SecurityService.getDashboardSummary(client);
    };

    const {
        data: dashboardData,
        loading,
        refreshing,
        error: fetchError,
        refetch
    } = useDataCaching('Security_Dashboard_v4', fetchFn, {
        maxAge: 30,
        storeSection: 'security',
        storeMetadata: { source: 'SecurityDashboard' },
        enabled: accounts.length > 0,
        dependencies: [activeTenantId]
    });

    const [interactionError, setInteractionError] = useState(false);

    useEffect(() => {
        if (fetchError && (fetchError.includes('InteractionRequiredAuthError') || fetchError.includes('interaction_required'))) {
            setInteractionError(true);
        }
    }, [fetchError]);

    const safeData = dashboardData || {
        alerts: { total: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0 },
        incidents: { total: 0, active: 0, resolved: 0 },
        secureScore: { current: 0, max: 100, percentage: 0 },
        riskyUsers: { total: 0, high: 0, medium: 0, low: 0 },
        riskDetections: { total: 0, recent: [] },
        mfa: { registered: 0, total: 0, coverage: 0 }
    };

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

    const severityColors = {
        high: '#ef4444',
        medium: '#f59e0b',
        low: '#22c55e',
        unknown: '#6b7280'
    };

    const alertSeverityData = [
        { name: 'High', value: safeData.alerts.highSeverity, color: severityColors.high },
        { name: 'Medium', value: safeData.alerts.mediumSeverity, color: severityColors.medium },
        { name: 'Low', value: safeData.alerts.lowSeverity, color: severityColors.low }
    ].filter(d => d.value > 0);

    const riskyUsersData = [
        { name: 'High Risk', value: safeData.riskyUsers.high, color: severityColors.high },
        { name: 'Medium Risk', value: safeData.riskyUsers.medium, color: severityColors.medium },
        { name: 'Low Risk', value: safeData.riskyUsers.low, color: severityColors.low }
    ].filter(d => d.value > 0);

    if (loading && !dashboardData) {
        return <Loader3D showOverlay={true} text="Loading Security Dashboard..." />;
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
                <div className={styles.pageHeader}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 className={styles.pageTitle}>
                                <Shield style={{ width: '2rem', height: '2rem', color: '#ef4444' }} />
                                Security Dashboard
                            </h1>
                            <p className={styles.pageSubtitle}>
                                Threat protection, detection, and response across your Microsoft 365 environment
                            </p>
                        </div>
                        <button
                            className={`${styles.actionButtonSecondary} ${refreshing ? 'spinning' : ''}`}
                            onClick={() => refetch(true)}
                            style={{ borderRadius: '12px', padding: '12px' }}
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                {fetchError && !interactionError && (
                    <div className={styles.alert || 'error-banner'} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
                        <AlertTriangle size={14} style={{ marginRight: '8px' }} />
                        <span>{fetchError}</span>
                    </div>
                )}

                {interactionError && (
                    <div className={styles.alert || 'error-banner'} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Shield size={14} style={{ marginRight: '8px' }} />
                            <span>🔐 Session expired or additional permissions required.</span>
                        </div>
                        <button onClick={() => refetch(true)} className={styles.actionButtonPrimary} style={{ padding: '6px 16px', fontSize: '12px' }}>Reconnect</button>
                    </div>
                )}

                <div className={styles.statsGrid}>
                    <motion.div whileHover={{ y: -5 }} className={styles.statCard} onClick={() => { }} style={{ cursor: 'default' }}>
                        <div className={styles.statLabel}>
                            <Target size={16} style={{ color: '#22c55e' }} />
                            Secure Score
                        </div>
                        <div className={styles.statValue} style={{ color: '#22c55e' }}>{safeData.secureScore.percentage}%</div>
                        <div className={styles.statSubtext} style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
                            {safeData.secureScore.current}/{safeData.secureScore.max} points
                        </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -5 }} className={styles.statCard} onClick={() => navigate('/service/security/alerts')} style={{ cursor: 'pointer' }}>
                        <div className={styles.statLabel}>
                            <AlertTriangle size={16} style={{ color: '#ef4444' }} />
                            Security Alerts
                        </div>
                        <div className={styles.statValue} style={{ color: '#ef4444' }}>{safeData.alerts.total}</div>
                        <div className={styles.statSubtext} style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
                            {safeData.alerts.highSeverity} high severity
                        </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -5 }} className={styles.statCard} onClick={() => navigate('/service/security/incidents')} style={{ cursor: 'pointer' }}>
                        <div className={styles.statLabel}>
                            <AlertOctagon size={16} style={{ color: '#f59e0b' }} />
                            Incidents
                        </div>
                        <div className={styles.statValue} style={{ color: '#f59e0b' }}>{safeData.incidents.active}</div>
                        <div className={styles.statSubtext} style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
                            {safeData.incidents.total} total
                        </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -5 }} className={styles.statCard} onClick={() => navigate('/service/security/explorer')} style={{ cursor: 'pointer' }}>
                        <div className={styles.statLabel}>
                            <UserX size={16} style={{ color: '#a855f7' }} />
                            Risky Users
                        </div>
                        <div className={styles.statValue} style={{ color: '#a855f7' }}>{safeData.riskyUsers.total}</div>
                        <div className={styles.statSubtext} style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
                            {safeData.riskyUsers.high} high risk
                        </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -5, scale: 1.02 }} className={styles.statCard} onClick={() => navigate('/service/security/defender-portal')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        <div className={styles.statLabel}>
                            <Shield size={16} style={{ color: '#6366f1' }} />
                            Defender Portal
                        </div>
                        <div className={styles.statValue} style={{ color: '#6366f1', fontSize: '1.1rem' }}>Unified View</div>
                        <div className={styles.statSubtext} style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
                            Complete security analytics →
                        </div>
                    </motion.div>
                </div>

                <div className={styles.grid}>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                                Alerts by Severity
                            </h3>
                            <button className={styles.viewMoreBtn} onClick={() => navigate('/service/security/alerts')}>
                                View All <ChevronRight size={14} />
                            </button>
                        </div>
                        <div className={styles.cardBody} style={{ height: '300px' }}>
                            {alertSeverityData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={alertSeverityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                                            {alertSeverityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className={styles.emptyState}>No alerts found</div>
                            )}
                        </div>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <UserX size={18} style={{ color: '#a855f7' }} />
                                Risky Users
                            </h3>
                            <button className={styles.viewMoreBtn} onClick={() => navigate('/service/security/explorer')}>
                                View All <ChevronRight size={14} />
                            </button>
                        </div>
                        <div className={styles.cardBody} style={{ height: '300px' }}>
                            {riskyUsersData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={riskyUsersData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={30}>
                                            {riskyUsersData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className={styles.emptyState}>No risky users detected</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.card} style={{ marginTop: '2.5rem' }}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>
                            <FileWarning size={18} style={{ color: '#f59e0b' }} />
                            Recent Risk Detections
                        </h3>
                        <button className={styles.viewMoreBtn} onClick={() => navigate('/service/security/explorer')}>
                            Open Explorer <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className={styles.tableContainer}>
                        <div className={styles.scrollableTable}>
                            <table className={styles.table}>
                                <thead className={styles.tableHead}>
                                    <tr>
                                        <th>Detection Type</th>
                                        <th>Risk Level</th>
                                        <th>User</th>
                                        <th>Detected</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {safeData.riskDetections.recent.length > 0 ? (
                                        safeData.riskDetections.recent.map((risk, idx) => (
                                            <tr key={risk.id || idx} className={styles.tableRow}>
                                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{risk.riskEventType}</td>
                                                <td>
                                                    <span className={styles.badge} style={{
                                                        background: `${severityColors[risk.riskLevel?.toLowerCase()] || '#6b7280'}20`,
                                                        color: severityColors[risk.riskLevel?.toLowerCase()] || '#6b7280',
                                                        borderColor: `${severityColors[risk.riskLevel?.toLowerCase()] || '#6b7280'}40`
                                                    }}>
                                                        {risk.riskLevel}
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{risk.userDisplayName || risk.userPrincipalName}</td>
                                                <td style={{ color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
                                                    {risk.detectedDateTime ? new Date(risk.detectedDateTime).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td>
                                                    <span className={`${styles.badge} ${styles.badgeInfo}`}>
                                                        {risk.riskState}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className={styles.emptyState}>No recent risk detections</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx="true">{`
                .spinning {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default SecurityDashboard;
