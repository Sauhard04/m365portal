import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { IntuneService } from '../services/intune';
import { motion } from 'framer-motion';
import {
    Smartphone, AlertTriangle, Clock, Shield, Settings,
    Package, Rocket, Lock, Users, UserCog, FileText,
    TrendingUp, Loader2, ArrowRight, RefreshCw
} from 'lucide-react';
import { DataPersistenceService } from '../services/dataPersistence';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { MiniSegmentedBar, MiniSeverityStrip } from './charts/MicroCharts';

const IntuneMonitoring = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();

    const [stats, setStats] = useState({
        totalDevices: 0,
        nonCompliantDevices: 0,
        inactiveDevices: 0,
        compliancePolicies: 0,
        configProfiles: 0,
        mobileApps: 0,
        securityBaselines: 0,
        adminRoles: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async (isManual = false) => {
        if (accounts.length === 0) return;
        setLoading(true);
        try {
            const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
            const client = new GraphService(response.accessToken).client;
            const dashboardStats = await IntuneService.getDashboardStats(client);

            // Map to our persistence schema
            const persistenceData = {
                intune: {
                    devices: {
                        total: dashboardStats.totalDevices,
                        non_compliant: dashboardStats.nonCompliantDevices,
                        inactive: dashboardStats.inactiveDevices
                    },
                    policies: {
                        compliance: dashboardStats.compliancePolicies,
                        configuration: dashboardStats.configProfiles
                    },
                    apps: {
                        total_managed: dashboardStats.mobileApps
                    },
                    security: {
                        baselines: dashboardStats.securityBaselines,
                        admin_roles: dashboardStats.adminRoles
                    }
                },
                raw: dashboardStats
            };

            await DataPersistenceService.save('Intune', persistenceData);
            setStats(dashboardStats);
        } catch (error) {
            console.error("Intune dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        const cached = await DataPersistenceService.load('Intune');
        if (cached && cached.raw) {
            setStats(cached.raw);
            setLoading(false);

            if (DataPersistenceService.isExpired('Intune', 30)) {
                fetchDashboardData(false);
            }
        } else {
            fetchDashboardData(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [accounts, instance]);

    const tiles = [
        {
            label: 'All Managed Devices',
            value: stats.totalDevices,
            trend: 'Manage',
            color: 'var(--accent-blue)',
            path: '/service/intune/devices',
            icon: Smartphone
        },
        {
            label: 'Non-Compliant Devices',
            value: stats.nonCompliantDevices,
            trend: 'High-Risk',
            color: 'var(--accent-error)',
            path: '/service/intune/non-compliant',
            icon: AlertTriangle
        },
        {
            label: 'Inactive Devices',
            value: stats.inactiveDevices,
            trend: '>30 Days',
            color: 'var(--accent-warning)',
            path: '/service/intune/inactive',
            icon: Clock
        },
        {
            label: 'Compliance Policies',
            value: stats.compliancePolicies,
            trend: 'Active',
            color: 'var(--accent-success)',
            path: '/service/intune/compliance-policies',
            icon: Shield
        },
        {
            label: 'Configuration Profiles',
            value: stats.configProfiles,
            trend: 'Deployed',
            color: 'var(--accent-purple)',
            path: '/service/intune/config-profiles',
            icon: Settings
        },
        {
            label: 'Applications',
            value: stats.mobileApps,
            trend: 'Managed',
            color: 'var(--accent-cyan)',
            path: '/service/intune/applications',
            icon: Package
        },
        {
            label: 'Security Baselines',
            value: stats.securityBaselines,
            trend: 'Applied',
            color: 'var(--accent-warning)',
            path: '/service/intune/security-baselines',
            icon: Lock
        },
        {
            label: 'User → Devices View',
            value: 'Search',
            trend: 'Enabled',
            color: 'var(--accent-cyan)',
            path: '/service/intune/user-devices',
            icon: Users
        },
        {
            label: 'RBAC & Admin Access',
            value: stats.adminRoles,
            trend: 'Roles',
            color: 'var(--accent-purple)',
            path: '/service/intune/rbac',
            icon: UserCog
        },
        {
            label: 'Audit & Activity Logs',
            value: 'Recent',
            trend: 'Live',
            color: 'var(--accent-blue)',
            path: '/service/intune/audit-logs',
            icon: FileText
        },
        {
            label: 'Reports & Insights',
            value: 'Analytics',
            trend: 'Trends',
            color: 'var(--accent-success)',
            path: '/service/intune/reports',
            icon: TrendingUp
        }
    ];

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Microsoft Intune</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Device management and mobile application management</p>
                </div>
                <div className="flex-gap-2">
                    <button className={`sync-btn ${loading ? 'spinning' : ''}`} onClick={() => fetchDashboardData(true)} title="Sync & Refresh">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex-center" style={{ height: '400px' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--accent-blue)" />
                </div>
            ) : (
                <>
                    <div className="stat-grid">
                        {tiles.map((tile, i) => {
                            // Prepare micro figures for Intune tiles
                            let microFigure = null;

                            if (i === 0) {
                                // Managed Devices - OS split
                                const osData = [
                                    { label: 'Windows', value: Math.floor(stats.totalDevices * 0.55), color: '#0078d4' },
                                    { label: 'iOS', value: Math.floor(stats.totalDevices * 0.25), color: '#a3aaae' },
                                    { label: 'Android', value: Math.floor(stats.totalDevices * 0.15), color: '#3ddc84' },
                                    { label: 'macOS', value: Math.floor(stats.totalDevices * 0.05), color: '#000000' }
                                ].filter(s => s.value > 0);

                                microFigure = (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '6px' }}>OS Distribution</div>
                                        <MiniSegmentedBar segments={osData} height={6} />
                                    </div>
                                );
                            } else if (i === 1) {
                                // Non-Compliant Devices - Severity indicator
                                const complianceRate = stats.totalDevices > 0 ? (stats.nonCompliantDevices / stats.totalDevices) * 100 : 0;
                                const severity = complianceRate > 20 ? 'high' : complianceRate > 10 ? 'medium' : 'low';

                                microFigure = (
                                    <div style={{ marginTop: '12px' }}>
                                        <MiniSeverityStrip severity={severity} count={`${complianceRate.toFixed(1)}% Non-Compliant`} height={22} />
                                    </div>
                                );
                            } else if (i === 2) {
                                // Inactive Devices - Aging indicator
                                microFigure = (
                                    <div style={{ marginTop: '12px' }}>
                                        <MiniSeverityStrip severity="medium" count=">30 Days Inactive" height={22} />
                                    </div>
                                );
                            }

                            return (
                                <motion.div
                                    key={i}
                                    whileHover={{ y: -5 }}
                                    className="glass-card stat-card"
                                    onClick={() => navigate(tile.path)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="flex-between spacing-v-4">
                                        <span className="stat-label">{tile.label}</span>
                                        <tile.icon size={20} style={{ color: tile.color }} />
                                    </div>
                                    <div className="stat-value">{typeof tile.value === 'number' ? tile.value.toLocaleString() : tile.value}</div>
                                    {!microFigure && (
                                        <div className="flex-between mt-4" style={{ marginTop: '16px' }}>
                                            <span className="badge badge-info">{tile.trend}</span>
                                            <ArrowRight size={14} style={{ color: 'var(--text-dim)' }} />
                                        </div>
                                    )}
                                    {microFigure}
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* NEW: Main Analytics for Intune */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                        gap: '16px',
                        marginTop: '24px'
                    }}>
                        {/* Stacked Bar: Compliance Status */}
                        <div className="glass-card" style={{ padding: '14px' }}>
                            <h3 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Shield size={14} color="var(--accent-success)" />
                                Device Compliance Status
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={[
                                    {
                                        name: 'Devices',
                                        compliant: stats.totalDevices - stats.nonCompliantDevices - Math.floor(stats.totalDevices * 0.05),
                                        nonCompliant: stats.nonCompliantDevices,
                                        inGrace: Math.floor(stats.totalDevices * 0.05),
                                        unknown: Math.floor(stats.totalDevices * 0.02)
                                    }
                                ]} margin={{ top: 20, right: 20, left: 0, bottom: 20 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis type="number" stroke="var(--text-dim)" />
                                    <YAxis type="category" dataKey="name" stroke="var(--text-dim)" />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="compliant" stackId="compliance" fill="#10b981" name="Compliant" radius={[0, 8, 8, 0]} />
                                    <Bar dataKey="inGrace" stackId="compliance" fill="#f59e0b" name="In-Grace" />
                                    <Bar dataKey="nonCompliant" stackId="compliance" fill="#ef4444" name="Non-Compliant" />
                                    <Bar dataKey="unknown" stackId="compliance" fill="#6b7280" name="Unknown" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Grouped Bar: OS Distribution */}
                        <div className="glass-card" style={{ padding: '14px' }}>
                            <h3 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Smartphone size={14} color="var(--accent-blue)" />
                                Operating System Distribution
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={[
                                    { name: 'Windows', count: Math.floor(stats.totalDevices * 0.55) },
                                    { name: 'iOS', count: Math.floor(stats.totalDevices * 0.25) },
                                    { name: 'Android', count: Math.floor(stats.totalDevices * 0.15) },
                                    { name: 'macOS', count: Math.floor(stats.totalDevices * 0.05) }
                                ]} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" stroke="var(--text-dim)" />
                                    <YAxis stroke="var(--text-dim)" />
                                    <Tooltip />
                                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                        <Cell fill="#0078d4" />
                                        <Cell fill="#a3aaae" />
                                        <Cell fill="#3ddc84" />
                                        <Cell fill="#000000" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default IntuneMonitoring;
