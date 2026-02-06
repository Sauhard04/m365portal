import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { AggregationService } from '../services/aggregation.service';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars
import {
    PieChart, Pie, BarChart, Bar, LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Treemap, ComposedChart,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, Label, LabelList, ResponsiveContainer
} from 'recharts';
import {
    Users, Smartphone, CreditCard, Shield, Activity,
    TrendingUp, AlertTriangle, Mail, Download,
    ShieldCheck, Lock, LayoutGrid, RefreshCw,
    ChevronDown, ChevronUp, BarChart3
} from 'lucide-react';
import BirdsEyeView from './BirdsEyeView';
import Loader3D from './Loader3D';
import { DataPersistenceService } from '../services/dataPersistence';
import SiteDataStore from '../services/siteDataStore';
import { MiniSparkline, MiniProgressBar, MiniSegmentedBar } from './charts/MicroCharts';
import { useDataCaching } from '../hooks/useDataCaching';
// Recharts components are standard for visualizations

const CustomTreemapContent = (props) => {
    const { x, y, width, height, name, fill } = props;

    // Minimum dimensions to show any text at all
    const MIN_W = 40;
    const MIN_H = 30;
    const isVisible = width > MIN_W && height > MIN_H;

    if (!isVisible) return <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} fill={fill} rx={8} ry={8} />;

    // Dynamic Font Sizing
    const fontSize = Math.min(12, Math.max(9, Math.floor(width / 15)));

    // Character limit based on width and font size
    const charWidth = fontSize * 0.6;
    const maxChars = Math.floor((width - 20) / charWidth);
    const displayText = name.length > maxChars ? name.substring(0, Math.max(0, maxChars - 3)) + '...' : name;

    const shouldShowText = displayText.length >= 3;

    return (
        <g>
            {/* Primary Block */}
            <rect
                x={x + 2}
                y={y + 2}
                width={width - 4}
                height={height - 4}
                rx={12}
                ry={12}
                style={{
                    fill: fill,
                    filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.25))',
                    cursor: 'pointer'
                }}
            />

            {/* Premium Glass Overlay: Less aggressive in light mode via soft-light blend */}
            <rect
                x={x + 2}
                y={y + 2}
                width={width - 4}
                height={height - 4}
                rx={12}
                ry={12}
                fill="url(#treemapGlassGradient)"
                style={{ pointerEvents: 'none', mixBlendMode: 'soft-light', opacity: 0.6 }}
            />

            {shouldShowText && (
                <g>
                    {/* Background Pill: Uses theme-aware variables for high contrast */}
                    <rect
                        x={x + (width / 2) - Math.min((width - 10) / 2, (displayText.length * charWidth + 12) / 2)}
                        y={y + (height / 2) - (fontSize * 0.8)}
                        width={Math.min(width - 10, displayText.length * charWidth + 12)}
                        height={fontSize * 1.6}
                        rx={fontSize * 0.8}
                        fill="var(--treemap-pill-bg)"
                        style={{ backdropFilter: 'blur(8px)', border: '1px solid var(--treemap-pill-border)' }}
                    />
                    <text
                        x={x + width / 2}
                        y={y + height / 2 + (fontSize / 3)}
                        textAnchor="middle"
                        fill="var(--treemap-pill-text)"
                        style={{
                            fontSize: `${fontSize}px`,
                            fontWeight: 800,
                            pointerEvents: 'none',
                            letterSpacing: '0.2px',
                            textTransform: 'uppercase',
                            fontFamily: 'inherit'
                        }}
                    >
                        {displayText}
                    </text>
                </g>
            )}
        </g>
    );
};

const DashboardGlobalDefs = () => (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
            <linearGradient id="treemapGlassGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity={0.2} />
                <stop offset="50%" stopColor="white" stopOpacity={0.05} />
                <stop offset="100%" stopColor="black" stopOpacity={0.1} />
            </linearGradient>
        </defs>
    </svg>
);

const OverviewDashboard = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const fetchFn = async () => {
        const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
        const graphService = new GraphService(response.accessToken);
        const overviewData = await AggregationService.getOverviewData(graphService, response.accessToken);

        // Map to our persistence schema (Legacy support)
        const persistenceData = {
            overview: {
                statistics: {
                    total_users: overviewData.quickStats.totalUsers,
                    total_devices: overviewData.quickStats.totalDevices,
                    total_licenses: overviewData.quickStats.totalLicenses,
                    secure_score: overviewData.quickStats.secureScore
                },
                health_and_security: {
                    failed_signins: overviewData.charts.signIns[0]?.failed || 0,
                    compliance_rate: overviewData.charts.securityRadar.find(d => d.subject === 'Compliance')?.value || 0
                }
            },
            raw: overviewData
        };
        // L2 cache is handled by the hook for fresh data
        return overviewData;
    };

    const {
        data,
        loading,
        refreshing,
        error,
        refetch
    } = useDataCaching('Overview_v3', fetchFn, {
        maxAge: 30, // 30 minutes
        storeSection: 'overview',
        storeMetadata: { source: 'OverviewDashboard' },
        enabled: accounts.length > 0
    });

    const [overviewOpen, setOverviewOpen] = useState(true);
    const [birdsEyeOpen, setBirdsEyeOpen] = useState(true);

    const [chartsVisible, setChartsVisible] = useState(false);

    useEffect(() => {
        if (!loading && data) {
            const timer = setTimeout(() => {
                setChartsVisible(true);
            }, 800); // Increased delay to ensure container dimensions are stable
            return () => clearTimeout(timer);
        }
    }, [loading, data]);

    if (loading && !data) {
        return (
            <Loader3D showOverlay={true} />
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
            value: data?.quickStats?.totalUsers || 0,
            icon: Users,
            color: 'var(--accent-blue)',
            gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            path: '/service/entra/users'
        },
        {
            label: 'Managed Devices',
            value: data?.quickStats?.totalDevices || 0,
            icon: Smartphone,
            color: 'var(--accent-purple)',
            gradient: 'linear-gradient(135deg, #a855f7, #9333ea)',
            path: '/service/intune/devices'
        },
        {
            label: 'Active Licenses',
            value: data?.quickStats?.totalLicenses || 0,
            icon: CreditCard,
            color: 'var(--accent-cyan)',
            gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            path: '/service/admin/licenses'
        },
        {
            label: 'Secure Score',
            value: data?.quickStats?.secureScore ? `${Math.round((data.quickStats.secureScore / (data.quickStats.maxSecureScore || 100)) * 100)}%` : '0%',
            icon: Shield,
            color: 'var(--accent-success)',
            gradient: 'linear-gradient(135deg, #10b981, #059669)',
            path: '/service/admin/secure-score'
        },
        {
            label: 'MFA Enrollment',
            value: data?.quickStats?.mfaRegistered && data?.quickStats?.mfaTotal ? `${Math.round((data.quickStats.mfaRegistered / data.quickStats.mfaTotal) * 100)}%` : '0%',
            icon: Lock,
            color: 'var(--accent-success)',
            gradient: 'linear-gradient(135deg, #059669, #047857)',
            path: '/service/entra/sign-in-logs'
        },
        {
            label: 'Active Roles',
            value: data?.quickStats?.activeRoles || 0,
            icon: Shield,
            color: 'var(--accent-warning)',
            gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
            path: '/service/entra/admins'
        }
    ];

    const serviceHealthStats = data?.charts?.serviceHealth || [];
    const operationalCount = serviceHealthStats.find(s => s.name === 'Operational')?.value || 0;
    const totalServices = serviceHealthStats.reduce((acc, s) => acc + s.value, 0) || 1;
    const healthPercentage = Math.round((operationalCount / totalServices) * 100);


    // Enhanced Premium Tooltip with Glassmorphism
    // Enhanced Premium Tooltip with Glassmorphism
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        background: 'var(--tooltip-bg)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid var(--tooltip-border)',
                        borderRadius: '12px',
                        padding: '12px',
                        boxShadow: 'var(--shadow-lg)',
                        minWidth: '160px'
                    }}
                >
                    {label && (
                        <p style={{
                            fontWeight: 700,
                            marginBottom: '12px',
                            color: 'var(--tooltip-text)',
                            fontSize: '13px',
                            letterSpacing: '0.3px',
                            borderBottom: '1px solid var(--tooltip-border)',
                            paddingBottom: '8px'
                        }}>
                            {label}
                        </p>
                    )}
                    {payload.map((entry, index) => {
                        // Safe color extraction
                        let baseColor = entry.payload?.fill || entry.color || 'var(--text-primary)';

                        // Prevent invalid concatenation if it's a CSS variable
                        const isCssVar = typeof baseColor === 'string' && baseColor.startsWith('var(');
                        const dotColor = isCssVar ? baseColor : baseColor;
                        const shadowColor = isCssVar ? 'transparent' : `${baseColor}40`;

                        return (
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
                                    background: dotColor,
                                    boxShadow: shadowColor !== 'transparent' ? `0 0 8px ${shadowColor}` : 'none',
                                    flexShrink: 0
                                }}></div>
                                <span style={{
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)', // Higher contrast than text-dim
                                    flex: 1,
                                    fontWeight: 500
                                }}>
                                    {entry.name}:
                                </span>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    color: dotColor // Use the same color as the dot
                                }}>
                                    {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                                </span>
                            </div>
                        );
                    })}
                </motion.div>
            );
        }
        return null;
    };

    return (
        <div className="animate-in">
            <DashboardGlobalDefs />
            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Overview Dashboard</h1>
                </div>
                <div className="flex-gap-2">
                    <button
                        className={`sync-btn ${refreshing ? 'spinning' : ''}`}
                        onClick={() => refetch()}
                        title="Sync & Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </header>

            {/* BIRD'S EYE VIEW DROPDOWN */}
            <div style={{ marginBottom: '24px' }}>
                <motion.div
                    onClick={() => setBirdsEyeOpen(!birdsEyeOpen)}
                    style={{
                        cursor: 'pointer',
                        padding: '16px 24px',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: birdsEyeOpen ? '16px' : '0'
                    }}
                    whileHover={{ background: 'var(--glass-bg-hover)' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BarChart3 size={20} color="var(--accent-purple)" />
                        <span style={{ fontWeight: 700, fontSize: '18px' }}>M365 Bird's Eye Snapshot</span>
                    </div>
                    {birdsEyeOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </motion.div>

                {birdsEyeOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            padding: '16px 0',
                            marginTop: '8px'
                        }}
                    >
                        <BirdsEyeView embedded={true} />
                    </motion.div>
                )}
            </div>

            {/* SERVICE HEALTH STATUS RING (New Production Detail) */}
            <div style={{ marginBottom: '24px' }}>
                <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '32px', overflow: 'hidden' }}>
                    <div style={{ flex: 1 }}>
                        <div className="flex-center justify-start flex-gap-4" style={{ marginBottom: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: healthPercentage > 90 ? 'var(--accent-success)' : 'var(--accent-warning)', boxShadow: `0 0 10px ${healthPercentage > 90 ? 'var(--accent-success)' : 'var(--accent-warning)'}` }} />
                            <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Service Infrastructure</h2>
                        </div>
                        <p style={{ color: 'var(--text-dim)', fontSize: '13px', maxWidth: '400px' }}>
                            Overall health across Microsoft 365 core services. {healthPercentage === 100 ? 'All systems are performing optimally.' : `Currently monitoring minor service degradations.`}
                        </p>
                    </div>

                    <div style={{ width: '120px', height: '120px', position: 'relative', flexShrink: 0 }}>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Healthy', value: healthPercentage },
                                        { name: 'Gap', value: 100 - healthPercentage }
                                    ]}
                                    innerRadius={40}
                                    outerRadius={50}
                                    startAngle={90}
                                    endAngle={450}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    <Cell fill="var(--accent-success)" />
                                    <Cell fill="rgba(255,255,255,0.05)" />
                                    <Label
                                        value={`${healthPercentage}%`}
                                        position="center"
                                        fill="currentColor"
                                        style={{ fontSize: '16px', fontWeight: 800 }}
                                    />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* OVERVIEW DROPDOWN */}
            <div style={{ marginBottom: '32px' }}>
                <motion.div
                    onClick={() => setOverviewOpen(!overviewOpen)}
                    style={{
                        cursor: 'pointer',
                        padding: '16px 24px',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: overviewOpen ? '16px' : '0'
                    }}
                    whileHover={{ background: 'var(--glass-bg-hover)' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <LayoutGrid size={20} color="var(--accent-blue)" />
                        <span style={{ fontWeight: 700, fontSize: '18px' }}>Environment Insights Overview</span>
                    </div>
                    {overviewOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </motion.div>

                {overviewOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Quick Stats Section (Now Inside Dropdown) */}
                        <div className="stat-grid" style={{ marginBottom: '24px', marginTop: '16px' }}>
                            {quickStats.map((stat, idx) => {
                                let microFigure = null;
                                if (idx === 0) {
                                    if (data?.charts.userGrowthTrend?.length > 1) {
                                        const userTrendData = data.charts.userGrowthTrend.map(d => ({ value: d.active }));
                                        microFigure = (
                                            <div style={{ marginTop: '12px' }}>
                                                <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '4px' }}>Active Users Trend</div>
                                                <MiniSparkline data={userTrendData} color={stat.color} height={30} />
                                            </div>
                                        );
                                    }
                                } else if (idx === 1) {
                                    const compliantCount = data?.charts.deviceCompliance?.find(d => d.name === 'Compliant')?.value || 0;
                                    const totalDevices = data?.quickStats.totalDevices || 0;
                                    const complianceSegments = [
                                        { label: 'Compliant', value: compliantCount, color: '#10b981' },
                                        { label: 'Issues', value: totalDevices - compliantCount, color: '#f43f5e' }
                                    ].filter(s => s.value > 0);
                                    microFigure = (
                                        <div style={{ marginTop: '12px' }}>
                                            <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '6px' }}>Compliance Status</div>
                                            <MiniSegmentedBar segments={complianceSegments} height={8} />
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                                {complianceSegments.map((seg, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: seg.color }}></div>
                                                        <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{seg.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                } else if (idx === 2) {
                                    const topLicenses = (data?.charts.licenseUsage || []).slice(0, 3);
                                    if (topLicenses.length > 0) {
                                        microFigure = (
                                            <div style={{ marginTop: '12px' }}>
                                                <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '6px' }}>Top License Usage</div>
                                                {(() => {
                                                    const colors = ['#3b82f6', '#10b981', '#f59e0b'];
                                                    const segments = topLicenses.map((lic, idx) => ({
                                                        label: lic.name,
                                                        value: lic.assigned,
                                                        color: colors[idx % colors.length]
                                                    }));
                                                    return <MiniSegmentedBar segments={segments} height={10} />;
                                                })()}
                                            </div>
                                        );
                                    }
                                }

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

                        {/* Primary Dashboard Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '16px'
                        }}>
                            {/* User Distribution */}
                            {data?.charts.userDistribution?.length > 0 && (
                                <div
                                    className="glass-card"
                                    style={{ padding: '14px', cursor: 'pointer', transition: 'transform 0.2s' }}
                                    onClick={() => navigate('/service/entra/users')}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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
                                    <div style={{ height: '240px', width: '100%', minWidth: '200px', overflow: 'hidden', position: 'relative' }}>
                                        {chartsVisible ? (
                                            <ResponsiveContainer width="100%" height={260} minWidth={1} minHeight={1} debounce={200}>
                                                <PieChart>
                                                    <Pie data={data.charts.userDistribution} cx="50%" cy="50%" outerRadius={80} innerRadius={60} paddingAngle={5} dataKey="value" stroke="var(--glass-bg)" strokeWidth={2}>
                                                        {data.charts.userDistribution.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.name === 'Active' ? 'var(--accent-success)' : 'var(--accent-warning)'} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend verticalAlign="bottom" height={36} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>Loading chart...</div>}
                                    </div>
                                </div>
                            )}

                            {/* Device Compliance */}
                            {data?.charts.deviceCompliance?.length > 0 && (
                                <div
                                    className="glass-card"
                                    style={{ padding: '14px', cursor: 'pointer', transition: 'transform 0.2s' }}
                                    onClick={() => navigate('/service/intune')}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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
                                    <div style={{ height: '240px', minWidth: '0', overflow: 'hidden' }}>
                                        {chartsVisible && (
                                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} debounce={200}>
                                                <BarChart data={data.charts.deviceCompliance} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                    <defs>
                                                        <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="var(--accent-indigo)" />
                                                            <stop offset="100%" stopColor="var(--accent-purple)" />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" opacity={0.3} vertical={false} />
                                                    <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={false} />
                                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--glass-border)', opacity: 0.1 }} />
                                                    <Bar dataKey="value" fill="url(#compGrad)" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* License Utilization */}
                            {data?.charts.licenseUsage?.length > 0 && (
                                <div
                                    className="glass-card"
                                    style={{ padding: '14px', cursor: 'pointer', transition: 'transform 0.2s' }}
                                    onClick={() => navigate('/service/admin/licenses')}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {data.charts.licenseUsage.slice(0, 4).map((license, idx) => (
                                            <div key={idx}>
                                                <div className="flex-between" style={{ marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{license.name}</span>
                                                    <span style={{ fontSize: '10px', fontWeight: 700 }}>{Math.round((license.assigned / (license.assigned + license.available)) * 100)}%</span>
                                                </div>
                                                <div style={{ width: '100%', height: '4px', background: 'var(--progress-track)', borderRadius: '2px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${(license.assigned / (license.assigned + license.available)) * 100}%`, height: '100%', background: 'var(--accent-cyan)' }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Email Activity */}
                            {data?.charts.emailTrend?.length > 0 && (
                                <div
                                    className="glass-card"
                                    style={{ padding: '14px', cursor: 'pointer', transition: 'transform 0.2s' }}
                                    onClick={() => navigate('/service/admin/emails')}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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
                                    <div style={{ height: '240px', width: '100%', minWidth: '200px', overflow: 'hidden', position: 'relative' }}>
                                        {chartsVisible ? (
                                            <ResponsiveContainer width="100%" height={260} minWidth={1} minHeight={1} debounce={200}>
                                                <AreaChart data={data.charts.emailTrend}>
                                                    <defs>
                                                        <linearGradient id="emailGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="var(--accent-indigo)" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="var(--accent-indigo)" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis dataKey="name" hide />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Area type="monotone" dataKey="sent" name="Sent" stroke="var(--accent-indigo)" fillOpacity={1} fill="url(#emailGrad)" strokeWidth={2} />
                                                    <Area type="monotone" dataKey="received" name="Received" stroke="var(--accent-cyan)" fillOpacity={0} strokeWidth={2} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>Loading chart...</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Advanced Analytics Section */}
                        <div style={{ marginTop: '24px' }}>
                            <h2 style={{ fontSize: '16px', marginBottom: '16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Advanced Analytics</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                {/* Security Radar */}
                                {data?.charts.securityRadar && (
                                    <div
                                        className="glass-card"
                                        style={{ padding: '14px', cursor: 'pointer', transition: 'transform 0.2s' }}
                                        onClick={() => navigate('/service/admin/secure-score')}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div className="flex-center justify-start flex-gap-4 spacing-v-8">
                                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, var(--accent-error), var(--accent-warning))', borderRadius: '6px' }}>
                                                <Shield size={14} color="white" />
                                            </div>
                                            <h3 style={{ fontSize: '12px', fontWeight: 700 }}>Security Posture</h3>
                                        </div>
                                        <div style={{ height: '260px', width: '100%', minWidth: '200px', overflow: 'hidden', position: 'relative' }}>
                                            {chartsVisible ? (
                                                <ResponsiveContainer width="100%" height={260} minWidth={1} minHeight={1} debounce={200}>
                                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.charts.securityRadar}>
                                                        <PolarGrid stroke="var(--glass-border)" />
                                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} />
                                                        <Radar name="Score" dataKey="value" stroke="var(--accent-blue)" fill="var(--accent-blue)" fillOpacity={0.3} />
                                                        <Tooltip content={<CustomTooltip />} />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>Loading chart...</div>}
                                        </div>
                                    </div>
                                )}

                                {/* License Treemap (New Production Detail) */}
                                {data?.charts.licenseTreemap?.length > 0 && (
                                    <div
                                        className="glass-card"
                                        style={{ padding: '14px', gridColumn: 'span 2' }}
                                    >
                                        <div className="flex-center justify-start flex-gap-4 spacing-v-8">
                                            <div style={{ padding: '6px', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', borderRadius: '6px' }}>
                                                <LayoutGrid size={14} color="white" />
                                            </div>
                                            <h3 style={{ fontSize: '12px', fontWeight: 700 }}>License Distribution (By SKU Size)</h3>
                                        </div>
                                        <div style={{ height: '300px', width: '100%', marginTop: '16px' }}>
                                            {chartsVisible ? (
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <Treemap
                                                        data={data.charts.licenseTreemap}
                                                        dataKey="size"
                                                        aspectRatio={4 / 3}
                                                        stroke="var(--glass-bg)"
                                                        fill="var(--accent-blue)"
                                                        content={<CustomTreemapContent />}
                                                    >
                                                        <Tooltip content={<CustomTooltip />} />
                                                    </Treemap>
                                                </ResponsiveContainer>
                                            ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>Loading chart...</div>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default OverviewDashboard;
