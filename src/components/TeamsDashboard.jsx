import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { motion } from 'framer-motion';
import { teamsScopes } from '../authConfig';
import { TeamsService } from '../services/teams/teams.service';
import { DataPersistenceService } from '../services/dataPersistence';
import AnimatedTile from './AnimatedTile';
import Loader3D from './Loader3D';
import {
    Users, MessageSquare, Video, RefreshCw, ChevronRight, Hash, Lock, Globe, Archive
} from 'lucide-react';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

const TeamsDashboard = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dashboardData, setDashboardData] = useState({
        teams: { total: 0, byVisibility: {}, archived: 0, recentlyCreated: 0, topTeams: [] },
        myTeams: { total: 0, teams: [] },
        chats: { total: 0 },
        activity: { activeCalls: 0, activeMessages: 0, history: [] }
    });
    const [error, setError] = useState(null);

    const CACHE_KEY = 'teams_dashboard';
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
                ...teamsScopes,
                account
            }).catch(async (authErr) => {
                if (authErr.name === "InteractionRequiredAuthError" || authErr.errorCode === "invalid_grant") {
                    if (isManual) {
                        return await instance.acquireTokenPopup(teamsScopes);
                    } else {
                        throw authErr;
                    }
                }
                throw authErr;
            });

            const client = Client.init({
                authProvider: (done) => done(null, tokenResponse.accessToken)
            });

            const data = await TeamsService.getDashboardSummary(client);



            setDashboardData(data);
            DataPersistenceService.save(CACHE_KEY, data);
        } catch (err) {
            if (err.name === "InteractionRequiredAuthError" || err.errorCode === "invalid_grant") {
                console.warn("Interaction required for Teams Dashboard");
                setError("InteractionRequired");
            } else {
                console.error('Failed to fetch Teams dashboard data:', err);
                setError(err.message || "Failed to load Teams data");
            }
        } finally {
            if (isManual) {
                // Ensure the spinner shows for at least 1 second for better UX
                setTimeout(() => setRefreshing(false), 1000);
            } else {
                setLoading(false);
                setRefreshing(false);
            }
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

    const visibilityData = [
        { name: 'Public', value: dashboardData.teams.byVisibility?.Public || 0, color: '#22c55e', icon: Globe },
        { name: 'Private', value: dashboardData.teams.byVisibility?.Private || 0, color: '#a855f7', icon: Lock },
        { name: 'Hidden', value: dashboardData.teams.byVisibility?.HiddenMembership || 0, color: '#6b7280', icon: Archive }
    ].filter(d => d.value > 0);

    if (loading) {
        return <Loader3D showOverlay={true} text="Loading Teams Dashboard..." />;
    }

    return (
        <div className="animate-in">
            {/* Header */}
            <header className="flex-between spacing-v-8">
                <div>
                    <a
                        href="https://admin.teams.microsoft.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                    >
                        <h1 className="title-gradient" style={{ fontSize: '32px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <Users size={28} style={{ color: 'var(--accent-purple)' }} />
                            Teams & Collaboration
                        </h1>
                    </a>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Manage teams, channels, and collaboration settings</p>
                </div>
                <div className="flex-gap-2">
                    <a
                        href="https://admin.teams.microsoft.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass-btn"
                        style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: 'var(--text-primary)' }}
                    >
                        <Lock size={14} />
                        Teams Admin Center
                    </a>
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
                    <span>{error === 'InteractionRequired' ? '🔐 Teams session expired. Additional permissions required to load telemetry.' : error}</span>
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
                    style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(168, 85, 247, 0.02))', cursor: 'pointer' }}
                    onClick={() => navigate('/service/teams/list')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.2)' }}>
                        <Users size={20} style={{ color: '#a855f7' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Teams</span>
                        <span className="stat-value" style={{ color: '#a855f7' }}>
                            {dashboardData.teams.total}
                        </span>
                        <span className="stat-sublabel">
                            in organization
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
                    style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.02))', cursor: 'pointer' }}
                    onClick={() => navigate('/service/teams/list?filter=my')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                        <Hash size={20} style={{ color: '#3b82f6' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">My Teams</span>
                        <span className="stat-value" style={{ color: '#3b82f6' }}>
                            {dashboardData.myTeams.total}
                        </span>
                        <span className="stat-sublabel">
                            joined teams
                        </span>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card clickable"
                    style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.02))', cursor: 'pointer' }}
                    onClick={() => navigate('/service/teams/chats')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                        <MessageSquare size={20} style={{ color: '#22c55e' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">My Chats</span>
                        <span className="stat-value" style={{ color: '#22c55e' }}>
                            {dashboardData.chats.total}
                        </span>
                        <span className="stat-sublabel">
                            conversations
                        </span>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3 * 0.1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="glass-card stat-card clickable"
                    style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))', cursor: 'pointer' }}
                    onClick={() => navigate('/service/teams/list?filter=archived')}
                >
                    <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                        <Archive size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Archived</span>
                        <span className="stat-value" style={{ color: '#f59e0b' }}>
                            {dashboardData.teams.archived}
                        </span>
                        <span className="stat-sublabel">
                            archived teams
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
                {/* Teams by Visibility */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="chart-card glass-card"
                >
                    <div className="chart-header">
                        <h3><Users size={16} /> Teams by Visibility</h3>
                        <button
                            className="view-all-btn"
                            onClick={() => navigate('/service/teams/list')}
                        >
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="chart-body" style={{ height: '220px', width: '100%' }}>
                        {visibilityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={visibilityData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={85}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {visibilityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" style={{ fill: 'var(--text-primary)', fontSize: '24px', fontWeight: 800 }}>
                                        {dashboardData.teams.total}
                                    </text>
                                    <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" style={{ fill: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Total Teams
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data-state">
                                <Users size={40} style={{ opacity: 0.3 }} />
                                <p>No teams data available</p>
                            </div>
                        )}
                    </div>
                    <div className="chart-legend">
                        {visibilityData.map((item, idx) => (
                            <div key={idx} className="legend-item">
                                <span className="legend-dot" style={{ background: item.color }}></span>
                                <span>{item.name}: {item.value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Teams Activity Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="chart-card glass-card recent-activity-card"
                    style={{ maxHeight: 'fit-content' }}
                >
                    <div className="chart-header">
                        <h3><RefreshCw size={16} /> Teams Activity (Last 7 Days)</h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="badge-live">Telemetry Trends</span>
                        </div>
                    </div>
                    <div className="chart-body" style={{ height: '220px', width: '100%', marginTop: '12px' }}>
                        {dashboardData.activity?.history && dashboardData.activity.history.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dashboardData.activity.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                                        tickFormatter={(str) => {
                                            try {
                                                const d = new Date(str);
                                                return d.toLocaleDateString([], { weekday: 'short' });
                                            } catch (e) { return str; }
                                        }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--tooltip-bg)',
                                            border: '1px solid var(--tooltip-border)',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            backdropFilter: 'blur(12px)'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="teamChatMessages"
                                        name="Team Messages"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorMessages)"
                                        animationDuration={1500}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="calls"
                                        name="Calls"
                                        stroke="#22c55e"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorCalls)"
                                        animationDuration={1500}
                                        animationBegin={200}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="meetings"
                                        name="Meetings"
                                        stroke="#f59e0b"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorMeetings)"
                                        animationDuration={1500}
                                        animationBegin={400}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="no-data-state">
                                <RefreshCw size={32} style={{ opacity: 0.3 }} />
                                <p>No activity trends available</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Top Teams */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="table-card glass-card"
            >
                <div className="table-header">
                    <h3><Users size={16} /> Top Teams</h3>
                </div>
                <div className="table-body">
                    {dashboardData.teams.topTeams?.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Team Name</th>
                                    <th>Visibility</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardData.teams.topTeams.map((team, idx) => (
                                    <tr
                                        key={team.id || idx}
                                        onClick={() => navigate(`/service/teams/${team.id}`)}
                                        style={{ cursor: 'pointer' }}
                                        className="hover-row"
                                    >
                                        <td className="team-name-cell">
                                            <Users size={14} style={{ color: '#a855f7' }} />
                                            {team.displayName || 'Unnamed Team'}
                                        </td>
                                        <td>
                                            <span className={`visibility-badge ${team.visibility?.toLowerCase()}`}>
                                                {team.visibility === 'Public' ? <Globe size={10} /> : <Lock size={10} />}
                                                {team.visibility || 'Unknown'}
                                            </span>
                                        </td>
                                        <td>{team.createdDateTime ? new Date(team.createdDateTime).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="no-data-state" style={{ padding: '40px' }}>
                            <Users size={40} style={{ opacity: 0.3 }} />
                            <p>No teams found</p>
                        </div>
                    )}
                </div>
            </motion.div>

            <style>{`
                .stat-card {
                    display: flex; align-items: center; gap: 16px; padding: 20px;
                    border-radius: 16px; border: 1px solid var(--glass-border); transition: all 0.3s ease;
                }
                .stat-card.clickable { cursor: pointer; }
                .stat-card.clickable:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2); }
                .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                .stat-content { flex: 1; display: flex; flex-direction: column; }
                .stat-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
                .stat-value { font-size: 28px; font-weight: 700; line-height: 1; }
                .stat-sublabel { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; }
                .chart-card { padding: 16px; border-radius: 16px; max-height: 280px; }
                .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .chart-header h3 { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; margin: 0; }
                .view-all-btn { display: flex; align-items: center; gap: 4px; background: none; border: none; color: var(--accent-blue); font-size: 12px; cursor: pointer; }
                .chart-legend { display: flex; justify-content: center; gap: 20px; margin-top: 12px; }
                .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary); }
                .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
                .no-data-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-tertiary); gap: 12px; }
                .my-teams-list { display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto; }
                .team-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 10px; }
                .team-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(168, 85, 247, 0.2); display: flex; align-items: center; justify-content: center; color: #a855f7; }
                .team-info { flex: 1; display: flex; flex-direction: column; }
                .team-name { font-weight: 500; font-size: 13px; color: var(--text-primary); }
                .team-desc { font-size: 11px; color: var(--text-tertiary); }
                .table-card { padding: 20px; border-radius: 16px; }
                .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .table-header h3 { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; margin: 0; }
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--glass-border); font-size: 12px; }
                .data-table th { color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; font-size: 10px; }
                .team-name-cell { display: flex; align-items: center; gap: 8px; font-weight: 500; }
                .visibility-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; }
                .visibility-badge.public { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
                .visibility-badge.private { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .hover-row:hover { background: rgba(255, 255, 255, 0.03); }
                .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; gap: 16px; }
                .loading-spinner { width: 40px; height: 40px; border: 3px solid var(--glass-border); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 1s linear infinite; }


            `}</style>
        </div>
    );
};

export default TeamsDashboard;
