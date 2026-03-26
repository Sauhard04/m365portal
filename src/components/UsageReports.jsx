import React, { useState, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
import { useSearchParams } from 'react-router-dom';
import { UsageService } from '../services/usage.service';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, ComposedChart
} from 'recharts';
import {
    Users, Mail, Globe, MessageCircle,
    Video, Phone, FileText, Share2,
    RefreshCw, ChevronDown, ChevronUp, BarChart3,
    Calendar, Filter, Download, Activity
} from 'lucide-react';
import Loader3D from './Loader3D';
import SiteDataStore from '../services/siteDataStore';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';

const UsageReports = () => {
    const { accounts } = useMsal();
    const { getAccessToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState('D7');
    const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'teams');
    const [data, setData] = useState({
        teams: { detail: [], counts: [] },
        exchange: { detail: [], counts: [] },
        sharepoint: { detail: [], counts: [] },
        onedrive: { detail: [], counts: [] }
    });

    const fetchData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        const startTime = Date.now();
        try {
            const accessToken = await getAccessToken({
                scopes: ["User.Read.All", "Sites.Read.All", "Reports.Read.All"]
            });

            const usageService = new UsageService(accessToken);

            const [teams, exchange, sharepoint, onedrive] = await Promise.all([
                usageService.getTeamsUsage(period),
                usageService.getExchangeUsage(period),
                usageService.getSharePointUsage(period),
                usageService.getOneDriveUsage(period)
            ]);

            // For OneDrive, we need to adapt the raw data if it doesn't match our component's expected format
            const formattedOneDrive = {
                detail: onedrive || [],
                counts: [] // OneDrive counts and detailed trends could be added here
            };

            setData({ teams, exchange, sharepoint, onedrive: formattedOneDrive });
            SiteDataStore.store('usageReports', { teams, exchange, sharepoint, onedrive: formattedOneDrive }, { source: 'UsageReports', period });

            // Proactive Background Fetch: If we just fetched D7, also fetch D180 for the AI cache
            if (period === 'D7') {
                Promise.all([
                    usageService.getTeamsUsage('D180'),
                    usageService.getExchangeUsage('D180'),
                    usageService.getSharePointUsage('D180'),
                    usageService.getOneDriveUsage('D180')
                ]).then(([t180, e180, s180, o180]) => {
                    const fO180 = { detail: o180 || [], counts: [] };
                    SiteDataStore.store('usageReports_D180', {
                        teams: t180,
                        exchange: e180,
                        sharepoint: s180,
                        onedrive: fO180,
                        period: 'D180'
                    }, { source: 'UsageReports_Background', period: 'D180' });
                }).catch(() => { });
            }
        } catch (error) {
            console.error("Error fetching usage data:", error);
            setData({
                teams: { detail: [], counts: [] },
                exchange: { detail: [], counts: [] },
                sharepoint: { detail: [], counts: [] },
                onedrive: { detail: [], counts: [] }
            });
        } finally {
            if (isManual) {
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, 1500 - elapsedTime);
                setTimeout(() => setRefreshing(false), remainingTime);
            } else {
                setLoading(false);
                setRefreshing(false);
            }
        }
    };

    useEffect(() => {
        if (accounts.length > 0) {
            fetchData();
        }
    }, [accounts, period, activeTenantId]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['teams', 'exchange', 'sharepoint', 'onedrive'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '12px',
                    padding: '12px',
                    boxShadow: 'var(--shadow-lg)',
                    backdropFilter: 'blur(12px)'
                }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 700, color: 'var(--tooltip-text)', borderBottom: '1px solid var(--tooltip-border)', paddingBottom: '6px' }}>
                        {label}
                    </p>
                    {payload.map((entry, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }}></div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1 }}>{entry.name}:</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: entry.color || 'var(--tooltip-text)' }}>{entry.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const renderTeamsDashboard = () => {
        const { detail, counts } = data.teams;
        const latestDetail = detail || [];
        const dailyCounts = counts && counts.length > 0 ? counts : [];

        const teamStats = {
            totalChats: latestDetail.reduce((acc, curr) => acc + (curr.teamChatMessages || 0) + (curr.privateChatMessages || 0), 0),
            totalMeetings: latestDetail.reduce((acc, curr) => acc + (curr.meetings || 0), 0),
            totalCalls: latestDetail.reduce((acc, curr) => acc + (curr.calls || 0), 0),
            activeUsers: latestDetail.filter(u => (u.teamChatMessages || 0) + (u.privateChatMessages || 0) + (u.meetings || 0) + (u.calls || 0) > 0).length
        };

        return (
            <div className="animate-in">
                <div className="stat-grid" style={{ marginBottom: '24px' }}>
                    <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #6366f1' }}>
                        <div className="flex-between">
                            <span className="stat-label">Total Messages</span>
                            <MessageCircle size={16} color="#6366f1" />
                        </div>
                        <div className="stat-value">{teamStats.totalChats.toLocaleString()}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>Current Period Detailed</div>
                    </div>
                    <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #a855f7' }}>
                        <div className="flex-between">
                            <span className="stat-label">Total Meetings</span>
                            <Video size={16} color="#a855f7" />
                        </div>
                        <div className="stat-value">{teamStats.totalMeetings.toLocaleString()}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #06b6d4' }}>
                        <div className="flex-between">
                            <span className="stat-label">Total Calls</span>
                            <Phone size={16} color="#06b6d4" />
                        </div>
                        <div className="stat-value">{teamStats.totalCalls.toLocaleString()}</div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
                    <div className="flex-between" style={{ marginBottom: '24px' }}>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Collaboration Activity Trend</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Daily chat and call activities over time</p>
                        </div>
                        <Activity size={20} color="var(--accent-blue)" />
                    </div>
                    {dailyCounts.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <AreaChart data={dailyCounts}>
                                <defs>
                                    <linearGradient id="colorPrivate" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorTeam" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" opacity={0.3} vertical={false} />
                                <XAxis
                                    dataKey="reportDate"
                                    stroke="var(--text-dim)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                />
                                <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend iconType="circle" />
                                <Area type="monotone" dataKey="privateChatMessages" name="Private Chat" stroke="#6366f1" fillOpacity={1} fill="url(#colorPrivate)" strokeWidth={2} />
                                <Area type="monotone" dataKey="teamChatMessages" name="Team Chat" stroke="#a855f7" fillOpacity={1} fill="url(#colorTeam)" strokeWidth={2} />
                                <Area type="monotone" dataKey="calls" name="Calls" stroke="#06b6d4" fillOpacity={1} fill="url(#colorCalls)" strokeWidth={2} strokeDasharray="4 4" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex-center" style={{ height: '350px', color: 'var(--text-dim)' }}>No trend data available.</div>
                    )}
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '20px' }}>Meeting Participation Trend</h3>
                    {dailyCounts.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={dailyCounts}>
                                <defs>
                                    <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" opacity={0.3} vertical={false} />
                                <XAxis
                                    dataKey="reportDate"
                                    stroke="var(--text-dim)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                />
                                <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="meetings" name="Meetings" stroke="#10b981" fillOpacity={1} fill="url(#colorMeetings)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex-center" style={{ height: '250px', color: 'var(--text-dim)' }}>No meeting data available.</div>
                    )}
                </div>
            </div>
        );
    };

    const renderExchangeDashboard = () => {
        const { detail, counts } = data.exchange;
        const latestDetail = detail || [];
        const dailyCounts = counts && counts.length > 0 ? counts : [];

        const exchangeStats = {
            totalSent: latestDetail.reduce((acc, curr) => acc + (curr.sendCount || 0), 0),
            totalReceived: latestDetail.reduce((acc, curr) => acc + (curr.receiveCount || 0), 0),
            totalRead: latestDetail.reduce((acc, curr) => acc + (curr.readCount || 0), 0),
        };

        return (
            <div className="animate-in">
                <div className="stat-grid" style={{ marginBottom: '24px' }}>
                    <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #3b82f6' }}>
                        <div className="flex-between">
                            <span className="stat-label">Emails Sent</span>
                            <Mail size={16} color="#3b82f6" />
                        </div>
                        <div className="stat-value">{exchangeStats.totalSent.toLocaleString()}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
                        <div className="flex-between">
                            <span className="stat-label">Emails Received</span>
                            <Mail size={16} color="#10b981" />
                        </div>
                        <div className="stat-value">{exchangeStats.totalReceived.toLocaleString()}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
                        <div className="flex-between">
                            <span className="stat-label">Total Read</span>
                            <Mail size={16} color="#f59e0b" />
                        </div>
                        <div className="stat-value">{exchangeStats.totalRead.toLocaleString()}</div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px' }}>Email Traffic Analytics</h3>

                    {dailyCounts.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <AreaChart data={dailyCounts}>
                                <defs>
                                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" opacity={0.3} vertical={false} />
                                <XAxis
                                    dataKey="reportDate"
                                    stroke="var(--text-dim)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                />
                                <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend iconType="circle" />
                                <Area type="monotone" dataKey="receiveCount" name="Received" stroke="#10b981" fillOpacity={1} fill="url(#colorReceived)" strokeWidth={2} />
                                <Area type="monotone" dataKey="sendCount" name="Sent" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSent)" strokeWidth={2} />
                                <Area type="monotone" dataKey="readCount" name="Read" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRead)" strokeWidth={2} strokeDasharray="4 4" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex-center" style={{ height: '350px', color: 'var(--text-dim)' }}>No trend data available.</div>
                    )}
                </div>
            </div>
        );
    };

    const renderSharePointDashboard = () => {
        const { detail, counts } = data.sharepoint;
        const latestDetail = detail || [];
        const dailyCounts = counts && counts.length > 0 ? counts : [];

        const spStats = {
            totalFiles: latestDetail.reduce((acc, curr) => acc + (curr.viewedOrEditedFileCount || 0), 0),
            totalSynced: latestDetail.reduce((acc, curr) => acc + (curr.syncedFileCount || 0), 0),
            totalShared: latestDetail.reduce((acc, curr) => acc + (curr.sharedInternalFileCount || 0) + (curr.sharedExternalFileCount || 0), 0),
        };

        return (
            <div className="animate-in">
                <div className="stat-grid" style={{ marginBottom: '24px' }}>
                    <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #0ea5e9' }}>
                        <div className="flex-between">
                            <span className="stat-label">Files Active</span>
                            <FileText size={16} color="#0ea5e9" />
                        </div>
                        <div className="stat-value">{spStats.totalFiles.toLocaleString()}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #14b8a6' }}>
                        <div className="flex-between">
                            <span className="stat-label">Files Synced</span>
                            <RefreshCw size={16} color="#14b8a6" />
                        </div>
                        <div className="stat-value">{spStats.totalSynced.toLocaleString()}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #f43f5e' }}>
                        <div className="flex-between">
                            <span className="stat-label">Files Shared</span>
                            <Share2 size={16} color="#f43f5e" />
                        </div>
                        <div className="stat-value">{spStats.totalShared.toLocaleString()}</div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px' }}>Content & Sync Dynamics</h3>
                    {dailyCounts.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <AreaChart data={dailyCounts}>
                                <defs>
                                    <linearGradient id="colorViewed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSynced" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" opacity={0.3} vertical={false} />
                                <XAxis
                                    dataKey="reportDate"
                                    stroke="var(--text-dim)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                />
                                <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend iconType="circle" />
                                <Area type="stepAfter" dataKey="viewedOrEditedFileCount" name="Viewed/Edited" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorViewed)" strokeWidth={2} />
                                <Area type="monotone" dataKey="syncedFileCount" name="Synced" stroke="#14b8a6" fillOpacity={1} fill="url(#colorSynced)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex-center" style={{ height: '400px', color: 'var(--text-dim)' }}>No trend data available.</div>
                    )}
                </div>
            </div>
        );
    };

    const renderOneDriveDashboard = () => {
        const { detail } = data.onedrive;
        const latestDetail = detail || [];

        const onedriveStats = {
            activeFiles: latestDetail.reduce((acc, curr) => acc + (parseInt(curr.activeFileCount) || 0), 0),
            storageUsedByte: latestDetail.reduce((acc, curr) => acc + (parseInt(curr.storageUsedInBytes) || 0), 0),
            sharedFiles: latestDetail.reduce((acc, curr) => acc + (parseInt(curr.sharedInternalFileCount) || 0) + (parseInt(curr.sharedExternalFileCount) || 0), 0),
        };

        const formatGB = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(2);

        return (
            <div className="animate-in">
                <div className="stat-grid" style={{ marginBottom: '24px' }}>
                    <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #0078d4' }}>
                        <div className="flex-between">
                            <span className="stat-label">Active Files</span>
                            <FileText size={16} color="#0078d4" />
                        </div>
                        <div className="stat-value">{onedriveStats.activeFiles.toLocaleString()}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #28a745' }}>
                        <div className="flex-between">
                            <span className="stat-label">Storage Used</span>
                            <Activity size={16} color="#28a745" />
                        </div>
                        <div className="stat-value">{formatGB(onedriveStats.storageUsedByte)} GB</div>
                    </div>
                    <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #ffc107' }}>
                        <div className="flex-between">
                            <span className="stat-label">Shared Files</span>
                            <Share2 size={16} color="#ffc107" />
                        </div>
                        <div className="stat-value">{onedriveStats.sharedFiles.toLocaleString()}</div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '24px' }}>OneDrive User Activity</h3>
                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Storage Used</th>
                                    <th>Last Activity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {latestDetail.slice(0, 50).map((u, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600 }}>{u.displayName || u.userPrincipalName}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--accent-green)' }}>
                                            {formatGB(u.storageUsedInBytes)} GB
                                        </td>
                                        <td>{u.lastActivityDate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <Loader3D showOverlay={true} />
        );
    }

    return (
        <div className="usage-reports-page">
            <header className="flex-between spacing-v-12">
                <div>
                    <a
                        href="https://admin.microsoft.com/Adminportal/Home#/reportsUsage"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                    >
                        <h1 className="title-gradient" style={{ fontSize: '28px', cursor: 'pointer' }}>M365 Usage Analytics</h1>
                    </a>
                    <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Monitor resource consumption across Microsoft 365 services.</p>
                </div>
                <div className="flex-gap-3">
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                            className="input flex-center"
                            style={{
                                padding: '8px 16px',
                                fontSize: '12px',
                                fontWeight: 600,
                                minWidth: '160px',
                                cursor: 'pointer',
                                justifyContent: 'space-between',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            {period === 'D7'
                                ? 'Last 7 days'
                                : period === 'D30'
                                    ? 'Last 30 days'
                                    : period === 'D90'
                                        ? 'Last 90 days'
                                        : period === 'D180'
                                            ? 'Last 180 days'
                                            : 'Last 90 days'}

                            {isPeriodDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        <AnimatePresence>
                            {isPeriodDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    className="glass-card"
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '4px',
                                        minWidth: '160px',
                                        zIndex: 100,
                                        padding: '4px',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {[
                                        { label: 'Last 7 days', value: 'D7' },
                                        { label: 'Last 30 days', value: 'D30' },
                                        { label: 'Last 90 days', value: 'D90' },
                                        { label: 'Last 180 days', value: 'D180' }
                                    ].map(opt => (
                                        <div
                                            key={opt.value}
                                            onClick={() => { setPeriod(opt.value); setIsPeriodDropdownOpen(false); }}
                                            style={{
                                                padding: '8px 12px',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                borderRadius: '6px',
                                                background: period === opt.value ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                                color: period === opt.value ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                                fontWeight: period === opt.value ? 700 : 500,
                                                marginBottom: '2px',
                                                textAlign: 'left'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (period !== opt.value) {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                    e.currentTarget.style.color = 'var(--text-primary)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (period !== opt.value) {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                                }
                                            }}
                                        >
                                            {opt.label}
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <button className={`sync-btn ${refreshing ? 'spinning' : ''}`} onClick={() => fetchData(true)} style={{ marginTop: '2px' }}>
                        <RefreshCw size={14} />
                    </button>
                </div>
            </header>

            <div className="tabs-container" style={{ marginBottom: '32px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1px' }}>
                <button
                    onClick={() => setActiveTab('teams')}
                    className={`tab-item ${activeTab === 'teams' ? 'active' : ''}`}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'teams' ? 'var(--accent-blue)' : 'var(--text-dim)',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        position: 'relative'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} />
                        Microsoft Teams
                    </div>
                    {activeTab === 'teams' && <motion.div layoutId="activeTab" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2.5px', background: 'var(--accent-blue)', borderRadius: '2px 2px 0 0' }} />}
                </button>
                <button
                    onClick={() => setActiveTab('exchange')}
                    className={`tab-item ${activeTab === 'exchange' ? 'active' : ''}`}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'exchange' ? 'var(--accent-blue)' : 'var(--text-dim)',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        position: 'relative'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={18} />
                        Exchange Online
                    </div>
                    {activeTab === 'exchange' && <motion.div layoutId="activeTab" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2.5px', background: 'var(--accent-blue)', borderRadius: '2px 2px 0 0' }} />}
                </button>
                <button
                    onClick={() => setActiveTab('sharepoint')}
                    className={`tab-item ${activeTab === 'sharepoint' ? 'active' : ''}`}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'sharepoint' ? 'var(--accent-blue)' : 'var(--text-dim)',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        position: 'relative'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe size={18} />
                        SharePoint
                    </div>
                    {activeTab === 'sharepoint' && <motion.div layoutId="activeTab" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2.5px', background: 'var(--accent-blue)', borderRadius: '2px 2px 0 0' }} />}
                </button>
                <button
                    onClick={() => setActiveTab('onedrive')}
                    className={`tab-item ${activeTab === 'onedrive' ? 'active' : ''}`}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'onedrive' ? 'var(--accent-blue)' : 'var(--text-dim)',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        position: 'relative'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={18} />
                        OneDrive
                    </div>
                    {activeTab === 'onedrive' && <motion.div layoutId="activeTab" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2.5px', background: 'var(--accent-blue)', borderRadius: '2px 2px 0 0' }} />}
                </button>
            </div>

            <main>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        {activeTab === 'teams' && renderTeamsDashboard()}
                        {activeTab === 'exchange' && renderExchangeDashboard()}
                        {activeTab === 'sharepoint' && renderSharePointDashboard()}
                        {activeTab === 'onedrive' && renderOneDriveDashboard()}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
};

export default UsageReports;
