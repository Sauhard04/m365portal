import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { intuneScopes } from '../authConfig';
import { GraphService } from '../services/graphService';
import { IntuneService } from '../services/intune';
import { motion } from 'framer-motion';
import {
    Smartphone, AlertTriangle, Clock, Shield, Settings,
    Package, Rocket, Lock, Users, UserCog, FileText,
    TrendingUp, ArrowRight, RefreshCw, Search
} from 'lucide-react';
import Loader3D from './Loader3D';
import { DataPersistenceService } from '../services/dataPersistence';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { MiniSegmentedBar, MiniSeverityStrip, MiniStatusGeneric, MiniSparkline, MiniProgressBar } from './charts/MicroCharts';

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
    const [error, setError] = useState(null);

    const fetchDashboardData = async (isManual = false) => {
        if (accounts.length === 0) return;
        setLoading(true);
        setError(null);

        const startTime = Date.now();

        try {
            const response = await instance.acquireTokenSilent({
                ...intuneScopes,
                account: accounts[0]
            }).catch(async (authErr) => {
                if (authErr.name === "InteractionRequiredAuthError" || authErr.errorCode === "invalid_grant") {
                    if (isManual) {
                        return await instance.acquireTokenPopup(intuneScopes);
                    } else {
                        throw authErr;
                    }
                }
                throw authErr;
            });

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

            // Background store for AI context (makes it available to the chatbot)
            const SiteDataStore = (await import('../services/siteDataStore')).default;
            SiteDataStore.store('intuneStats', dashboardStats);
        } catch (error) {
            if (error.name === "InteractionRequiredAuthError" || error.errorCode === "invalid_grant") {
                console.warn("Interaction required for Intune Dashboard");
                setError("InteractionRequired");
            } else {
                console.error("Intune dashboard fetch error:", error);
                setError(error.message || "Failed to load Intune data");
            }
        } finally {
            if (isManual) {
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, 2000 - elapsedTime);
                setTimeout(() => {
                    setLoading(false);
                }, remainingTime);
            } else {
                setLoading(false);
            }
        }
    };

    const loadData = async () => {
        const cached = await DataPersistenceService.load('Intune');
        if (cached && cached.raw) {
            setStats(cached.raw);
            setLoading(false);

            // Refetch if cache is expired OR missing new schema fields (osDistribution, securityBaselines, adminRoles)
            const isSchemaOutdated = (cached.raw.totalDevices > 0 && !cached.raw.osDistribution) ||
                (cached.raw.securityBaselines === 0) || // Force refetch if baselines is still placeholder
                (cached.raw.adminRoles === 0); // Force refetch if adminRoles is still placeholder

            if (DataPersistenceService.isExpired('Intune', 30) || isSchemaOutdated) {
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
            value: 'Lookup',
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
            value: 'Exports',
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
                    <span>{error === 'InteractionRequired' ? '🔐 Intune session expired. Additional permissions required to load telemetry.' : error}</span>
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
                    <span>{error === 'InteractionRequired' ? '🔐 Intune session expired. Additional permissions required to load telemetry.' : error}</span>
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


            {loading && <Loader3D showOverlay={true} />}

            <div className="stat-grid">
                {tiles.map((tile, i) => {
                    // Prepare micro figures for Intune tiles
                    let microFigure = null;

                    if (i === 0) {
                        // Managed Devices - OS split
                        const osDist = stats.osDistribution || {};
                        const getOsColor = (osName) => {
                            const name = (osName || '').toLowerCase();
                            if (name.includes('window')) return '#3b82f6'; // Blue
                            if (name.includes('ios') || name.includes('ipad') || name.includes('iphone')) return '#6366f1'; // Indigo
                            if (name.includes('android')) return '#10b981'; // Green
                            if (name.includes('mac') || name.includes('osx')) return '#d946ef'; // Fuchsia
                            if (name.includes('linux')) return '#f97316'; // Orange
                            if (name.includes('unknown')) return '#9ca3af';
                            return '#64748b'; // Slate
                        };

                        const osData = Object.keys(osDist).map(os => ({
                            label: os,
                            value: osDist[os],
                            color: getOsColor(os)
                        })).filter(s => s.value > 0);

                        // If no OS data found (e.g. initial load or error), fallback to total if > 0
                        if (osData.length === 0 && stats.totalDevices > 0) {
                            // Use 'Unknown' if we have count but no OS breakdown
                            osData.push({ label: 'Unknown', value: stats.totalDevices, color: '#94a3b8' });
                        }

                        microFigure = (
                            <div style={{ marginTop: '12px' }}>
                                <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '6px' }}>OS Distribution</div>
                                <MiniSegmentedBar segments={osData} height={8} />
                                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    {osData.map((seg, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: seg.color }}></div>
                                            <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{seg.label}</span>
                                        </div>
                                    ))}
                                </div>
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

                    // Generic fallback -> Upgrade to Rich Visuals
                    if (!microFigure) {
                        // Generate consistent "random" data for sparklines based on index
                        // Removed fake sparkData generator

                        if (tile.label.includes('Policies') || tile.label.includes('Baselines')) {
                            // Status indicator for Policy/Security type tiles
                            microFigure = (
                                <div style={{ marginTop: '12px' }}>
                                    <MiniStatusGeneric status={tile.trend || 'Active'} color={tile.color} />
                                </div>
                            );
                        } else if (tile.label.includes('Applications') || tile.label.includes('Configuration') || tile.label.includes('Audit')) {
                            // Removed fake sparkline
                            microFigure = (
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '4px' }}>7-Day Activity</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600 }}>Overview</div>
                                </div>
                            );
                        } else {
                            // Default to the premium pill for others (like RBAC)
                            if (tile.label.includes('User')) {
                                microFigure = (
                                    <div style={{ marginTop: '14px', background: 'var(--glass-bg)', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--glass-border)' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Find user or device...</span>
                                        <Search size={12} color="var(--text-dim)" />
                                    </div>
                                );
                            } else if (tile.label.includes('Reports')) {
                                microFigure = (
                                    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ padding: '4px 8px', background: 'var(--accent-success)', borderRadius: '6px', fontSize: '10px', color: '#fff', fontWeight: 600, display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <span>Excel</span>
                                        </div>
                                        <div style={{ padding: '4px 8px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '6px', fontSize: '10px', color: 'var(--text-secondary)' }}>CSV</div>
                                    </div>
                                );
                            } else {
                                microFigure = (
                                    <div style={{ marginTop: '12px' }}>
                                        <MiniStatusGeneric status={tile.trend || 'Active'} color={tile.color} />
                                    </div>
                                );
                            }
                        }
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
                            <div className="stat-value" style={{
                                color: tile.color,
                                fontSize: '32px',
                                fontWeight: '700',
                                letterSpacing: '-1px'
                            }}>{typeof tile.value === 'number' ? tile.value.toLocaleString() : tile.value}</div>

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
                                compliant: stats.compliantDevices || 0,
                                nonCompliant: stats.nonCompliantDevices || 0,
                                inGrace: stats.inGracePeriodDevices || 0,
                                unknown: stats.unknownComplianceDevices || 0
                            }
                        ]} margin={{ top: 20, right: 20, left: 0, bottom: 20 }} layout="vertical" barSize={30}>
                            <defs>
                                <linearGradient id="gradComplaint" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#34d399" />
                                </linearGradient>
                                <linearGradient id="gradNonCompliant" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#ef4444" />
                                    <stop offset="100%" stopColor="#f87171" />
                                </linearGradient>
                                <linearGradient id="gradGrace" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#f59e0b" />
                                    <stop offset="100%" stopColor="#fbbf24" />
                                </linearGradient>
                                <linearGradient id="gradUnknown" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#6b7280" />
                                    <stop offset="100%" stopColor="#9ca3af" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                            <XAxis type="number" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} width={50} />
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
                            <Legend iconType="circle" />
                            <Bar dataKey="compliant" stackId="compliance" fill="url(#gradComplaint)" name="Compliant" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="inGrace" stackId="compliance" fill="url(#gradGrace)" name="In-Grace" />
                            <Bar dataKey="nonCompliant" stackId="compliance" fill="url(#gradNonCompliant)" name="Non-Compliant" />
                            <Bar dataKey="unknown" stackId="compliance" fill="url(#gradUnknown)" name="Unknown" radius={[0, 4, 4, 0]} />
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
                        <BarChart data={Object.entries(stats.osDistribution || {}).map(([name, count]) => ({ name, count }))} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
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
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                {
                                    Object.entries(stats.osDistribution || {}).map(([name, count], index) => {
                                        let color = '#64748b';
                                        const n = name.toLowerCase();
                                        if (n.includes('window')) color = '#3b82f6';
                                        else if (n.includes('ios') || n.includes('iphone')) color = '#6366f1';
                                        else if (n.includes('android')) color = '#10b981';
                                        else if (n.includes('mac')) color = '#d946ef';
                                        else if (n.includes('linux')) color = '#f97316';
                                        return <Cell key={`cell-${index}`} fill={color} />;
                                    })
                                }
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div >
    );
};

export default IntuneMonitoring;
