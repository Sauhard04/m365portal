import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { loginRequest } from '../authConfig';
import { SecurityService } from '../services/security/security.service';
import Loader3D from './Loader3D';
import { AlertTriangle, ArrowLeft, RefreshCw, Filter, Search, ExternalLink } from 'lucide-react';

const SecurityAlertsPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const [filteredAlerts, setFilteredAlerts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');

    const fetchAlerts = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const account = accounts[0];
            if (!account) throw new Error('No account found');

            let tokenResponse;
            try {
                tokenResponse = await instance.acquireTokenSilent({
                    ...loginRequest,
                    account
                });
            } catch (authErr) {
                if (authErr.name === "InteractionRequiredAuthError") {
                    if (isManual) {
                        tokenResponse = await instance.acquireTokenPopup(loginRequest);
                    } else {
                        console.warn("Silent auth failed for Security Alerts");
                        setError("InteractionRequired");
                        setLoading(false);
                        return;
                    }
                } else {
                    throw authErr;
                }
            }

            const client = Client.init({
                authProvider: (done) => done(null, tokenResponse.accessToken)
            });

            const data = await SecurityService.getSecurityAlerts(client, 200);
            setAlerts(data);
            setFilteredAlerts(data);

            const SiteDataStore = (await import('../services/siteDataStore')).default;
            SiteDataStore.store('securityAlerts', data);
        } catch (err) {
            console.error('Failed to fetch security alerts:', err);
            setError(err.name === "InteractionRequiredAuthError" ? "InteractionRequired" : "Failed to load alerts. Please check your permissions.");
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
        fetchAlerts();
    }, [instance, accounts]);

    useEffect(() => {
        let filtered = alerts;

        if (severityFilter !== 'all') {
            filtered = filtered.filter(a => a.severity?.toLowerCase() === severityFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(a =>
                a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredAlerts(filtered);
    }, [alerts, severityFilter, searchTerm]);

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#22c55e';
            default: return '#6b7280';
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'new': return '#3b82f6';
            case 'inprogress': return '#f59e0b';
            case 'resolved': return '#22c55e';
            default: return '#6b7280';
        }
    };

    if (loading) {
        return <Loader3D showOverlay={true} text="Loading Security Alerts..." />;
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div className="header-left">
                    <button className="back-button" onClick={() => navigate('/service/security')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="page-title">
                            <AlertTriangle size={24} style={{ color: '#ef4444' }} />
                            Security Alerts
                        </h1>
                        <p className="page-subtitle">{filteredAlerts.length} alerts found</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchAlerts(true)}
                    disabled={refreshing}
                    className="refresh-button"
                >
                    <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {error && (
                <div style={{
                    background: error === 'InteractionRequired' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${error === 'InteractionRequired' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                    color: error === 'InteractionRequired' ? 'var(--accent-blue)' : '#ef4444',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>{error === 'InteractionRequired' ? '🔐 Session expired. Please reconnect to access security alerts.' : error}</span>
                    {error === 'InteractionRequired' && (
                        <button
                            onClick={() => fetchAlerts(true)}
                            style={{
                                background: 'var(--accent-blue)',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Reconnect
                        </button>
                    )}
                </div>
            )}

            {/* Filters */}
            <div className="filters-bar glass-card">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search alerts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={14} />
                    <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                    >
                        <option value="all">All Severities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>

            {/* Alerts Table */}
            <div className="table-container glass-card">
                {filteredAlerts.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Severity</th>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Provider</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAlerts.map((alert, idx) => (
                                <tr key={alert.id || idx}>
                                    <td>
                                        <span
                                            className="severity-badge"
                                            style={{
                                                background: `${getSeverityColor(alert.severity)}20`,
                                                color: getSeverityColor(alert.severity)
                                            }}
                                        >
                                            {alert.severity || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="title-cell">
                                        <span className="alert-title">{alert.title || 'No title'}</span>
                                        {alert.description && (
                                            <span className="alert-desc">{alert.description.substring(0, 100)}...</span>
                                        )}
                                    </td>
                                    <td>{alert.category || 'N/A'}</td>
                                    <td>
                                        <span
                                            className="status-badge"
                                            style={{
                                                background: `${getStatusColor(alert.status)}20`,
                                                color: getStatusColor(alert.status)
                                            }}
                                        >
                                            {alert.status || 'Unknown'}
                                        </span>
                                    </td>
                                    <td>{alert.createdDateTime ? new Date(alert.createdDateTime).toLocaleDateString() : 'N/A'}</td>
                                    <td>{alert.vendorInformation?.provider || alert.detectionSource || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-data-state">
                        <AlertTriangle size={48} style={{ opacity: 0.3 }} />
                        <p>No security alerts found</p>
                    </div>
                )}
            </div>

            <style jsx="true">{`
                .page-container {
                    padding: 0;
                }
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .back-button {
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: 10px;
                    padding: 10px;
                    cursor: pointer;
                    color: var(--text-primary);
                    transition: all 0.2s;
                }
                .back-button:hover {
                    background: var(--glass-bg-hover);
                }
                .page-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 20px;
                    margin: 0;
                }
                .page-subtitle {
                    font-size: 13px;
                    color: var(--text-secondary);
                    margin: 4px 0 0 0;
                }
                .refresh-button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: 10px;
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .filters-bar {
                    display: flex;
                    gap: 16px;
                    padding: 16px;
                    margin-bottom: 20px;
                    border-radius: 12px;
                }
                .search-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                    background: var(--bg-tertiary);
                    padding: 8px 12px;
                    border-radius: 8px;
                    border: 1px solid var(--glass-border);
                }
                .search-box input {
                    flex: 1;
                    background: none;
                    border: none;
                    color: var(--text-primary);
                    font-size: 13px;
                    outline: none;
                }
                .filter-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .filter-group select {
                    background: var(--bg-tertiary);
                    border: 1px solid var(--glass-border);
                    border-radius: 8px;
                    padding: 8px 12px;
                    color: var(--text-primary);
                    font-size: 12px;
                    cursor: pointer;
                }
                .table-container {
                    border-radius: 16px;
                    overflow: hidden;
                    padding: 0;
                }
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .data-table th,
                .data-table td {
                    padding: 14px 16px;
                    text-align: left;
                    border-bottom: 1px solid var(--glass-border);
                }
                .data-table th {
                    background: var(--bg-tertiary);
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--text-tertiary);
                }
                .data-table tr:hover {
                    background: rgba(255, 255, 255, 0.02);
                }
                .severity-badge, .status-badge {
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                .title-cell {
                    max-width: 350px;
                }
                .alert-title {
                    display: block;
                    font-weight: 500;
                    color: var(--text-primary);
                    margin-bottom: 4px;
                }
                .alert-desc {
                    display: block;
                    font-size: 11px;
                    color: var(--text-tertiary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .no-data-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px;
                    color: var(--text-tertiary);
                    gap: 12px;
                }
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 60vh;
                    gap: 16px;
                }
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--glass-border);
                    border-top-color: var(--accent-blue);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default SecurityAlertsPage;
