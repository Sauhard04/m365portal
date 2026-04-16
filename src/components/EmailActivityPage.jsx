import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { UsageService } from '../services/usage.service';
import { ArrowLeft, Mail, Activity, Send, Inbox, TrendingUp, AlertCircle, Download } from 'lucide-react';
import Loader3D from './Loader3D';
import SiteDataStore from '../services/siteDataStore';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import DateRangePicker from './DateRangePicker';

const EmailActivityPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState('D7');
    const [dateRange, setDateRange] = useState({
        fromDate: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })(),
        toDate: new Date().toISOString().split('T')[0],
    });
    const [resolvedPeriodLabel, setResolvedPeriodLabel] = useState('Last 7 Days');

    const handleDateChange = ({ fromDate, toDate, period: newPeriod }) => {
        const resolved = newPeriod || 'D7';
        setPeriod(resolved);
        setDateRange({ fromDate, toDate });
        const labels = { D7: 'Last 7 Days', D30: 'Last 30 Days', D90: 'Last 90 Days', D180: 'Last 180 Days' };
        setResolvedPeriodLabel(labels[resolved] || resolved);
    };

    useEffect(() => {
        const fetchActivityData = async () => {
            if (!accounts || accounts.length === 0) return;
            setLoading(true);
            setError(null);
            try {
                const accessToken = await acquireToken({
                    scopes: ["Reports.Read.All"]
                });
                const service = new UsageService(accessToken);
                const result = await service.getExchangeUsage(period);

                if (result && result.detail && result.detail.length > 0) {
                    setActivity(result.detail);
                    SiteDataStore.store('emailActivity', {
                        detail: result.detail,
                        counts: result.counts,
                        lastSent: result.detail.reduce((acc, curr) => acc + (Number(curr.sendCount) || 0), 0),
                        lastReceived: result.detail.reduce((acc, curr) => acc + (Number(curr.receiveCount) || 0), 0)
                    }, { source: 'EmailActivityPage', period });
                } else {
                    setError(`No detailed email activity record found for this period.`);
                    setActivity([]);
                }
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Failed to synchronize with Microsoft Graph. Please verify administrative permissions.");
                setActivity([]);
            } finally {
                setLoading(false);
            }
        };
        fetchActivityData();
    }, [activeTenantId, period]);

    const stats = {
        sent: activity.reduce((acc, curr) => acc + (Number(curr.sendCount) || 0), 0),
        received: activity.reduce((acc, curr) => acc + (Number(curr.receiveCount) || 0), 0)
    };

    const downloadCsv = () => {
        const headers = ['User', 'Email', 'Sent', 'Received', 'Read', 'LastActive'];
        const rows = activity.map(r => [
            r.displayName || 'N/A',
            r.userPrincipalName,
            r.sendCount,
            r.receiveCount,
            r.readCount,
            r.lastActivityDate
        ].map(val => `"${val}"`).join(','));

        const content = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exchange_usage_report.csv`;
        a.click();
    };

    if (loading) {
        return (
            <Loader3D showOverlay={true} />
        );
    }

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <button onClick={() => navigate('/service/admin')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Dashboard
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 className="title-gradient" style={{ margin: 0, fontSize: '28px' }}>Email Flow Analytics</h1>
                    <p style={{ color: 'var(--text-dim)', margin: '4px 0 0 0' }}>Live communication telemetry from Microsoft Graph</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <DateRangePicker
                        fromDate={dateRange.fromDate}
                        toDate={dateRange.toDate}
                        mode="period"
                        label={resolvedPeriodLabel}
                        onChange={handleDateChange}
                    />
                    <button
                        onClick={downloadCsv}
                        disabled={activity.length === 0}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Download size={16} />
                        Export Report
                    </button>
                </div>
            </div>

            {error && (
                <div className="glass-card" style={{ padding: '16px', marginBottom: '24px', borderColor: 'var(--accent-error)', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-error)' }}>
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            <div className="stat-grid" style={{ marginBottom: '32px' }}>
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ color: 'var(--text-dim)', fontSize: '14px', fontWeight: 600 }}>Total Sent (7D)</span>
                        <Send size={18} color="var(--accent-purple)" />
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800 }}>{stats.sent.toLocaleString()}</div>
                    <div style={{ marginTop: '12px' }} className="badge badge-info">Outbound Traffic</div>
                </div>
                <div className="glass-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ color: 'var(--text-dim)', fontSize: '14px', fontWeight: 600 }}>Total Received (7D)</span>
                        <Inbox size={18} color="var(--accent-blue)" />
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 800 }}>{stats.received.toLocaleString()}</div>
                    <div style={{ marginTop: '12px' }} className="badge badge-success">Inbound Traffic</div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>Individual User Activity</h3>
                    <span className="badge badge-info">{activity.length} Users Tracked</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>User Profile</th>
                                <th style={{ textAlign: 'center' }}>Sent</th>
                                <th style={{ textAlign: 'center' }}>Received</th>
                                <th style={{ textAlign: 'center' }}>Read Rate</th>
                                <th>Last Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activity.length > 0 ? activity.map((u, i) => (
                                <tr key={i}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
                                                <Mail size={18} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{u.displayName || 'Unknown'}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{u.userPrincipalName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{u.sendCount}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{u.receiveCount}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '12px' }}>{u.readCount}</span>
                                            <div style={{ width: '60px', height: '4px', background: 'var(--progress-track)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', background: 'var(--accent-success)', width: `${Math.min(100, (u.readCount / (u.receiveCount || 1)) * 100)}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-dim)', fontSize: '13px' }}>{u.lastActivityDate}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
                                        No recent email activity detected.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EmailActivityPage;
