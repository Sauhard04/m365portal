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
    ShieldCheck, Lock, LayoutGrid
} from 'lucide-react';

const OverviewDashboard = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOverviewData = async () => {
            if (accounts.length === 0) return;
            try {
                const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                const client = new GraphService(response.accessToken).client;
                const overviewData = await AggregationService.getOverviewData(client);
                setData(overviewData);
            } catch (err) {
                console.error('Overview fetch error:', err);
                setError('Failed to load overview data');
            } finally {
                setLoading(false);
            }
        };
        fetchOverviewData();
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
                    style={{
                        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(31, 41, 55, 0.98))',
                        padding: '18px 20px',
                        border: '1.5px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '16px',
                        backdropFilter: 'blur(30px)',
                        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.1), 0 0 20px rgba(139, 92, 246, 0.15)',
                        minWidth: '180px'
                    }}
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
            {/* Quick Stats Section */}
            <div className="stat-grid" style={{ marginBottom: '32px' }}>
                {quickStats.map((stat, idx) => (
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
                    </motion.div>
                ))}
            </div>

            {/* Charts Grid with Responsive Alignment */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: '16px'
            }}>

                {/* Enhanced Service Health - Radial Chart */}
                {data?.charts.serviceHealth?.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="glass-card"
                        style={{ padding: '14px' }}
                    >
                        <div className="flex-center justify-start flex-gap-4 spacing-v-8">
                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, var(--accent-success), var(--accent-cyan))', borderRadius: '6px' }}>
                                <Activity size={14} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '12px', fontWeight: 700 }}>Service Health</h3>
                                <p style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Real-time Status</p>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <defs>
                                    <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#00f2fe" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#4facfe" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="gradError" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ff0844" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#ffb199" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <Pie
                                    data={data.charts.serviceHealth}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomLabel}
                                    outerRadius={85}
                                    innerRadius={60}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={1200}
                                    stroke="none"
                                >
                                    {data.charts.serviceHealth.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.name === 'Operational' ? 'url(#gradSuccess)' : 'url(#gradError)'}
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


                </div>
            </div>

        </div>
    );
};

export default OverviewDashboard;
