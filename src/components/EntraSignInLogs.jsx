import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { ArrowLeft, Search, Download, CheckCircle2, XCircle, LogIn, MapPin, Globe, Monitor, Calendar, AlertTriangle, Shield } from 'lucide-react';
import Loader3D from './Loader3D';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';

const EntraSignInLogs = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [signIns, setSignIns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterText, setFilterText] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterApp, setFilterApp] = useState('all');
    const [apps, setApps] = useState([]);

    useEffect(() => {
        fetchSignInLogs();
    }, [activeTenantId]);

    const fetchSignInLogs = async () => {
        if (accounts.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            const accessToken = await acquireToken({
                ...loginRequest
            });
            const client = new GraphService(accessToken).client;

            // Fetch sign-in logs
            const signInsResponse = await client.api('/auditLogs/signIns')
                .select('id,userDisplayName,userPrincipalName,createdDateTime,status,ipAddress,location,clientAppUsed,appDisplayName,deviceDetail,riskState,conditionalAccessStatus')
                .top(200)
                .orderby('createdDateTime desc')
                .get();

            const logs = signInsResponse.value || [];
            setSignIns(logs);

            // Extract unique apps for filter
            const uniqueApps = [...new Set(logs.map(s => s.appDisplayName).filter(Boolean))];
            setApps(uniqueApps);
        } catch (err) {
            console.error('Error fetching sign-in logs:', err);
            if (err.message?.includes('AuditLog.Read.All') || err.message?.includes('403') || err.message?.includes('not authorized')) {
                setError('permission');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        if (!status) return { text: 'Unknown', class: 'badge' };
        if (status.errorCode === 0) {
            return { text: 'Success', class: 'badge badge-success' };
        }
        return { text: 'Failed', class: 'badge badge-error' };
    };

    const getRiskBadge = (riskState) => {
        switch (riskState?.toLowerCase()) {
            case 'atrisk':
                return { text: 'At Risk', class: 'badge badge-error' };
            case 'confirmedcompromised':
                return { text: 'Compromised', class: 'badge badge-error' };
            case 'dismissedsafe':
            case 'none':
                return { text: 'None', class: 'badge' };
            default:
                return { text: riskState || 'None', class: 'badge' };
        }
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatLocation = (location) => {
        if (!location) return 'Unknown';
        const parts = [];
        if (location.city) parts.push(location.city);
        if (location.countryOrRegion) parts.push(location.countryOrRegion);
        return parts.length > 0 ? parts.join(', ') : 'Unknown';
    };

    const filteredSignIns = signIns.filter(signIn => {
        const matchesText =
            (signIn.userDisplayName || '').toLowerCase().includes(filterText.toLowerCase()) ||
            (signIn.userPrincipalName || '').toLowerCase().includes(filterText.toLowerCase()) ||
            (signIn.ipAddress || '').includes(filterText);

        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'success' && signIn.status?.errorCode === 0) ||
            (filterStatus === 'failed' && signIn.status?.errorCode !== 0);

        const matchesApp = filterApp === 'all' || signIn.appDisplayName === filterApp;

        return matchesText && matchesStatus && matchesApp;
    });

    const handleDownloadCSV = () => {
        const headers = ['User', 'Email', 'Date/Time', 'Status', 'App', 'IP Address', 'Location', 'Client App', 'Risk State'];
        const rows = filteredSignIns.map(s => [
            `"${s.userDisplayName || ''}"`,
            `"${s.userPrincipalName || ''}"`,
            `"${s.createdDateTime || ''}"`,
            s.status?.errorCode === 0 ? 'Success' : 'Failed',
            `"${s.appDisplayName || ''}"`,
            `"${s.ipAddress || ''}"`,
            `"${formatLocation(s.location)}"`,
            `"${s.clientAppUsed || ''}"`,
            `"${s.riskState || 'none'}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'signin_logs.csv';
        link.click();
    };

    // Stats calculations
    const successCount = signIns.filter(s => s.status?.errorCode === 0).length;
    const failedCount = signIns.filter(s => s.status?.errorCode !== 0).length;
    const uniqueUsers = new Set(signIns.map(s => s.userPrincipalName)).size;
    const uniqueLocations = new Set(signIns.map(s => formatLocation(s.location))).size;

    if (loading) {
        return (
            <Loader3D showOverlay={true} />
        );
    }

    if (error === 'permission') {
        return (
            <div className="animate-in">
                <button onClick={() => navigate('/service/entra')} className="btn-back">
                    <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                    Back to Dashboard
                </button>

                <header className="flex-between spacing-v-8" style={{ marginBottom: '24px' }}>
                    <div>
                        <h1 className="title-gradient" style={{ fontSize: '32px' }}>Sign-In Logs</h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>User authentication activity and security events</p>
                    </div>
                </header>

                <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
                    <Shield size={64} style={{ color: '#f59e0b', marginBottom: '24px', opacity: 0.7 }} />
                    <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Additional Permissions Required</h2>
                    <p style={{ color: 'var(--text-dim)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
                        Sign-in logs require Azure AD Premium P1/P2 license and the following API permissions:
                    </p>
                    <div style={{
                        background: 'var(--bg-secondary)',
                        padding: '16px 24px',
                        borderRadius: '8px',
                        display: 'inline-block',
                        textAlign: 'left',
                        marginBottom: '24px'
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: '8px' }}>Required Scopes:</div>
                        <code style={{ color: 'var(--accent-blue)' }}>• AuditLog.Read.All</code><br />
                        <code style={{ color: 'var(--accent-blue)' }}>• Directory.Read.All</code>
                    </div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                        Please contact your Azure AD administrator to grant these permissions.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in">
            <button onClick={() => navigate('/service/entra')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Dashboard
            </button>

            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Sign-In Logs</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>User authentication activity and security events</p>
                </div>
                <button className="btn btn-primary" onClick={handleDownloadCSV} disabled={filteredSignIns.length === 0}>
                    <Download size={16} />
                    Export Logs
                </button>
            </header>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-success)', marginBottom: '4px' }}>{successCount}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Successful Sign-ins</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-error)', marginBottom: '4px' }}>{failedCount}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Failed Sign-ins</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '4px' }}>{uniqueUsers}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Unique Users</div>
                </div>
                <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-purple)', marginBottom: '4px' }}>{uniqueLocations}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Locations</div>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card" style={{ marginBottom: '24px', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="search-wrapper">
                        <input
                            type="text"
                            className="input search-input"
                            placeholder="Search by name, email, or IP..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                        <Search size={18} className="search-icon" />
                    </div>
                    <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="success">Success Only</option>
                        <option value="failed">Failed Only</option>
                    </select>
                    <select className="input" value={filterApp} onChange={(e) => setFilterApp(e.target.value)}>
                        <option value="all">All Applications</option>
                        {apps.map((app, i) => (
                            <option key={i} value={app}>{app}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Sign-in logs table */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Date/Time</th>
                                <th>Status</th>
                                <th>Application</th>
                                <th>Location</th>
                                <th>IP Address</th>
                                <th>Client</th>
                                <th>Risk</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSignIns.length > 0 ? filteredSignIns.map((signIn, i) => {
                                const statusBadge = getStatusBadge(signIn.status);
                                const riskBadge = getRiskBadge(signIn.riskState);

                                return (
                                    <tr key={i}>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 600, fontSize: '13px' }}>{signIn.userDisplayName || 'Unknown'}</span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{signIn.userPrincipalName}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                                <Calendar size={12} style={{ color: 'var(--text-dim)' }} />
                                                {formatDateTime(signIn.createdDateTime)}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={statusBadge.class}>
                                                {statusBadge.text === 'Success' ? (
                                                    <CheckCircle2 size={12} style={{ marginRight: '4px' }} />
                                                ) : (
                                                    <XCircle size={12} style={{ marginRight: '4px' }} />
                                                )}
                                                {statusBadge.text}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '12px' }}>{signIn.appDisplayName || 'N/A'}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                                <MapPin size={12} style={{ color: 'var(--text-dim)' }} />
                                                {formatLocation(signIn.location)}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: 'monospace' }}>
                                                <Globe size={12} style={{ color: 'var(--text-dim)' }} />
                                                {signIn.ipAddress || 'N/A'}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                                                <Monitor size={12} style={{ color: 'var(--text-dim)' }} />
                                                {signIn.clientAppUsed || 'N/A'}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={riskBadge.class} style={{ fontSize: '11px' }}>
                                                {riskBadge.text !== 'None' && <AlertTriangle size={10} style={{ marginRight: '4px' }} />}
                                                {riskBadge.text}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '80px', color: 'var(--text-dim)' }}>
                                        <LogIn size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                                        <p>No sign-in logs found matching your filters.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)' }}>
                Showing {filteredSignIns.length} of {signIns.length} sign-in events
            </div>
        </div>
    );
};

export default EntraSignInLogs;
