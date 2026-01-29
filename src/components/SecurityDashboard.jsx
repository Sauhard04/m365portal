import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { motion } from 'framer-motion';
import { loginRequest } from '../authConfig';
import { SecurityService } from '../services/security/security.service';
import { DataPersistenceService } from '../services/dataPersistence';
import AnimatedTile from './AnimatedTile';
import Loader3D from './Loader3D';
import {
    Shield, AlertTriangle, AlertOctagon, UserX, Activity, Lock,
    TrendingUp, RefreshCw, ChevronRight, Eye, FileWarning, Target
} from 'lucide-react';
import {
    ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
    Tooltip, LineChart, Line, AreaChart, Area
} from 'recharts';

const SecurityDashboard = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        alerts: { total: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0 },
        incidents: { total: 0, active: 0, resolved: 0 },
        secureScore: { current: 0, max: 100, percentage: 0 },
        riskyUsers: { total: 0, high: 0, medium: 0, low: 0 },
        riskDetections: { total: 0, recent: [] },
        mfa: { registered: 0, total: 0, coverage: 0 }
    });

    const CACHE_KEY = 'security_dashboard';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    const fetchDashboardData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            // Check cache first
            if (!isManual) {
                const cached = DataPersistenceService.load(CACHE_KEY, CACHE_DURATION);
                if (cached) {
                    setDashboardData(cached);
                    setLoading(false);
                    return;
                }
            }

            const account = accounts[0];
            if (!account) {
                throw new Error('No account found');
            }

            const tokenResponse = await instance.acquireTokenSilent({
                ...loginRequest,
                account
            });

            const client = Client.init({
                authProvider: (done) => done(null, tokenResponse.accessToken)
            });

            const data = await SecurityService.getDashboardSummary(client);
            setDashboardData(data);
            DataPersistenceService.save(CACHE_KEY, data);
        } catch (err) {
            console.error('Failed to fetch security dashboard data:', err);
            setError('Failed to load security data. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [instance, accounts]);

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#fff', fontSize: '12px' }}>
                        {payload[0].name}: {payload[0].value}
                    </p>
                </div>
            );
        }
        return null;
    };

    // Color schemes
    const severityColors = {
        high: '#ef4444',
        medium: '#f59e0b',
        low: '#22c55e',
        unknown: '#6b7280'
    };

    const riskColors = ['#ef4444', '#f59e0b', '#22c55e'];

    // Prepare chart data
    const alertSeverityData = [
        { name: 'High', value: dashboardData.alerts.highSeverity, color: severityColors.high },
        { name: 'Medium', value: dashboardData.alerts.mediumSeverity, color: severityColors.medium },
        { name: 'Low', value: dashboardData.alerts.lowSeverity, color: severityColors.low }
    ].filter(d => d.value > 0);

    const riskyUsersData = [
        { name: 'High Risk', value: dashboardData.riskyUsers.high, color: severityColors.high },
        { name: 'Medium Risk', value: dashboardData.riskyUsers.medium, color: severityColors.medium },
        { name: 'Low Risk', value: dashboardData.riskyUsers.low, color: severityColors.low }
    ].filter(d => d.value > 0);

    const mfaData = [
        { name: 'MFA Enabled', value: dashboardData.mfa.registered, color: '#22c55e' },
        { name: 'No MFA', value: dashboardData.mfa.total - dashboardData.mfa.registered, color: '#ef4444' }
    ].filter(d => d.value > 0);

    if (loading) {
        return <Loader3D showOverlay={true} text="Loading Security Dashboard..." />;
    }

    return (
        <div className="animate-in">
            {/* Header */}
            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Shield size={28} style={{ color: 'var(--accent-error)' }} />
                        Security Dashboard
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Monitor security alerts, incidents, and identity protection</p>
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
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                    color: '#ef4444'
                }}>
                    {error}
                </div>
            )}

            {/* Top Stats Row */}
            <div className="stats-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                {/* Secure Score */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card"
                    style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.02))', cursor: 'default' }}
                >
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                        <Target size={20} style={{ color: '#22c55e' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Secure Score</span>
                        <span className="stat-value" style={{ color: '#22c55e' }}>
                            {dashboardData.secureScore.percentage}%
                        </span>
                        <span className="stat-sublabel">
                            {dashboardData.secureScore.current}/{dashboardData.secureScore.max}
                        </span>
                    </div>
                </motion.div>

                {/* Total Alerts */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card clickable"
                    style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02))', cursor: 'pointer' }}
                    onClick={() => navigate('/service/security/alerts')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                        <AlertTriangle size={20} style={{ color: '#ef4444' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Security Alerts</span>
                        <span className="stat-value" style={{ color: '#ef4444' }}>
                            {dashboardData.alerts.total}
                        </span>
                        <span className="stat-sublabel">
                            {dashboardData.alerts.highSeverity} high severity
                        </span>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                </motion.div>

                {/* Incidents */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card clickable"
                    style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))', cursor: 'pointer' }}
                    onClick={() => navigate('/service/security/incidents')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                        <AlertOctagon size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Incidents</span>
                        <span className="stat-value" style={{ color: '#f59e0b' }}>
                            {dashboardData.incidents.total}
                        </span>
                        <span className="stat-sublabel">
                            {dashboardData.incidents.active} active
                        </span>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                </motion.div>

                {/* Risky Users */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card clickable"
                    style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(168, 85, 247, 0.02))', cursor: 'pointer' }}
                    onClick={() => navigate('/service/security/risky-users')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.2)' }}>
                        <UserX size={20} style={{ color: '#a855f7' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Risky Users</span>
                        <span className="stat-value" style={{ color: '#a855f7' }}>
                            {dashboardData.riskyUsers.total}
                        </span>
                        <span className="stat-sublabel">
                            {dashboardData.riskyUsers.high} high risk
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
                {/* Alert Severity Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="chart-card glass-card"
                >
                    <div className="chart-header">
                        <h3><AlertTriangle size={16} /> Alerts by Severity</h3>
                        <button
                            className="view-all-btn"
                            onClick={() => navigate('/service/security/alerts')}
                        >
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="chart-body" style={{ height: '220px' }}>
                        {alertSeverityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={alertSeverityData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {alertSeverityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data-state">
                                <Shield size={40} style={{ opacity: 0.3 }} />
                                <p>No alerts found</p>
                            </div>
                        )}
                    </div>
                    <div className="chart-legend">
                        {alertSeverityData.map((item, idx) => (
                            <div key={idx} className="legend-item">
                                <span className="legend-dot" style={{ background: item.color }}></span>
                                <span>{item.name}: {item.value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Risky Users Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="chart-card glass-card"
                >
                    <div className="chart-header">
                        <h3><UserX size={16} /> Risky Users by Level</h3>
                        <button
                            className="view-all-btn"
                            onClick={() => navigate('/service/security/risky-users')}
                        >
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="chart-body" style={{ height: '220px' }}>
                        {riskyUsersData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={riskyUsersData} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                        {riskyUsersData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data-state">
                                <UserX size={40} style={{ opacity: 0.3 }} />
                                <p>No risky users detected</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* MFA Coverage */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="chart-card glass-card"
                >
                    <div className="chart-header">
                        <h3><Lock size={16} /> MFA Coverage</h3>
                    </div>
                    <div className="chart-body" style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '140px',
                                height: '140px',
                                borderRadius: '50%',
                                background: `conic-gradient(#22c55e ${dashboardData.mfa.coverage * 3.6}deg, rgba(239, 68, 68, 0.3) 0deg)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto'
                            }}>
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    background: 'var(--bg-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'column'
                                }}>
                                    <span style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>
                                        {dashboardData.mfa.coverage}%
                                    </span>
                                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Coverage</span>
                                </div>
                            </div>
                            <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {dashboardData.mfa.registered} of {dashboardData.mfa.total} users
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Recent Risk Detections */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="table-card glass-card"
            >
                <div className="table-header">
                    <h3><FileWarning size={16} /> Recent Risk Detections</h3>
                    <button
                        className="view-all-btn"
                        onClick={() => navigate('/service/security/risk-detections')}
                    >
                        View All <ChevronRight size={14} />
                    </button>
                </div>
                <div className="table-body">
                    {dashboardData.riskDetections.recent.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Detection Type</th>
                                    <th>Risk Level</th>
                                    <th>User</th>
                                    <th>Detected</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardData.riskDetections.recent.map((detection, idx) => (
                                    <tr key={idx}>
                                        <td>{detection.riskEventType || 'Unknown'}</td>
                                        <td>
                                            <span className={`badge badge-${detection.riskLevel}`}>
                                                {detection.riskLevel || 'unknown'}
                                            </span>
                                        </td>
                                        <td>{detection.userDisplayName || detection.userPrincipalName || 'N/A'}</td>
                                        <td>{detection.detectedDateTime ? new Date(detection.detectedDateTime).toLocaleDateString() : 'N/A'}</td>
                                        <td>
                                            <span className={`badge badge-${detection.riskState}`}>
                                                {detection.riskState || 'active'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="no-data-state" style={{ padding: '40px' }}>
                            <Activity size={40} style={{ opacity: 0.3 }} />
                            <p>No recent risk detections</p>
                        </div>
                    )}
                </div>
            </motion.div>

            <style jsx>{`
                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 20px;
                    border-radius: 16px;
                    border: 1px solid var(--glass-border);
                    transition: all 0.3s ease;
                }
                .stat-card.clickable {
                    cursor: pointer;
                }
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
                .stat-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .stat-label {
                    font-size: 12px;
                    color: var(--text-secondary);
                    margin-bottom: 4px;
                }
                .stat-value {
                    font-size: 28px;
                    font-weight: 700;
                    line-height: 1;
                }
                .stat-sublabel {
                    font-size: 11px;
                    color: var(--text-tertiary);
                    margin-top: 4px;
                }
                .chart-card {
                    padding: 16px;
                    border-radius: 16px;
                    max-height: 280px;
                }
                .chart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .chart-header h3 {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0;
                }
                .view-all-btn {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    background: none;
                    border: none;
                    color: var(--accent-blue);
                    font-size: 12px;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }
                .view-all-btn:hover {
                    opacity: 0.8;
                }
                .chart-legend {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    margin-top: 12px;
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    color: var(--text-secondary);
                }
                .legend-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
                .no-data-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: var(--text-tertiary);
                    gap: 12px;
                }
                .no-data-state p {
                    font-size: 13px;
                    margin: 0;
                }
                .table-card {
                    padding: 20px;
                    border-radius: 16px;
                }
                .table-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .table-header h3 {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    margin: 0;
                }
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .data-table th,
                .data-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid var(--glass-border);
                    font-size: 12px;
                }
                .data-table th {
                    color: var(--text-tertiary);
                    font-weight: 600;
                    text-transform: uppercase;
                    font-size: 10px;
                    letter-spacing: 0.5px;
                }
                .badge {
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                .badge-high, .badge-atRisk {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                }
                .badge-medium {
                    background: rgba(245, 158, 11, 0.15);
                    color: #f59e0b;
                }
                .badge-low, .badge-remediated, .badge-dismissed {
                    background: rgba(34, 197, 94, 0.15);
                    color: #22c55e;
                }
                .badge-confirmedCompromised {
                    background: rgba(239, 68, 68, 0.25);
                    color: #ef4444;
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div >
    );
};

export default SecurityDashboard;
