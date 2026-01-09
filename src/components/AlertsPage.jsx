import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, AlertTriangle, Info, AlertCircle, Filter,
    MoreHorizontal, CheckCircle2, Search, Calendar,
    ShieldAlert, Zap, ArrowLeft
} from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import AlertsService from '../services/alerts/alerts.service';

const AlertsPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        critical: 0,
        high: 0,
        unresolved: 0,
        resolved: 0
    });

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const accessToken = await instance.acquireTokenSilent({
                scopes: ['https://graph.microsoft.com/.default'],
                account: accounts[0]
            });

            const client = Client.init({
                authProvider: (done) => {
                    done(null, accessToken.accessToken);
                }
            });

            const alertsData = await AlertsService.getAllAlerts(client);
            setAlerts(alertsData);

            // Calculate statistics
            const alertStats = AlertsService.getAlertStats(alertsData);
            setStats(alertStats);
        } catch (error) {
            console.error('Error fetching alerts:', error);
            // Keep empty array if fetch fails
        } finally {
            setLoading(false);
        }
    };

    const getSeverityStyle = (severity) => {
        switch (severity) {
            case 'critical': return { color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' };
            case 'high': return { color: '#f97316', background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)' };
            case 'medium': return { color: '#eab308', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' };
            default: return { color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' };
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'resolved': return <span className="badge badge-success">Resolved</span>;
            case 'in-progress': return <span className="badge badge-warning">In Progress</span>;
            default: return <span className="badge badge-error">Unresolved</span>;
        }
    };

    const filteredAlerts = alerts.filter(alert => {
        const matchesFilter = filter === 'all' || alert.severity === filter;
        const matchesSearch = alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            alert.message.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-4">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '22px' }}>Security & Operational Alerts</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Monitor and manage critical system notifications</p>
                </div>
                <div className="flex-gap-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                    >
                        <ArrowLeft size={14} />
                        Back
                    </button>
                </div>
            </header>

            <div className="stat-grid" style={{ marginTop: '24px' }}>
                <div className="glass-card stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <div className="flex-between spacing-v-2">
                        <span className="stat-label">Critical Alerts</span>
                        <AlertCircle size={14} color="#ef4444" />
                    </div>
                    <div className="stat-value">{loading ? '-' : stats.critical}</div>
                </div>
                <div className="glass-card stat-card" style={{ borderLeft: '4px solid #f97316' }}>
                    <div className="flex-between spacing-v-2">
                        <span className="stat-label">High Severity</span>
                        <ShieldAlert size={14} color="#f97316" />
                    </div>
                    <div className="stat-value">{loading ? '-' : stats.high}</div>
                </div>
                <div className="glass-card stat-card" style={{ borderLeft: '4px solid #eab308' }}>
                    <div className="flex-between spacing-v-2">
                        <span className="stat-label">Unresolved</span>
                        <Zap size={14} color="#eab308" />
                    </div>
                    <div className="stat-value">{loading ? '-' : stats.unresolved}</div>
                </div>
                <div className="glass-card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="flex-between spacing-v-2">
                        <span className="stat-label">Resolved (24h)</span>
                        <CheckCircle2 size={14} color="#10b981" />
                    </div>
                    <div className="stat-value">{loading ? '-' : stats.resolved}</div>
                </div>
            </div>

            <div className="glass-card" style={{ marginTop: '24px', padding: '16px' }}>
                <div className="flex-between spacing-v-4" style={{ marginBottom: '16px' }}>
                    <div className="flex-center flex-gap-4">
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="text"
                                placeholder="Search alerts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    background: 'hsla(0, 0%, 100%, 0.05)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    padding: '8px 12px 8px 36px',
                                    fontSize: '12px',
                                    color: 'white',
                                    width: '280px'
                                }}
                            />
                        </div>
                        <div className="flex-center flex-gap-2">
                            {['all', 'critical', 'high', 'medium'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ padding: '4px 12px', fontSize: '10px', textTransform: 'capitalize' }}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Severity</th>
                                <th>Alert Details</th>
                                <th>Service</th>
                                <th>Timestamp</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                                        Loading alerts...
                                    </td>
                                </tr>
                            ) : filteredAlerts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                                        No alerts found
                                    </td>
                                </tr>
                            ) : (
                                filteredAlerts.map((alert) => (
                                    <tr key={alert.id}>
                                        <td>
                                            <span style={{
                                                ...getSeverityStyle(alert.severity),
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                textTransform: 'uppercase'
                                            }}>
                                                {alert.severity}
                                            </span>
                                        </td>
                                        <td>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12px' }}>{alert.title}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>{alert.message}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex-center justify-start flex-gap-2">
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-blue)' }}></div>
                                                <span style={{ fontSize: '11px' }}>{alert.service}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex-center justify-start flex-gap-2" style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                                                <Calendar size={12} />
                                                {alert.timestamp}
                                            </div>
                                        </td>
                                        <td>{getStatusBadge(alert.status)}</td>
                                        <td>
                                            <button className="btn-secondary" style={{ padding: '4px' }}>
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AlertsPage;
