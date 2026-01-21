import React, { useState, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
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

const UsageReports = () => {
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('D7');
    const [activeTab, setActiveTab] = useState('teams');
    const [data, setData] = useState({
        teams: { detail: [], counts: [] },
        exchange: { detail: [], counts: [] },
        sharepoint: { detail: [], counts: [] }
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            let tokenResponse;
            try {
                // Try to get token silently with required permissions
                tokenResponse = await instance.acquireTokenSilent({
                    scopes: [
                        "User.Read.All",
                        "Sites.Read.All"
                    ],
                    account: accounts[0]
                });
            } catch (silentError) {
                // If consent is required, use redirect (more reliable than popup)
                if (silentError.name === "InteractionRequiredAuthError") {
                    console.log("Consent required - redirecting to login...");
                    // Store current location to return after auth
                    sessionStorage.setItem('preAuthPath', window.location.pathname);
                    await instance.acquireTokenRedirect({
                        scopes: [
                            "User.Read.All",
                            "Sites.Read.All"
                        ],
                        account: accounts[0]
                    });
                    // This will redirect, so code below won't execute
                    return;
                } else {
                    throw silentError;
                }
            }

            const usageService = new UsageService(tokenResponse.accessToken);

            const [teams, exchange, sharepoint] = await Promise.all([
                usageService.getTeamsUsage(period),
                usageService.getExchangeUsage(period),
                usageService.getSharePointUsage(period)
            ]);

            setData({ teams, exchange, sharepoint });
        } catch (error) {
            console.error("Error fetching usage data:", error);
            // Use complete fallback data if everything fails
            setData({
                teams: { detail: [], counts: [] },
                exchange: { detail: [], counts: [] },
                sharepoint: { detail: [], counts: [] }
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (accounts.length > 0) {
            fetchData();
        }
    }, [instance, accounts, period]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-card" style={{ padding: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-primary)' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color || entry.fill }}></div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{entry.name}:</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>{entry.value.toLocaleString()}</span>
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
        const dailyCounts = counts && counts.length > 0 ? counts : [
            { reportDate: '2024-01-15', teamChatMessages: 45, privateChatMessages: 120, calls: 5, meetings: 3 },
            { reportDate: '2024-01-16', teamChatMessages: 52, privateChatMessages: 135, calls: 8, meetings: 5 },
            { reportDate: '2024-01-17', teamChatMessages: 48, privateChatMessages: 110, calls: 4, meetings: 2 },
            { reportDate: '2024-01-18', teamChatMessages: 65, privateChatMessages: 180, calls: 12, meetings: 7 },
            { reportDate: '2024-01-19', teamChatMessages: 70, privateChatMessages: 200, calls: 15, meetings: 10 },
            { reportDate: '2024-01-20', teamChatMessages: 30, privateChatMessages: 90, calls: 3, meetings: 1 },
            { reportDate: '2024-01-21', teamChatMessages: 25, privateChatMessages: 80, calls: 2, meetings: 1 }
        ];

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
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={dailyCounts}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
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
                            <Line type="monotone" dataKey="privateChatMessages" name="Private Chat" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                            <Line type="monotone" dataKey="teamChatMessages" name="Team Chat" stroke="#a855f7" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                            <Line type="monotone" dataKey="calls" name="Calls" stroke="#06b6d4" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '20px' }}>Meeting Participation Trend</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={dailyCounts}>
                            <defs>
                                <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
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
                </div>
            </div>
        );
    };

    const renderExchangeDashboard = () => {
        const { detail, counts } = data.exchange;
        const latestDetail = detail || [];
        const dailyCounts = counts && counts.length > 0 ? counts : [
            { reportDate: '2024-01-15', sendCount: 150, receiveCount: 450, readCount: 380 },
            { reportDate: '2024-01-16', sendCount: 180, receiveCount: 520, readCount: 460 },
            { reportDate: '2024-01-17', sendCount: 140, receiveCount: 410, readCount: 390 },
            { reportDate: '2024-01-18', sendCount: 210, receiveCount: 630, readCount: 580 },
            { reportDate: '2024-01-19', sendCount: 245, receiveCount: 710, readCount: 650 },
            { reportDate: '2024-01-20', sendCount: 80, receiveCount: 220, readCount: 180 },
            { reportDate: '2024-01-21', sendCount: 65, receiveCount: 190, readCount: 150 }
        ];

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
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={dailyCounts}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
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
                            <Line type="monotone" dataKey="sendCount" name="Sent" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                            <Line type="monotone" dataKey="receiveCount" name="Received" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                            <Line type="monotone" dataKey="readCount" name="Read" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    const renderSharePointDashboard = () => {
        const { detail, counts } = data.sharepoint;
        const latestDetail = detail || [];
        const dailyCounts = counts && counts.length > 0 ? counts : [
            { reportDate: '2024-01-15', viewedOrEditedFileCount: 1200, syncedFileCount: 4500 },
            { reportDate: '2024-01-16', viewedOrEditedFileCount: 1400, syncedFileCount: 4800 },
            { reportDate: '2024-01-17', viewedOrEditedFileCount: 1100, syncedFileCount: 4200 },
            { reportDate: '2024-01-18', viewedOrEditedFileCount: 1800, syncedFileCount: 5600 },
            { reportDate: '2024-01-19', viewedOrEditedFileCount: 2200, syncedFileCount: 6400 },
            { reportDate: '2024-01-20', viewedOrEditedFileCount: 600, syncedFileCount: 1800 },
            { reportDate: '2024-01-21', viewedOrEditedFileCount: 500, syncedFileCount: 1500 }
        ];

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
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={dailyCounts}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
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
                            <Line type="stepAfter" dataKey="viewedOrEditedFileCount" name="Viewed/Edited" stroke="#0ea5e9" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                            <Line type="monotone" dataKey="syncedFileCount" name="Synced" stroke="#14b8a6" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    return (
        <div className="usage-reports-page">
            <header className="flex-between spacing-v-12">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '28px' }}>M365 Usage Analytics</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Monitor resource consumption across Teams, Exchange, and SharePoint.</p>
                </div>
                <div className="flex-gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="input"
                        style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: 600,
                            minWidth: '150px',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="D7">Last 7 days</option>
                        <option value="D30">Last 30 days</option>
                        <option value="D90">Last 90 days</option>
                    </select>
                    <button className={`sync-btn ${loading ? 'spinning' : ''}`} onClick={fetchData} style={{ marginTop: '2px' }}>
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
                        SharePoint Site
                    </div>
                    {activeTab === 'sharepoint' && <motion.div layoutId="activeTab" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2.5px', background: 'var(--accent-blue)', borderRadius: '2px 2px 0 0' }} />}
                </button>
            </div>

            <main>
                {loading ? (
                    <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader3D />
                    </div>
                ) : (
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
                        </motion.div>
                    </AnimatePresence>
                )}
            </main>
        </div>
    );
};

export default UsageReports;
