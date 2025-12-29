import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { ArrowLeft, Search, Download, Box, Loader2 } from 'lucide-react';

const EntraApps = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        const fetchApps = async () => {
            try {
                if (accounts.length > 0) {
                    const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                    const graphService = new GraphService(response.accessToken);
                    const data = await graphService.getApplications();
                    setApps(data || []);
                }
            } catch (error) {
                console.error("Failed to fetch apps", error);
            } finally {
                setLoading(false);
            }
        };
        fetchApps();
    }, [accounts, instance]);

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
            <div className="flex-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--accent-cyan)" />
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
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>App Registrations</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Enterprise applications and service principal directory</p>
                </div>
                <button className="btn btn-primary" onClick={handleDownloadCSV} style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))' }}>
                    <Download size={16} />
                    Export App List
                </button>
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
