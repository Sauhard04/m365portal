import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Activity, Send, Inbox, TrendingUp, Loader2, AlertCircle, Download } from 'lucide-react';

const EmailActivityPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchActivity = async () => {
            if (accounts.length === 0) return;
            try {
                const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                const graphService = new GraphService(response.accessToken);
                const data = await graphService.getEmailActivityUserDetail('D7');
                setActivity(data || []);
            } catch (err) {
                setError("Email interaction telemetry could not be synchronized.");
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, [instance, accounts]);

    const totalSent = activity.reduce((acc, curr) => acc + (parseInt(curr.sendCount) || 0), 0);
    const totalReceived = activity.reduce((acc, curr) => acc + (parseInt(curr.receiveCount) || 0), 0);

    const handleExport = () => {
        const headers = ['User Principal Name', 'Display Name', 'Send Count', 'Receive Count', 'Read Count', 'Last Activity Date'];
        const csvRows = activity.map(r => [
            `"${r.userPrincipalName}"`, `"${r.displayName}"`, r.sendCount, r.receiveCount, r.readCount, r.lastActivityDate
        ].join(','));
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'email_activity_7d.csv';
        link.click();
    };

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--accent-purple)" />
            </div>
        );
    }

    return (
        <div className="animate-in">
            <button onClick={() => navigate('/service/admin')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Dashboard
            </button>

            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Email Flow Analytics</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Seven-day interaction volume and communication auditing</p>
                </div>
                <button className="btn btn-primary" onClick={handleExport}>
                    <Download size={16} />
                    Export Communications
                </button>
            </header>

            {error && (
                <div className="glass-card" style={{ background: 'hsla(0, 84%, 60%, 0.05)', borderColor: 'hsla(0, 84%, 60%, 0.2)', marginBottom: '32px' }}>
                    <div className="flex-center justify-start flex-gap-4" style={{ color: 'var(--accent-error)' }}>
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            <div className="stat-grid">
                <div className="glass-card stat-card">
                    <div className="flex-between spacing-v-4">
                        <span className="stat-label">Aggregated Sent (7d)</span>
                        <Send size={18} color="var(--accent-purple)" />
                    </div>
                    <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>{totalSent.toLocaleString()}</div>
                    <div className="flex-between mt-4" style={{ marginTop: '16px' }}>
                        <span className="badge badge-info">Tenant Outbound</span>
                        <TrendingUp size={12} color="var(--text-dim)" />
                    </div>
                </div>
                <div className="glass-card stat-card">
                    <div className="flex-between spacing-v-4">
                        <span className="stat-label">Aggregated Received (7d)</span>
                        <Inbox size={18} color="var(--accent-blue)" />
                    </div>
                    <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{totalReceived.toLocaleString()}</div>
                    <div className="flex-between mt-4" style={{ marginTop: '16px' }}>
                        <span className="badge badge-success">Tenant Inbound</span>
                        <Activity size={12} color="var(--text-dim)" />
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="p-8 flex-between" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px' }}>Individual Subject Interaction</h3>
                    <span className="badge badge-info">{activity.length} ACTIVE SUBJECTS</span>
                </div>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Subject Identity</th>
                                <th style={{ textAlign: 'center' }}>Outbound</th>
                                <th style={{ textAlign: 'center' }}>Inbound</th>
                                <th style={{ textAlign: 'center' }}>Engagement (Read)</th>
                                <th>Report Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activity.length > 0 ? activity.map((item, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className="flex-center justify-start flex-gap-4">
                                            <div style={{ padding: '8px', background: 'hsla(var(--hue), 90%, 60%, 0.1)', color: 'var(--accent-purple)', borderRadius: '8px' }}>
                                                <Mail size={16} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{item.displayName || 'Unknown'}</div>
                                                <div style={{ fontSize: '11px', opacity: 0.5 }}>{item.userPrincipalName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.sendCount}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.receiveCount}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div className="flex-center" style={{ gap: '8px' }}>
                                            <span style={{ fontSize: '12px' }}>{item.readCount}</span>
                                            <div style={{ width: '60px', height: '4px', background: 'hsla(0,0%,100%,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${Math.min((item.readCount / Math.max(item.receiveCount || 1, 1)) * 100, 100)}%`, background: 'var(--accent-success)' }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{item.reportRefreshDate || '-'}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <Mail size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <p>No communication activity recorded in this period.</p>
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
