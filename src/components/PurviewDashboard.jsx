import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { PurviewService } from '../services/purview';
import { DataPersistenceService } from '../services/dataPersistence';
import { motion } from 'framer-motion';
import { Database, FileSearch, GitBranch, Tags, BookOpen, Scan, Shield, FileKey, BarChart3, RefreshCw, Lock } from 'lucide-react';
import Loader3D from './Loader3D';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { MiniSegmentedBar, MiniSeverityStrip, MiniSparkline, MiniProgressBar } from './charts/MicroCharts';

const PurviewDashboard = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();

    const [stats, setStats] = useState({
        totalAssets: 0,
        assetTypes: 0,
        classifications: 0,
        glossaryTerms: 0,
        glossaryCategories: 0,
        dataSources: 0,
        collections: 0,
        policies: 0,
        assetsWithLineage: 0,
        sensitiveAssets: 0,
        classificationDistribution: [],
        scanStats: { totalSources: 0, activeSources: 0, inactiveSources: 0, pendingSources: 0 }
    });
    const [assetDistribution, setAssetDistribution] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async (isManual = false) => {
        if (accounts.length === 0) return;
        setLoading(true);

        const startTime = Date.now();

        try {
            const response = await instance.acquireTokenSilent({
                scopes: ['https://purview.azure.net/.default'],
                account: accounts[0]
            });

            const dashboardData = await PurviewService.getDashboardData(response.accessToken);

            // Transform asset distribution for charts
            const topAssets = Object.entries(dashboardData.assetDistribution || {})
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 6);

            // Persist data
            const persistenceData = {
                purview: {
                    assets: { total: dashboardData.totalAssets, types: dashboardData.assetTypes },
                    classifications: { count: dashboardData.classifications },
                    glossary: { terms: dashboardData.glossaryTermsCount, categories: dashboardData.glossaryCategoriesCount },
                    scanning: dashboardData.scanStats,
                    governance: { collections: dashboardData.collections, policies: dashboardData.policies }
                },
                raw: { stats: dashboardData, assetDistribution: topAssets }
            };

            await DataPersistenceService.save('Purview', persistenceData);

            setStats(dashboardData);
            setAssetDistribution(topAssets);
        } catch (error) {
            console.error('Purview dashboard fetch error:', error);
            // No fallback - show empty state
            console.warn('Purview endpoint not configured or API call failed. Please configure VITE_PURVIEW_ENDPOINT in .env');
        } finally {
            if (isManual) {
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, 2000 - elapsedTime);
                setTimeout(() => setLoading(false), remainingTime);
            } else {
                setLoading(false);
            }
        }
    };

    const loadData = async () => {
        const cached = await DataPersistenceService.load('Purview');
        if (cached && cached.raw) {
            setStats(cached.raw.stats);
            setAssetDistribution(cached.raw.assetDistribution || []);
            setLoading(false);

            if (DataPersistenceService.isExpired('Purview', 30)) {
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
            label: 'Data Catalog',
            value: stats.totalAssets,
            subtitle: `${stats.assetTypes} types`,
            color: 'var(--accent-blue)',
            path: '/service/purview/catalog',
            icon: Database,
            sparkline: true
        },
        {
            label: 'Asset Types',
            value: stats.assetTypes,
            subtitle: 'Registered',
            color: 'var(--accent-purple)',
            path: '/service/purview/catalog',
            icon: FileSearch,
            progress: Math.min(100, (stats.assetTypes / 50) * 100)
        },
        {
            label: 'Lineage Tracking',
            value: stats.assetsWithLineage || 0,
            subtitle: 'With lineage',
            color: 'var(--accent-cyan)',
            path: '/service/purview/lineage',
            icon: GitBranch,
            segments: stats.totalAssets > 0 ? [
                { label: 'Tracked', value: stats.assetsWithLineage || 0, color: '#06b6d4' },
                { label: 'Untracked', value: (stats.totalAssets - (stats.assetsWithLineage || 0)), color: '#64748b' }
            ] : []
        },
        {
            label: 'Classifications',
            value: stats.classifications,
            subtitle: 'Sensitivity labels',
            color: 'var(--accent-warning)',
            path: '/service/purview/classifications',
            icon: Tags,
            sparkline: true
        },
        {
            label: 'Business Glossary',
            value: stats.glossaryTermsCount,
            subtitle: `${stats.glossaryCategories} categories`,
            color: 'var(--accent-indigo)',
            path: '/service/purview/glossary',
            icon: BookOpen,
            progress: Math.min(100, (stats.glossaryTermsCount / 500) * 100)
        },
        {
            label: 'Data Sources',
            value: stats.dataSources,
            subtitle: `${stats.scanStats.activeSources} active`,
            color: 'var(--accent-success)',
            path: '/service/purview/scanning',
            icon: Scan,
            segments: [
                { label: 'Active', value: stats.scanStats.activeSources, color: '#10b981' },
                { label: 'Inactive', value: stats.scanStats.inactiveSources, color: '#94a3b8' }
            ]
        },
        {
            label: 'Collections',
            value: stats.collections,
            subtitle: 'Access control',
            color: 'var(--accent-teal)',
            path: '/service/purview/collections',
            icon: Shield,
            progress: Math.min(100, (stats.collections / 20) * 100)
        },
        {
            label: 'Policies',
            value: stats.policies,
            subtitle: 'Active policies',
            color: 'var(--accent-error)',
            path: '/service/purview/policies',
            icon: FileKey,
            sparkline: true
        },
        {
            label: 'Data Insights',
            value: stats.sensitiveAssets || 0,
            subtitle: 'Sensitive assets',
            color: 'var(--accent-pink)',
            path: '/service/purview/insights',
            icon: BarChart3,
            severity: 'medium'
        }
    ];

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-card" style={{ padding: '10px', border: '1px solid var(--accent-blue-glow)' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600 }}>{payload[0].name}: {payload[0].value}</p>
                </div>
            );
        }
        return null;
    };

    const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Purview Governance</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Unified data governance and compliance platform</p>
                </div>
                <div className="flex-gap-2">
                    <button className={`sync-btn ${loading ? 'spinning' : ''}`} onClick={() => fetchDashboardData(true)} title="Sync & Refresh">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </header>

            {loading ? (
                <Loader3D showOverlay={true} />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
                    {/* Left Grid with Dashboard Tiles */}
                    <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', width: '100%' }}>
                        {tiles.map((tile, i) => {
                            let microFigure = null;

                            // Segments visualization
                            if (tile.segments && tile.segments.length > 0) {
                                microFigure = (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '6px' }}>Distribution</div>
                                        <MiniSegmentedBar segments={tile.segments} height={8} />
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                            {tile.segments.map((seg, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: seg.color }}></div>
                                                    <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{seg.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            // Severity indicator
                            else if (tile.severity) {
                                microFigure = (
                                    <div style={{ marginTop: '12px' }}>
                                        <MiniSeverityStrip
                                            severity={tile.severity}
                                            count={`${tile.value} Assets`}
                                            height={22}
                                        />
                                    </div>
                                );
                            }
                            // Progress bar
                            else if (tile.progress !== undefined) {
                                microFigure = (
                                    <div style={{ marginTop: '14px' }}>
                                        <div className="flex-between" style={{ marginBottom: '6px' }}>
                                            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Coverage</span>
                                            <span style={{ fontSize: '10px', color: tile.color, fontWeight: 700 }}>{Math.round(tile.progress)}%</span>
                                        </div>
                                        <MiniProgressBar value={tile.progress} color={tile.color} height={4} />
                                    </div>
                                );
                            }
                            // Sparkline
                            else if (tile.sparkline) {
                                // Sparklines disabled until real trend data is available from Purview API
                                // const sparkData = Array.from({ length: 15 }, (_, j) => ({
                                //     value: 50 + Math.random() * 40 + (j * 3)
                                // }));
                                microFigure = null; // No sparkline visualization without real data
                            }

                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    className="glass-card stat-card"
                                    onClick={() => navigate(tile.path)}
                                    style={{ cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                                >
                                    <div>
                                        <div className="flex-between spacing-v-4">
                                            <span className="stat-label">{tile.label}</span>
                                            <tile.icon size={20} style={{ color: tile.color }} />
                                        </div>
                                        <div className="stat-value" style={{
                                            color: tile.color,
                                            fontSize: '32px',
                                            fontWeight: '700',
                                            letterSpacing: '-1px'
                                        }}>{(tile.value || 0).toLocaleString()}</div>
                                        {tile.subtitle && (
                                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                                                {tile.subtitle}
                                            </div>
                                        )}
                                    </div>

                                    {microFigure}
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Right Chart - Asset Distribution */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card"
                        style={{
                            padding: '24px',
                            position: 'sticky',
                            top: '24px',
                            minHeight: '520px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        <div className="flex-center flex-gap-4 spacing-v-8" style={{ width: '100%', marginBottom: '16px', flexShrink: 0 }}>
                            <div style={{ padding: '10px', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', borderRadius: '12px', boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)' }}>
                                <Lock size={24} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Asset Distribution</h3>
                            </div>
                            <Database size={18} color="var(--accent-success)" />
                        </div>

                        <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: '340px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {assetDistribution.length > 0 ? (
                                <PieChart width={320} height={320}>
                                    <defs>
                                        {COLORS.map((color, idx) => (
                                            <linearGradient key={idx} id={`assetGrad${idx}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                                                <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <Pie
                                        data={assetDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                        isAnimationActive={true}
                                    >
                                        {assetDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={`url(#assetGrad${index % COLORS.length})`} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} cursor={false} />
                                </PieChart>
                            ) : (
                                <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                                    <Database size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                    <p>No asset data available</p>
                                </div>
                            )}

                            <div style={{
                                position: 'absolute',
                                top: '50.5%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center',
                                pointerEvents: 'none',
                                zIndex: 10
                            }}>
                                <span style={{ fontSize: '48px', fontWeight: 800, display: 'block', lineHeight: 1, color: 'var(--text-primary)', letterSpacing: '-1.5px' }}>
                                    {stats.totalAssets}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '2.5px', fontWeight: 700, marginTop: '8px', display: 'block', opacity: 0.8 }}>Assets</span>
                            </div>
                        </div>

                        {/* Legend */}
                        <div style={{ width: '100%', marginTop: 'auto', flexShrink: 0, paddingTop: '24px' }}>
                            {assetDistribution.slice(0, 4).map((asset, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: COLORS[idx], flexShrink: 0 }}></div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 700 }}>{asset.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Analytics Section */}
            {!loading && stats.totalAssets > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: '16px',
                    marginTop: '24px'
                }}>
                    {/* Classification Coverage */}
                    <div className="glass-card" style={{ padding: '14px' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Tags size={14} color="var(--accent-warning)" />
                            Classification Coverage
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={stats.classificationDistribution || [
                                { name: 'Public', count: 0 },
                                { name: 'Internal', count: 0 },
                                { name: 'Confidential', count: 0 },
                                { name: 'Highly Confidential', count: 0 }
                            ]} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="var(--text-dim)" />
                                <YAxis stroke="var(--text-dim)" />
                                <Tooltip />
                                <Bar dataKey="count" fill="url(#barGrad1)" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Scan Status */}
                    <div className="glass-card" style={{ padding: '14px' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Scan size={14} color="var(--accent-cyan)" />
                            Scan Status Overview
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={[
                                {
                                    name: 'Sources',
                                    completed: stats.scanStats.activeSources || 0,
                                    pending: stats.scanStats.pendingSources || 0,
                                    failed: stats.scanStats.inactiveSources || 0
                                }
                            ]} margin={{ top: 20, right: 20, left: 0, bottom: 20 }} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" stroke="var(--text-dim)" />
                                <YAxis type="category" dataKey="name" stroke="var(--text-dim)" />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="completed" stackId="scan" fill="#10b981" name="Completed" radius={[0, 8, 8, 0]} />
                                <Bar dataKey="pending" stackId="scan" fill="#f59e0b" name="Pending" />
                                <Bar dataKey="failed" stackId="scan" fill="#ef4444" name="Failed" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurviewDashboard;
