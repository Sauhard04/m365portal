import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { motion } from 'framer-motion';
import { governanceScopes } from '../authConfig';
import { GovernanceService } from '../services/governance/governance.service';
import { DataPersistenceService } from '../services/dataPersistence';
import AnimatedTile from './AnimatedTile';
import Loader3D from './Loader3D';
import {
    Shield, Key, UserCheck, RefreshCw, ChevronRight, Lock, Settings,
    ClipboardList, FolderKey, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import {
    ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';

const GovernanceDashboard = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dashboardData, setDashboardData] = useState({
        conditionalAccess: { total: 0, enabled: 0, disabled: 0, policies: [] },
        roles: { definitions: 0, assignments: 0, eligibleAssignments: 0, privilegedAssignments: 0 },
        accessReviews: { total: 0, active: 0, reviews: [] },
        entitlementManagement: { catalogs: 0 }
    });
    const [error, setError] = useState(null);

    const CACHE_KEY = 'governance_dashboard';
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
                ...governanceScopes,
                account
            }).catch(async (authErr) => {
                if (authErr.name === "InteractionRequiredAuthError" || authErr.errorCode === "invalid_grant") {
                    if (isManual) {
                        return await instance.acquireTokenPopup(governanceScopes);
                    } else {
                        throw authErr;
                    }
                }
                throw authErr;
            });

            const client = Client.init({
                authProvider: (done) => done(null, tokenResponse.accessToken)
            });

            const data = await GovernanceService.getDashboardSummary(client);
            setDashboardData(data);
            DataPersistenceService.save(CACHE_KEY, data);
        } catch (err) {
            if (err.name === "InteractionRequiredAuthError" || err.errorCode === "invalid_grant") {
                console.warn("Interaction required for Governance Dashboard");
                setError("InteractionRequired");
            } else {
                console.error('Failed to fetch governance dashboard data:', err);
                setError(err.message || "Failed to load governance data");
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

    const caPolicyData = [
        { name: 'Enabled', value: dashboardData.conditionalAccess.enabled, color: '#22c55e' },
        { name: 'Report-only', value: dashboardData.conditionalAccess.enabledForReportingButNotEnforced || 0, color: '#f59e0b' },
        { name: 'Disabled', value: dashboardData.conditionalAccess.disabled, color: '#6b7280' }
    ].filter(d => d.value > 0);

    const roleData = [
        { name: 'Active Assignments', value: dashboardData.roles.assignments, color: '#3b82f6' },
        { name: 'Eligible (PIM)', value: dashboardData.roles.eligibleAssignments, color: '#a855f7' },
        { name: 'Privileged Roles', value: dashboardData.roles.privilegedAssignments, color: '#ef4444' }
    ];

    if (loading) {
        return <Loader3D showOverlay={true} text="Loading Governance Dashboard..." />;
    }

    return (
        <div className="animate-in">
            {/* Header */}
            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Shield size={28} style={{ color: 'var(--accent-purple)' }} />
                        Identity Governance
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Manage conditional access, privileged roles, and access reviews</p>
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
                    <span>{error === 'InteractionRequired' ? '🔐 Governance session expired. Additional permissions required to load telemetry.' : error}</span>
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
                    style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.02))', cursor: 'pointer' }}
                    onClick={() => navigate('/service/governance/conditional-access')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                        <Lock size={20} style={{ color: '#22c55e' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">CA Policies</span>
                        <span className="stat-value" style={{ color: '#22c55e' }}>
                            {dashboardData.conditionalAccess.total}
                        </span>
                        <span className="stat-sublabel">
                            {dashboardData.conditionalAccess.enabled} enabled
                        </span>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card clickable"
                    style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(168, 85, 247, 0.02))', cursor: 'pointer' }}
                    onClick={() => navigate('/service/governance/pim-roles')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.2)' }}>
                        <Key size={20} style={{ color: '#a855f7' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">PIM Roles</span>
                        <span className="stat-value" style={{ color: '#a855f7' }}>
                            {dashboardData.roles.eligibleAssignments}
                        </span>
                        <span className="stat-sublabel">
                            eligible assignments
                        </span>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card"
                    style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02))', cursor: 'default' }}
                >
                    <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                        <AlertCircle size={20} style={{ color: '#ef4444' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Privileged Roles</span>
                        <span className="stat-value" style={{ color: '#ef4444' }}>
                            {dashboardData.roles.privilegedAssignments}
                        </span>
                        <span className="stat-sublabel">
                            standing assignments
                        </span>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card"
                    style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.02))', cursor: 'default' }}
                >
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                        <ClipboardList size={20} style={{ color: '#3b82f6' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Access Reviews</span>
                        <span className="stat-value" style={{ color: '#3b82f6' }}>
                            {dashboardData.accessReviews.total}
                        </span>
                        <span className="stat-sublabel">
                            {dashboardData.accessReviews.active} active
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
                {/* CA Policies by State */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="chart-card glass-card"
                >
                    <div className="chart-header">
                        <h3><Lock size={16} /> Conditional Access Policies</h3>
                        <button
                            className="view-all-btn"
                            onClick={() => navigate('/service/governance/conditional-access')}
                        >
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="chart-body" style={{ height: '220px' }}>
                        {caPolicyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={caPolicyData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {caPolicyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data-state">
                                <Lock size={40} style={{ opacity: 0.3 }} />
                                <p>No CA policies found</p>
                            </div>
                        )}
                    </div>
                    <div className="chart-legend">
                        {caPolicyData.map((item, idx) => (
                            <div key={idx} className="legend-item">
                                <span className="legend-dot" style={{ background: item.color }}></span>
                                <span>{item.name}: {item.value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Role Assignments */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="chart-card glass-card"
                >
                    <div className="chart-header">
                        <h3><Key size={16} /> Role Assignments</h3>
                        <button
                            className="view-all-btn"
                            onClick={() => navigate('/service/governance/pim-roles')}
                        >
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="chart-body" style={{ height: '220px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={roleData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                    {roleData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Recent CA Policies */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="table-card glass-card"
            >
                <div className="table-header">
                    <h3><Settings size={16} /> Recent Conditional Access Policies</h3>
                </div>
                <div className="table-body">
                    {dashboardData.conditionalAccess.policies?.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Policy Name</th>
                                    <th>State</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardData.conditionalAccess.policies.slice(0, 5).map((policy, idx) => (
                                    <tr key={policy.id || idx}>
                                        <td>{policy.displayName || 'Unnamed Policy'}</td>
                                        <td>
                                            <span className={`state-badge ${policy.state}`}>
                                                {policy.state === 'enabled' && <CheckCircle2 size={10} />}
                                                {policy.state === 'disabled' && <XCircle size={10} />}
                                                {policy.state}
                                            </span>
                                        </td>
                                        <td>{policy.createdDateTime ? new Date(policy.createdDateTime).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="no-data-state" style={{ padding: '40px' }}>
                            <Lock size={40} style={{ opacity: 0.3 }} />
                            <p>No policies found</p>
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
                }
                .state-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                .state-badge.enabled {
                    background: rgba(34, 197, 94, 0.15);
                    color: #22c55e;
                }
                .state-badge.disabled {
                    background: rgba(107, 114, 128, 0.15);
                    color: #6b7280;
                }
                .state-badge.enabledForReportingButNotEnforced {
                    background: rgba(245, 158, 11, 0.15);
                    color: #f59e0b;
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 60vh;
                    gap: 16px;
                }
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--glass-border);
                    border-top-color: var(--accent-blue);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div >
    );
};

export default GovernanceDashboard;
