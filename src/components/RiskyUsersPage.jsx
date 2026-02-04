import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { motion } from 'framer-motion';
import { loginRequest } from '../authConfig';
import { SecurityService } from '../services/security/security.service';
import AnimatedTile from './AnimatedTile';
import Loader3D from './Loader3D';
import {
    UserX, ArrowLeft, RefreshCw, Filter, Search,
    AlertTriangle, Shield, Activity, ChevronRight, FileWarning
} from 'lucide-react';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
    BarChart, Bar, XAxis, YAxis
} from 'recharts';

const RiskyUsersPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [users, setUsers] = useState([]);
    const [riskDetections, setRiskDetections] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [riskFilter, setRiskFilter] = useState('all');

    const fetchData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const account = accounts[0];
            if (!account) throw new Error('No account found');

            const tokenResponse = await instance.acquireTokenSilent({
                ...loginRequest,
                account
            });

            const client = Client.init({
                authProvider: (done) => done(null, tokenResponse.accessToken)
            });

            const [riskyUsersData, detectionsData] = await Promise.all([
                SecurityService.getRiskyUsers(client),
                SecurityService.getRiskDetections(client, 50)
            ]);

            setUsers(riskyUsersData);
            setRiskDetections(detectionsData);
            setFilteredUsers(riskyUsersData);
        } catch (err) {
            console.error('Failed to fetch security data:', err);
        } finally {
            if (isManual) {
                setTimeout(() => setRefreshing(false), 1000);
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
    }, [instance, accounts]);

    useEffect(() => {
        let filtered = users;

        if (riskFilter !== 'all') {
            filtered = filtered.filter(u => u.riskLevel?.toLowerCase() === riskFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(u =>
                u.userDisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.userPrincipalName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredUsers(filtered);
    }, [users, riskFilter, searchTerm]);

    const getRiskLevelColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#22c55e';
            case 'none': return '#3b82f6';
            default: return '#6b7280';
        }
    };

    const getRiskStateColor = (state) => {
        switch (state?.toLowerCase()) {
            case 'atrisk': return '#ef4444';
            case 'confirmedcompromised': return '#dc2626';
            case 'remediated': return '#22c55e';
            case 'dismissed': return '#6b7280';
            default: return '#6b7280';
        }
    };

    // Use a more comprehensive breakdown for the Pie Chart
    const riskLevelData = [
        { name: 'High', value: users.filter(u => u.riskLevel?.toLowerCase() === 'high').length, color: '#ef4444' },
        { name: 'Medium', value: users.filter(u => u.riskLevel?.toLowerCase() === 'medium').length, color: '#f59e0b' },
        { name: 'Low', value: users.filter(u => u.riskLevel?.toLowerCase() === 'low').length, color: '#22c55e' },
        { name: 'None/Remediated', value: users.filter(u => !['high', 'medium', 'low'].includes(u.riskLevel?.toLowerCase())).length, color: '#3b82f6' }
    ].filter(d => d.value > 0);

    const riskStateData = [
        { name: 'At Risk', value: users.filter(u => u.riskState?.toLowerCase() === 'atrisk').length, color: '#ef4444' },
        { name: 'Remediated', value: users.filter(u => u.riskState?.toLowerCase() === 'remediated').length, color: '#22c55e' },
        { name: 'Dismissed', value: users.filter(u => u.riskState?.toLowerCase() === 'dismissed').length, color: '#6b7280' }
    ].filter(d => d.value > 0);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="recharts-custom-tooltip">
                    <p style={{ margin: 0, fontWeight: 700 }}>{payload[0].name}</p>
                    <p style={{ margin: 0, opacity: 0.8 }}>{`Users: ${payload[0].value}`}</p>
                </div>
            );
        }
        return null;
    };

    // Internal Stat Component for AnimatedTile children
    const StatContent = ({ title, value, icon: Icon, color, description }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: `${color}20`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: color
            }}>
                <Icon size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
                <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.2' }}>{value}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>{description}</span>
            </div>
        </div>
    );

    if (loading) return <Loader3D showOverlay={true} text="Scanning for risky accounts..." />;

    return (
        <div className="animate-in">
            {/* Header */}
            <header className="flex-between spacing-v-8">
                <div className="flex-gap-4">
                    <button className="btn-back" onClick={() => navigate('/service/security')} style={{ marginBottom: 0 }}>
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="title-gradient" style={{ fontSize: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <UserX size={28} style={{ color: '#a855f7' }} />
                            Risky Users
                        </h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
                            Identity protection telemetry and risk assessment
                        </p>
                    </div>
                </div>
                <button
                    className={`sync-btn ${refreshing ? 'spinning' : ''}`}
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                >
                    <RefreshCw size={16} />
                </button>
            </header>

            {/* Stats Row */}
            <div className="stat-grid">
                <AnimatedTile index={0} accentColor="#a855f7">
                    <StatContent
                        title="Total Risky Users"
                        value={users.length}
                        icon={UserX}
                        color="#a855f7"
                        description="Identities flagged for risk"
                    />
                </AnimatedTile>
                <AnimatedTile index={1} accentColor="#ef4444">
                    <StatContent
                        title="High Risk"
                        value={users.filter(u => u.riskLevel?.toLowerCase() === 'high').length}
                        icon={AlertTriangle}
                        color="#ef4444"
                        description="Immediate action required"
                    />
                </AnimatedTile>
                <AnimatedTile index={2} accentColor="#f59e0b">
                    <StatContent
                        title="Medium Risk"
                        value={users.filter(u => u.riskLevel?.toLowerCase() === 'medium').length}
                        icon={Activity}
                        color="#f59e0b"
                        description="Potentially compromised"
                    />
                </AnimatedTile>
                <AnimatedTile index={3} accentColor="#3b82f6">
                    <StatContent
                        title="Risk Detections"
                        value={riskDetections.length}
                        icon={FileWarning}
                        color="#3b82f6"
                        description="Recent security events"
                    />
                </AnimatedTile>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
                    <h3 className="flex-gap-2" style={{ fontSize: '14px', marginBottom: '20px' }}>
                        <Activity size={16} style={{ color: 'var(--accent-blue)' }} />
                        Risk Level Distribution
                    </h3>
                    <div style={{ height: '250px' }}>
                        {riskLevelData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={riskLevelData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {riskLevelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex-center" style={{ height: '100%', color: 'var(--text-dim)' }}>No risk data available</div>
                        )}
                    </div>
                    <div className="flex-center flex-gap-4" style={{ marginTop: '12px', flexWrap: 'wrap' }}>
                        {riskLevelData.map((item, idx) => (
                            <div key={idx} className="flex-gap-2" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                                {item.name}: {item.value}
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
                    <h3 className="flex-gap-2" style={{ fontSize: '14px', marginBottom: '20px' }}>
                        <Shield size={16} style={{ color: 'var(--accent-success)' }} />
                        Risk States
                    </h3>
                    <div style={{ height: '250px' }}>
                        {riskStateData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={riskStateData}>
                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {riskStateData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex-center" style={{ height: '100%', color: 'var(--text-dim)' }}>No state data available</div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Filters & Table */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px', display: 'flex', gap: '16px', borderBottom: '1px solid var(--glass-border)', background: 'hsla(0, 0%, 100%, 0.01)', flexWrap: 'wrap' }}>
                    <div className="search-wrapper" style={{ minWidth: '300px' }}>
                        <Search className="search-icon" size={16} />
                        <input
                            type="text"
                            className="input search-input"
                            placeholder="Search by name or UPN..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ width: '200px' }}>
                        <select
                            className="input"
                            value={riskFilter}
                            onChange={(e) => setRiskFilter(e.target.value)}
                        >
                            <option value="all">All Risk Levels</option>
                            <option value="high">High Risk</option>
                            <option value="medium">Medium Risk</option>
                            <option value="low">Low Risk</option>
                        </select>
                    </div>
                </div>

                <div className="table-container" style={{ borderRadius: '0', border: 'none' }}>
                    {filteredUsers.length > 0 ? (
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>User Identity</th>
                                    <th>Risk Level</th>
                                    <th>Risk State</th>
                                    <th>Latest Detail</th>
                                    <th>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user, idx) => (
                                    <tr key={user.id || idx}>
                                        <td style={{ minWidth: '250px' }}>
                                            <div className="flex-gap-3">
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${getRiskLevelColor(user.riskLevel)}, #6366f1)`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: '700', color: 'white', fontSize: '13px'
                                                }}>
                                                    {(user.userDisplayName || user.userPrincipalName || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{user.userDisplayName || 'Unknown Member'}</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{user.userPrincipalName}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge" style={{
                                                background: `${getRiskLevelColor(user.riskLevel)}15`,
                                                color: getRiskLevelColor(user.riskLevel),
                                                borderColor: `${getRiskLevelColor(user.riskLevel)}30`
                                            }}>
                                                {user.riskLevel || 'Unknown'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge" style={{
                                                background: `${getRiskStateColor(user.riskState)}15`,
                                                color: getRiskStateColor(user.riskState),
                                                borderColor: `${getRiskStateColor(user.riskState)}30`
                                            }}>
                                                {user.riskState || 'No State'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                                            {user.riskDetail || 'No granular telemetry available'}
                                        </td>
                                        <td>
                                            {user.riskLastUpdatedDateTime ? new Date(user.riskLastUpdatedDateTime).toLocaleDateString(undefined, {
                                                month: 'short', day: 'numeric', year: 'numeric'
                                            }) : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex-center" style={{ padding: '80px', flexDirection: 'column', gap: '16px' }}>
                            <Shield size={48} style={{ color: 'var(--accent-success)', opacity: 0.2 }} />
                            <p style={{ color: 'var(--text-dim)' }}>No risky users identified in the current telemetry window.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Risk Detections */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card"
                style={{ marginTop: '24px', padding: '0' }}
            >
                <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)' }}>
                    <h3 className="flex-gap-2" style={{ fontSize: '14px' }}>
                        <FileWarning size={16} style={{ color: '#ef4444' }} />
                        Recent Discovery Logs
                    </h3>
                </div>
                <div className="table-container" style={{ borderRadius: '0', border: 'none' }}>
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Event Type</th>
                                <th>Risk Level</th>
                                <th>Target User</th>
                                <th>Detected Date</th>
                                <th>Correlation ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {riskDetections.length > 0 ? riskDetections.map((detection, idx) => (
                                <tr key={idx}>
                                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{detection.riskEventType}</td>
                                    <td>
                                        <span className={`badge badge-${detection.riskLevel?.toLowerCase() || 'unknown'}`}>
                                            {detection.riskLevel}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '11px' }}>{detection.userPrincipalName}</td>
                                    <td>{detection.detectedDateTime ? new Date(detection.detectedDateTime).toLocaleString() : 'N/A'}</td>
                                    <td style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                                        {detection.id?.slice(0, 12)}...
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5">
                                        <div className="flex-center" style={{ padding: '40px', color: 'var(--text-dim)' }}>No recent discovery logs available.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default RiskyUsersPage;
