import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { AggregationService } from '../services/aggregation.service';
import { motion } from 'framer-motion';
import {
    PieChart, Pie, BarChart, Bar, LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Treemap, ComposedChart,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer, Label, LabelList
} from 'recharts';
import {
    Users, Smartphone, CreditCard, Shield, Activity,
    TrendingUp, AlertTriangle, Mail, Loader2, Download,
    ShieldCheck, Lock, LayoutGrid, RefreshCw
} from 'lucide-react';
import { DataPersistenceService } from '../services/dataPersistence';
import { MiniSparkline, MiniProgressBar, MiniSegmentedBar } from './charts/MicroCharts';
import { CustomTooltip, ChartHeader } from './charts/CustomTooltip';

const OverviewDashboard = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const fetchOverviewData = async (isManual = false) => {
        if (accounts.length === 0) return;
        setLoading(true);
        try {
            const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
            const client = new GraphService(response.accessToken).client;
            const overviewData = await AggregationService.getOverviewData(client);

            // Map to our persistence schema
            const persistenceData = {
                overview: {
                    statistics: {
                        total_users: overviewData.quickStats.totalUsers,
                        total_devices: overviewData.quickStats.totalDevices,
                        total_licenses: overviewData.quickStats.totalLicenses,
                        secure_score: overviewData.quickStats.secureScore
                    },
                    health_and_security: {
                        // Service Health removed
                        failed_signins: overviewData.charts.signIns[0]?.failed || 0,
                        compliance_rate: overviewData.charts.securityRadar.find(d => d.subject === 'Compliance')?.value || 0
                    }
                },
                raw: overviewData
            };

            // Save to Cache & JSON
            await DataPersistenceService.save('Overview', persistenceData);
            setData(overviewData);
        } catch (err) {
            console.error('Overview fetch error:', err);
            setError('Failed to load overview data');
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        const cached = await DataPersistenceService.load('Overview');
        if (cached && cached.raw) {
            setData(cached.raw);
            setLoading(false);

            // Background revalidate if stale (30 mins)
            if (DataPersistenceService.isExpired('Overview', 30)) {
                fetchOverviewData(false);
            }
        } else {
            fetchOverviewData(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [accounts, instance]);

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin" size={48} color="var(--accent-purple)" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                <AlertTriangle size={48} color="var(--accent-error)" style={{ marginBottom: '16px' }} />
                <h3 style={{ marginBottom: '8px' }}>Unable to Load Dashboard</h3>
                <p style={{ color: 'var(--text-dim)' }}>{error}</p>
            </div>
        );
    }

    const quickStats = [
        {
            label: 'Total Users',
            value: data?.quickStats.totalUsers || 0,
            icon: Users,
            color: 'var(--accent-blue)',
            gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            path: '/service/entra/users'
        },
        {
            label: 'Managed Devices',
            value: data?.quickStats.totalDevices || 0,
            icon: Smartphone,
            color: 'var(--accent-purple)',
            gradient: 'linear-gradient(135deg, #a855f7, #9333ea)',
            path: '/service/intune/devices'
        },
        {
            label: 'Active Licenses',
            value: data?.quickStats.totalLicenses || 0,
            icon: CreditCard,
            color: 'var(--accent-cyan)',
            gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            path: '/service/admin/licenses'
        },
        {
            label: 'Secure Score',
            value: data?.quickStats.secureScore ? `${Math.round((data.quickStats.secureScore / data.quickStats.maxSecureScore) * 100)}%` : '0%',
            icon: Shield,
            color: 'var(--accent-success)',
            gradient: 'linear-gradient(135deg, #10b981, #059669)',
            path: '/service/admin/secure-score'
        }
    ];


    // Enhanced Premium Tooltip with Glassmorphism
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="recharts-custom-tooltip"
                >
                    {label && (
                        <p style={{
                            fontWeight: 700,
                            marginBottom: '12px',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            letterSpacing: '0.3px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            paddingBottom: '8px'
                        }}>
                            {label}
                        </p>
                    )}
                    {payload.map((entry, index) => (
                        <div key={index} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginTop: index === 0 ? '0' : '8px'
                        }}>
                            <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: entry.color || entry.fill,
                                boxShadow: `0 0 10px ${entry.color || entry.fill}50`,
                                flexShrink: 0
                            }}></div>
                            <span style={{
                                fontSize: '13px',
                                color: 'var(--text-secondary)',
                                flex: 1,
                                fontWeight: 500
                            }}>
                                {entry.name}:
                            </span>
                            <span style={{
                                fontSize: '15px',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                background: `linear-gradient(135deg, ${entry.color || entry.fill}, ${entry.color || entry.fill}cc)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                            </span>
                        </div>
                    ))}
                </motion.div>
            );
        }
        return null;
    };

    // Custom label renderer with percentages
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

        if (percent < 0.05) return null;

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: '14px', fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };


    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Overview Dashboard</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Unified monitoring and operational intelligence</p>
                </div>
                <div className="flex-gap-2">
                    <button className={`sync-btn ${loading ? 'spinning' : ''}`} onClick={() => fetchOverviewData(true)} title="Sync & Refresh">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </header>
            {/* Quick Stats Section with Micro Figures */}
            <div className="stat-grid" style={{ marginBottom: '32px' }}>
                {quickStats.map((stat, idx) => {
                    // Prepare micro figure data per card
                    let microFigure = null;

                    if (idx === 0) {
                        // Total Users - Mini Sparkline (user growth trend)
                        const userTrendData = data?.charts.userGrowthTrend?.map(d => ({ value: d.active })) ||
                            [{ value: 400 }, { value: 420 }, { value: 435 }, { value: 445 }, { value: 450 }];
                        microFigure = (
                            <div style={{ marginTop: '12px' }}>
                                <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '4px' }}>Active Users Trend</div>
                                <MiniSparkline data={userTrendData} color={stat.color} height={30} />
                            </div>
                        );
                    } else if (idx === 1) {
                        // Managed Devices - Compliance Bar
                        const compliantCount = data?.charts.deviceCompliance?.find(d => d.name === 'Compliant')?.value || 0;
                        const totalDevices = data?.quickStats.totalDevices || 0;
                        const complianceSegments = [
                            { label: 'Compliant', value: compliantCount, color: 'var(--accent-success)' },
                            { label: 'Issues', value: totalDevices - compliantCount, color: 'var(--accent-error)' }
                        ].filter(s => s.value > 0);
                        microFigure = (
                            <div style={{ marginTop: '12px' }}>
                                <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '6px' }}>
                                    Compliance: {compliantCount}/{totalDevices}
                                </div>
                                <MiniSegmentedBar segments={complianceSegments} height={6} />
                            </div>
                        );
                    } else if (idx === 2) {
                        // Active Licenses - Utilization Progress
                        const topLicenses = (data?.charts.licenseUsage || []).slice(0, 3);
                        microFigure = (
                            <div style={{ marginTop: '12px' }}>
                                <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '6px' }}>Top License Usage</div>
                                {topLicenses.map((lic, i) => (
                                    <div key={i} style={{ marginBottom: i < topLicenses.length - 1 ? '6px' : 0 }}>
                                        <MiniProgressBar
                                            value={lic.assigned}
                                            max={lic.assigned + lic.available}
                                            height={4}
                                        />
                                    </div>
                                ))}
                            </div>
                        );
                    }
                    // idx === 3 is Secure Score - NO CHANGES per requirements

                    return (
                        <motion.div
                            key={idx}
                            whileHover={{ y: -4 }}
                            className="glass-card stat-card"
                            onClick={() => stat.path && navigate(stat.path)}
                            style={{ cursor: stat.path ? 'pointer' : 'default', borderLeft: `4px solid ${stat.color}` }}
                        >
                            <div className="flex-between spacing-v-2">
                                <span className="stat-label">{stat.label}</span>
                                <stat.icon size={14} style={{ color: stat.color }} />
                            </div>
                            <div className="stat-value" style={{
                                background: stat.gradient,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontSize: '22px'
                            }}>
                                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                            </div>
                            {microFigure}
                        </motion.div>
                    );
                })}
            </div>

            {/* Charts Grid with Responsive Alignment */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: '16px'
            }}>

                {/* Service Health Removed as per user request */}

                {/* Enhanced User Distribution - Donut with Animation */}
                {data?.charts.userDistribution?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="glass-card"
                        style={{ padding: '14px' }}
                    >
                        <div className="flex-center justify-start flex-gap-4 spacing-v-8">
                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-indigo))', borderRadius: '6px' }}>
                                <Users size={14} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '12px', fontWeight: 700 }}>User Distribution</h3>
                                <p style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Active vs Inactive</p>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <defs>
                                    <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#34d399" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="gradInactive" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#fbbf24" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <Pie
                                    data={data.charts.userDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomLabel}
                                    outerRadius={85}
                                    innerRadius={60}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationBegin={100}
                                    animationDuration={1200}
                                    stroke="none"
                                >
                                    {data.charts.userDistribution.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.name === 'Active' ? 'url(#gradActive)' : 'url(#gradInactive)'}
                                            style={{ filter: 'drop-shadow(0px 0px 8px rgba(0,0,0,0.3))' }}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    iconType="circle"
                                    verticalAlign="bottom"
                                    wrapperStyle={{ paddingTop: '24px', fontSize: '13px', fontWeight: 600 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </motion.div>
                )}

                {/* Enhanced Device Compliance - Rounded Bars with Gradients */}
                {data?.charts.deviceCompliance?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="glass-card"
                        style={{ padding: '14px' }}
                    >
                        <div className="flex-center justify-start flex-gap-4 spacing-v-8">
                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))', borderRadius: '6px' }}>
                                <Shield size={14} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '12px', fontWeight: 700 }}>Device Compliance</h3>
                                <p style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Security Posture</p>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={data.charts.deviceCompliance} margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="compGradSuccess" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#00c853" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#b2ff59" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="compGradError" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#d50000" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#ff5252" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="compGradWarning" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ffab00" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#ffd740" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-dim)" axisLine={false} tickLine={false} style={{ fontSize: '12px', fontWeight: 500 }} dy={10} />
                                <YAxis stroke="var(--text-dim)" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Bar dataKey="value" barSize={40} radius={[10, 10, 0, 0]} animationDuration={1200}>
                                    <LabelList dataKey="value" position="top" style={{ fill: 'var(--text-primary)', fontSize: '14px', fontWeight: 700 }} dy={-10} />
                                    {data.charts.deviceCompliance.map((entry, index) => {
                                        const fillGrad = entry.name === 'Compliant' ? 'url(#compGradSuccess)' :
                                            entry.name === 'Non-Compliant' ? 'url(#compGradError)' : 'url(#compGradWarning)';
                                        return <Cell key={`cell-${index}`} fill={fillGrad} style={{ filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.3))' }} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </motion.div>
                )}

                {/* Custom License Utilization - List with Progress Bars */}
                {data?.charts.licenseUsage?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="glass-card"
                        style={{ padding: '14px' }}
                    >
                        <div className="flex-center justify-start flex-gap-4 spacing-v-8" style={{ marginBottom: '16px' }}>
                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', borderRadius: '6px' }}>
                                <CreditCard size={14} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '12px', fontWeight: 700 }}>License Utilization</h3>
                                <p style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Core Subscriptions</p>
                            </div>
                        </div>

                        <div className="flex-column" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {data.charts.licenseUsage.map((license, idx) => {
                                const total = license.assigned + license.available;
                                const percentage = total > 0 ? (license.assigned / total) * 100 : 0;

                                return (
                                    <div key={idx}>
                                        <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                                                {license.name.toUpperCase()}
                                            </span>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {license.assigned.toLocaleString()} / {total.toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{
                                            width: '100%',
                                            height: '6px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '3px',
                                            overflow: 'hidden'
                                        }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.max(1, percentage)}%` }}
                                                transition={{ duration: 1.5, delay: 0.2 + (idx * 0.1), ease: "easeOut" }}
                                                style={{
                                                    height: '100%',
                                                    background: percentage > 90 ? 'var(--accent-error)' :
                                                        percentage > 75 ? 'var(--accent-warning)' :
                                                            '#10b981', // Specifically using the green from the image
                                                    boxShadow: `0 0 10px ${percentage > 90 ? 'var(--accent-error)' : '#10b981'}40`
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Enhanced Email Activity - Area Chart */}
                {data?.charts.emailTrend?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="glass-card"
                        style={{ padding: '14px' }}
                    >
                        <div className="flex-center justify-start flex-gap-4 spacing-v-8">
                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))', borderRadius: '6px' }}>
                                <Mail size={14} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '12px', fontWeight: 700 }}>Email Activity</h3>
                                <p style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Last 7 Days</p>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={data.charts.emailTrend} margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="emailGradSent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8e2de2" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#4a00e0" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="emailGradReceived" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#00d2ff" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#3a7bd5" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-dim)" axisLine={false} tickLine={false} style={{ fontSize: '12px', fontWeight: 500 }} dy={10} />
                                <YAxis stroke="var(--text-dim)" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 600 }} />
                                <Bar dataKey="sent" fill="url(#emailGradSent)" barSize={30} radius={[8, 8, 0, 0]} animationDuration={1200}>
                                    <LabelList dataKey="sent" position="top" style={{ fill: 'var(--text-primary)', fontSize: '11px', fontWeight: 700 }} dy={-10} formatter={(value) => value.toLocaleString()} />
                                </Bar>
                                <Bar dataKey="received" fill="url(#emailGradReceived)" barSize={30} radius={[8, 8, 0, 0]} animationDuration={1400}>
                                    <LabelList dataKey="received" position="top" style={{ fill: 'var(--text-primary)', fontSize: '11px', fontWeight: 700 }} dy={-10} formatter={(value) => value.toLocaleString()} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </motion.div>
                )}

                {/* Enhanced Device by Platform - Gradient Bars */}
                {data?.charts.deviceByPlatform?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="glass-card"
                        style={{ padding: '14px' }}
                    >
                        <div className="flex-center justify-start flex-gap-4 spacing-v-8">
                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, var(--accent-success), var(--accent-cyan))', borderRadius: '6px' }}>
                                <Smartphone size={14} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '12px', fontWeight: 700 }}>Devices by Platform</h3>
                                <p style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Operating Systems</p>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={data.charts.deviceByPlatform} margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="platformGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#00f2fe" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#4facfe" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-dim)" axisLine={false} tickLine={false} style={{ fontSize: '12px', fontWeight: 500 }} dy={10} />
                                <YAxis stroke="var(--text-dim)" axisLine={false} tickLine={false} style={{ fontSize: '12px' }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Bar dataKey="value" fill="url(#platformGrad)" barSize={40} radius={[10, 10, 0, 0]} animationDuration={1200}>
                                    <LabelList dataKey="value" position="top" style={{ fill: 'var(--text-primary)', fontSize: '14px', fontWeight: 700 }} dy={-10} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </motion.div>
                )}
            </div>

            {/* NEW SECTION: Advanced Multi-Dimensional Charts */}
            <div style={{ marginTop: '24px' }}>
                <h2 style={{ fontSize: '16px', marginBottom: '4px', fontWeight: 700, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Advanced Analytics
                </h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '10px', marginBottom: '16px' }}>
                    Multi-dimensional views and complex correlations
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                    gap: '16px'
                }}>

                    {/* Security Posture Radar Chart */}
                    {data?.charts.securityRadar && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                            className="glass-card"
                            style={{ padding: '14px' }}
                        >
                            <div className="flex-center justify-start flex-gap-4 spacing-v-8">
                                <div style={{ padding: '6px', background: 'linear-gradient(135deg, var(--accent-error), var(--accent-warning))', borderRadius: '6px' }}>
                                    <Shield size={14} color="white" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '12px', fontWeight: 700 }}>Security Posture</h3>
                                    <p style={{ fontSize: '9px', color: 'var(--text-dim)' }}>5-Dimensional View</p>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={260}>
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.charts.securityRadar}>
                                    <defs>
                                        <linearGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#00d2ff" stopOpacity={0.85} />
                                            <stop offset="100%" stopColor="#3a7bd5" stopOpacity={0.4} />
                                        </linearGradient>
                                    </defs>
                                    <PolarGrid stroke="rgba(255,255,255,0.15)" />
                                    <PolarAngleAxis dataKey="subject" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="var(--text-dim)" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} />
                                    <Radar
                                        name="Security Score"
                                        dataKey="value"
                                        stroke="#00d2ff"
                                        fill="url(#radarGrad)"
                                        fillOpacity={0.7}
                                        strokeWidth={3}
                                        dot={{ fill: '#00d2ff', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                        animationDuration={1500}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '13px', fontWeight: 600, paddingTop: '30px' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}

                    {/* NEW: Multi-line Trend - Active Users + Managed Devices */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.7 }}
                        className="glass-card"
                        style={{ padding: '14px' }}
                    >
                        <div className="flex-center justify-start flex-gap-4 spacing-v-8">
                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', borderRadius: '6px' }}>
                                <TrendingUp size={14} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '12px', fontWeight: 700 }}>Growth Trends (30 Days)</h3>
                                <p style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Active Users & Managed Devices</p>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={data?.charts.userGrowthTrend || []} margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="gradDevices" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#a855f7" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="week" stroke="var(--text-dim)" axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 500 }} dy={10} />
                                <YAxis stroke="var(--text-dim)" axisLine={false} tickLine={false} style={{ fontSize: '11px' }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                                <Line
                                    type="monotone"
                                    dataKey="active"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ fill: '#3b82f6', r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name="Active Users"
                                    animationDuration={1200}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="inactive"
                                    stroke="#a855f7"
                                    strokeWidth={3}
                                    dot={{ fill: '#a855f7', r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name="Devices"
                                    animationDuration={1400}
                                    strokeDasharray="5 5"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </motion.div>

                    {/* NEW: Stacked Bar - Security Alerts by Severity */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                        className="glass-card"
                        style={{ padding: '14px' }}
                    >
                        <div className="flex-center justify-start flex-gap-4 spacing-v-8">
                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, var(--accent-error), var(--accent-warning))', borderRadius: '6px' }}>
                                <AlertTriangle size={14} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '12px', fontWeight: 700 }}>Security Alerts</h3>
                                <p style={{ fontSize: '9px', color: 'var(--text-dim)' }}>By Severity Level</p>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart
                                data={[
                                    { name: 'Last 30 Days', high: 5, medium: 12, low: 28 }
                                ]}
                                margin={{ top: 30, right: 30, left: 0, bottom: 20 }}
                            >
                                <defs>
                                    <linearGradient id="alertHigh" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="alertMedium" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="alertLow" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-dim)" axisLine={false} tickLine={false} style={{ fontSize: '11px', fontWeight: 500 }} dy={10} />
                                <YAxis stroke="var(--text-dim)" axisLine={false} tickLine={false} style={{ fontSize: '11px' }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                                <Bar dataKey="high" stackId="alerts" fill="url(#alertHigh)" radius={[0, 0, 0, 0]} name="High" animationDuration={1000}>
                                    <LabelList dataKey="high" position="center" style={{ fill: 'white', fontSize: '12px', fontWeight: 700 }} />
                                </Bar>
                                <Bar dataKey="medium" stackId="alerts" fill="url(#alertMedium)" radius={[0, 0, 0, 0]} name="Medium" animationDuration={1200}>
                                    <LabelList dataKey="medium" position="center" style={{ fill: 'white', fontSize: '12px', fontWeight: 700 }} />
                                </Bar>
                                <Bar dataKey="low" stackId="alerts" fill="url(#alertLow)" radius={[10, 10, 0, 0]} name="Low" animationDuration={1400}>
                                    <LabelList dataKey="low" position="center" style={{ fill: 'white', fontSize: '12px', fontWeight: 700 }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </motion.div>


                </div>
            </div>

        </div>
    );
};

export default OverviewDashboard;
