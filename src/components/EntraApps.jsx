import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { ArrowLeft, Search, Download, Box, Loader2, RefreshCw } from 'lucide-react';
import Loader3D from './Loader3D';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';

const EntraApps = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterText, setFilterText] = useState('');

    const fetchApps = async (isManual = false) => {
        if (accounts.length > 0) {
            if (isManual) setRefreshing(true);
            else setLoading(true);

            const startTime = Date.now();
            try {
                const accessToken = await acquireToken({ ...loginRequest });
                const graphService = new GraphService(accessToken);
                const data = await graphService.getApplications();
                setApps(data || []);

                // Background store for AI context
                const SiteDataStore = (await import('../services/siteDataStore')).default;
                SiteDataStore.store('applications', data || []);
            } catch (error) {
                console.error("Failed to fetch apps", error);
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
        }
    };

    useEffect(() => {
        fetchApps();
    }, [activeTenantId]);

    const filteredApps = apps.filter(app =>
        app.displayName?.toLowerCase().includes(filterText.toLowerCase()) ||
        app.appId?.toLowerCase().includes(filterText.toLowerCase())
    );

    const handleDownloadCSV = () => {
        const headers = ['Display Name', 'App ID', 'Created Date', 'Sign-in Audience'];
        const rows = filteredApps.map(a => [`"${a.displayName}"`, `"${a.appId}"`, `"${a.createdDateTime}"`, `"${a.signInAudience}"`]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'entra_applications.csv';
        link.click();
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
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>App Registrations</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Enterprise applications and service principal directory</p>
                </div>
                <div className="flex-gap-2">
                    <button className={`sync-btn ${refreshing ? 'spinning' : ''}`} onClick={() => fetchApps(true)} title="Sync & Refresh">
                        <RefreshCw size={16} />
                    </button>
                    <button className="btn btn-primary" onClick={handleDownloadCSV} style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))' }}>
                        <Download size={16} />
                        Export App List
                    </button>
                </div>
            </header>

            <div className="glass-card" style={{ marginBottom: '32px', padding: '24px' }}>
                <div className="search-wrapper" style={{ maxWidth: '600px' }}>
                    <input
                        type="text"
                        className="input search-input"
                        placeholder="Search apps by name or client ID..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                    <Search size={18} className="search-icon" />
                </div>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Application Name</th>
                                <th>Client ID</th>
                                <th>Registered On</th>
                                <th>Sign-in Audience</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredApps.length > 0 ? filteredApps.map((app, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className="flex-center justify-start flex-gap-4">
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '8px',
                                                background: 'hsla(199, 89%, 48%, 0.1)',
                                                color: 'var(--accent-cyan)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '1px solid hsla(199, 89%, 48%, 0.2)'
                                            }}>
                                                <Box size={14} />
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{app.displayName}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '11px', fontFamily: 'monospace', opacity: 0.8 }}>{app.appId}</td>
                                    <td style={{ fontSize: '12px' }}>{new Date(app.createdDateTime).toLocaleDateString()}</td>
                                    <td>
                                        <span className="badge badge-info">{app.signInAudience}</span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <Box size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                                        <p>No app registrations found.</p>
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

export default EntraApps;
