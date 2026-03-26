import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { ArrowLeft, Search, Download, Box, RefreshCw, Shield, Globe, Calendar } from 'lucide-react';
import Loader3D from './Loader3D';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';

const EntraEnterpriseApps = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        fetchApps();
    }, [activeTenantId]);

    const fetchApps = async (isManual = false) => {
        if (accounts.length > 0) {
            if (isManual) setRefreshing(true);
            else setLoading(true);
            try {
                const accessToken = await acquireToken({ ...loginRequest });
                const graphService = new GraphService(accessToken);
                const data = await graphService.getServicePrincipals();
                // Filter out noise to match "Enterprise Applications" view in portal
                // Logic: "Enterprise Apps" (Service Principals) typically have the 'WindowsAzureActiveDirectoryIntegratedApp' tag.
                const filteredData = data ? data.filter(sp => {
                    const tags = sp.tags || [];
                    return tags.includes('WindowsAzureActiveDirectoryIntegratedApp');
                }) : [];
                setApps(filteredData);
            } catch (error) {
                console.error("Failed to fetch enterprise apps", error);
                setApps([]);
            } finally {
                if (isManual) {
                    setTimeout(() => setRefreshing(false), 1000);
                } else {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        }
    };

    const isValidDate = (d) => {
        return d && !isNaN(new Date(d).getTime());
    };

    const formatDate = (d) => {
        if (!isValidDate(d)) return '-';
        return new Date(d).toLocaleDateString();
    };

    const getCertInfo = (app) => {
        try {
            const certs = Array.isArray(app.keyCredentials) ? app.keyCredentials : [];
            const secrets = Array.isArray(app.passwordCredentials) ? app.passwordCredentials : [];
            const allCreds = [...certs, ...secrets];

            const activeCerts = certs.filter(c => isValidDate(c.endDateTime) && new Date(c.endDateTime) > new Date()).length;

            let nextExpiry = null;
            if (allCreds.length > 0) {
                // Find earliest expiry that is still in the future
                const futureCreds = allCreds.filter(c => isValidDate(c.endDateTime) && new Date(c.endDateTime) > new Date());
                if (futureCreds.length > 0) {
                    futureCreds.sort((a, b) => new Date(a.endDateTime) - new Date(b.endDateTime));
                    nextExpiry = new Date(futureCreds[0].endDateTime);
                }
            }

            return { activeCerts, nextExpiry };
        } catch (e) {
            console.warn('Error processing certs for app', app.id, e);
            return { activeCerts: 0, nextExpiry: null };
        }
    };

    const filteredApps = apps.filter(app => {
        if (!app) return false;
        const search = filterText.toLowerCase();
        return (app.displayName && app.displayName.toLowerCase().includes(search)) ||
            (app.appId && app.appId.toLowerCase().includes(search)) ||
            (app.id && app.id.toLowerCase().includes(search));
    });

    const handleDownloadCSV = () => {
        try {
            const headers = ['Name', 'Object ID', 'Application ID', 'Homepage URL', 'Created On', 'Active Certificates', 'Next Expiry'];
            const rows = filteredApps.map(a => {
                const { activeCerts, nextExpiry } = getCertInfo(a);
                return [
                    `"${a.displayName || ''}"`,
                    `"${a.id || ''}"`,
                    `"${a.appId || ''}"`,
                    `"${a.homepage || ''}"`,
                    `"${formatDate(a.createdDateTime)}"`,
                    activeCerts,
                    nextExpiry ? `"${formatDate(nextExpiry)}"` : '-'
                ];
            });
            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `enterprise_applications_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Export failed", e);
        }
    };

    if (loading) {
        return (
            <Loader3D showOverlay={true} />
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
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Enterprise Applications</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Manage service principals and application integrations</p>
                </div>
                <div className="flex-gap-4">
                    <button className={`sync-btn ${refreshing ? 'spinning' : ''}`} onClick={() => fetchApps(true)} title="Sync & Refresh">
                        <RefreshCw size={16} />
                    </button>
                    <button className="btn btn-primary" onClick={handleDownloadCSV}>
                        <Download size={16} />
                        Export List
                    </button>
                </div>
            </header>

            <div className="glass-card" style={{ marginBottom: '24px', padding: '24px' }}>
                <div className="search-wrapper">
                    <input
                        type="text"
                        className="input search-input"
                        placeholder="Search by application name, object ID, or app ID..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                    <Search size={18} className="search-icon" />
                </div>
            </div>

            <div style={{ fontSize: '13px', marginBottom: '12px', fontWeight: 500, color: 'var(--text-dim)' }}>
                {filteredApps.length} applications found
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Object ID</th>
                                <th>Application ID</th>
                                <th>Homepage URL</th>
                                <th>Created on</th>
                                <th>Certificates</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredApps.length > 0 ? filteredApps.map((app, i) => {
                                const { activeCerts, nextExpiry } = getCertInfo(app);
                                return (
                                    <tr key={i}>
                                        <td>
                                            <div className="flex-center justify-start flex-gap-3">
                                                <div style={{
                                                    minWidth: '32px', height: '32px', borderRadius: '8px',
                                                    background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    border: '1px solid rgba(59, 130, 246, 0.2)'
                                                }}>
                                                    <Box size={16} />
                                                </div>
                                                <div>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>{app.displayName || 'Unnamed App'}</span>
                                                    {app.tags && Array.isArray(app.tags) && app.tags.includes('WindowsAzureActiveDirectoryIntegratedApp') && (
                                                        <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Integrated App</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '11px', opacity: 0.8 }}>{app.id}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '11px', opacity: 0.8 }}>{app.appId}</td>
                                        <td>
                                            {app.homepage ? (
                                                <a href={app.homepage} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-blue)', fontSize: '12px' }}>
                                                    <Globe size={12} />
                                                    Link
                                                </a>
                                            ) : <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>-</span>}
                                        </td>
                                        <td style={{ fontSize: '12px' }}>{formatDate(app.createdDateTime)}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {nextExpiry ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: new Date(nextExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'var(--accent-error)' : 'var(--text-primary)' }}>
                                                        <Calendar size={12} />
                                                        Exp: {formatDate(nextExpiry)}
                                                    </div>
                                                ) : <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>No expiry</span>}
                                                {activeCerts > 0 && (
                                                    <span className="badge badge-success" style={{ width: 'fit-content' }}>{activeCerts} Active</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <Shield size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <p>No enterprise applications match your search.</p>
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

export default EntraEnterpriseApps;
