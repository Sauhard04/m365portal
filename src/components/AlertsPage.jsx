import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, AlertTriangle, Info, AlertCircle, Filter,
    CheckCircle2, Search, Calendar,
    ShieldAlert, Zap, ArrowLeft, ChevronDown, ChevronRight, RefreshCw
} from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import AlertsService from '../services/alerts/alerts.service';
import Loader3D from './Loader3D';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';

const AlertsPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
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
    const [refreshing, setRefreshing] = useState(false);
    const [expandedAlert, setExpandedAlert] = useState(null);

    useEffect(() => {
        fetchAlerts();
    }, [activeTenantId]);

    const fetchAlerts = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        const startTime = Date.now();
        try {
            const accessToken = await acquireToken({
                scopes: ['https://graph.microsoft.com/.default']
            });

            const client = Client.init({
                authProvider: (done) => {
                    done(null, accessToken);
                }
            });

            const alertsData = await AlertsService.getAllAlerts(client);
            setAlerts(alertsData);

            // Calculate statistics
            const alertStats = AlertsService.getAlertStats(alertsData);
            setStats(alertStats);

            // Background store for AI context
            const SiteDataStore = (await import('../services/siteDataStore')).default;
            SiteDataStore.store('alerts', alertsData);
        } catch (error) {
            console.error('Error fetching alerts:', error);
            // Keep empty array if fetch fails
        } finally {
            if (isManual) {
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, 1000 - elapsedTime);
                setTimeout(() => setRefreshing(false), remainingTime);
            } else {
                setLoading(false);
                setRefreshing(false);
            }
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

    if (loading) {
        return (
            <Loader3D showOverlay={true} text="Loading Alerts..." />
        );
    }

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-4">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '22px' }}>Security & Operational Alerts</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Monitor and manage critical system notifications</p>
                </div>
                <div className="flex-gap-2">
                    <button
                        className={`sync-btn ${refreshing ? 'spinning' : ''}`}
                        onClick={() => fetchAlerts(true)}
                        title="Sync & Refresh"
                    >
                        <RefreshCw size={14} />
                    </button>
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
                    <div className="stat-value">{stats.critical}</div>
                </div>
                <div className="glass-card stat-card" style={{ borderLeft: '4px solid #f97316' }}>
                    <div className="flex-between spacing-v-2">
                        <span className="stat-label">High Severity</span>
                        <ShieldAlert size={14} color="#f97316" />
                    </div>
                    <div className="stat-value">{stats.high}</div>
                </div>
                <div className="glass-card stat-card" style={{ borderLeft: '4px solid #eab308' }}>
                    <div className="flex-between spacing-v-2">
                        <span className="stat-label">Unresolved</span>
                        <Zap size={14} color="#eab308" />
                    </div>
                    <div className="stat-value">{stats.unresolved}</div>
                </div>
                <div className="glass-card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="flex-between spacing-v-2">
                        <span className="stat-label">Resolved (24h)</span>
                        <CheckCircle2 size={14} color="#10b981" />
                    </div>
                    <div className="stat-value">{stats.resolved}</div>
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
                                    background: 'var(--glass-bg)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    padding: '8px 12px 8px 36px',
                                    fontSize: '12px',
                                    color: 'var(--text-primary)',
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
                                <th style={{ width: '40px' }}></th>
                                <th>Severity</th>
                                <th>Alert Details</th>
                                <th>Service</th>
                                <th>Timestamp</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAlerts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                                        No alerts found
                                    </td>
                                </tr>
                            ) : (
                                filteredAlerts.map((alert) => (
                                    <React.Fragment key={alert.id}>
                                        <tr
                                            onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                {expandedAlert === alert.id ?
                                                    <ChevronDown size={14} style={{ color: 'var(--text-dim)' }} /> :
                                                    <ChevronRight size={14} style={{ color: 'var(--text-dim)' }} />
                                                }
                                            </td>
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
                                        </tr>
                                        {expandedAlert === alert.id && (
                                            <tr>
                                                <td colSpan="6" style={{ background: 'hsla(0, 0%, 100%, 0.02)', padding: '20px', borderTop: '1px solid var(--glass-border)' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '12px' }}>
                                                        <div style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Alert ID:</div>
                                                        <div style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '11px' }}>{alert.id}</div>

                                                        <div style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Category:</div>
                                                        <div style={{ color: 'var(--text-primary)' }}>{alert.category || 'N/A'}</div>

                                                        <div style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Service:</div>
                                                        <div style={{ color: 'var(--text-primary)' }}>{alert.service}</div>

                                                        <div style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Full Message:</div>
                                                        <div style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}>{alert.message}</div>

                                                        <div style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Timestamp:</div>
                                                        <div style={{ color: 'var(--text-primary)' }}>{alert.timestamp}</div>

                                                        <div style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Status:</div>
                                                        <div>{getStatusBadge(alert.status)}</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
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
