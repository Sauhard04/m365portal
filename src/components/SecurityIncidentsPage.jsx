import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { loginRequest } from '../authConfig';
import { SecurityService } from '../services/security/security.service';
import { AlertOctagon, ArrowLeft, RefreshCw, Filter, Search, Clock, Users } from 'lucide-react';

const SecurityIncidentsPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [incidents, setIncidents] = useState([]);
    const [filteredIncidents, setFilteredIncidents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchIncidents = async (isManual = false) => {
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

            const data = await SecurityService.getSecurityIncidents(client, 100);
            setIncidents(data);
            setFilteredIncidents(data);
        } catch (err) {
            console.error('Failed to fetch security incidents:', err);
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
        fetchIncidents();
    }, [instance, accounts]);

    useEffect(() => {
        let filtered = incidents;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(i => i.status?.toLowerCase() === statusFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(i =>
                i.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                i.incidentWebUrl?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredIncidents(filtered);
    }, [incidents, statusFilter, searchTerm]);

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
            case 'active': return '#ef4444';
            case 'inprogress': return '#f59e0b';
            case 'resolved': return '#22c55e';
            case 'redirected': return '#3b82f6';
            default: return '#6b7280';
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading Security Incidents...</p>
            </div>
        );
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
                            <AlertOctagon size={24} style={{ color: '#f59e0b' }} />
                            Security Incidents
                        </h1>
                        <p className="page-subtitle">{filteredIncidents.length} incidents found</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchIncidents(true)}
                    disabled={refreshing}
                    className="refresh-button"
                >
                    <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Filters */}
            <div className="filters-bar glass-card">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search incidents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={14} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inprogress">In Progress</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {/* Incidents Grid */}
            <div className="incidents-grid">
                {filteredIncidents.length > 0 ? (
                    filteredIncidents.map((incident, idx) => (
                        <div key={incident.id || idx} className="incident-card glass-card">
                            <div className="incident-header">
                                <span
                                    className="severity-badge"
                                    style={{
                                        background: `${getSeverityColor(incident.severity)}20`,
                                        color: getSeverityColor(incident.severity)
                                    }}
                                >
                                    {incident.severity || 'Unknown'}
                                </span>
                                <span
                                    className="status-badge"
                                    style={{
                                        background: `${getStatusColor(incident.status)}20`,
                                        color: getStatusColor(incident.status)
                                    }}
                                >
                                    {incident.status || 'Unknown'}
                                </span>
                            </div>
                            <h3 className="incident-title">{incident.displayName || 'Untitled Incident'}</h3>
                            <div className="incident-meta">
                                <div className="meta-item">
                                    <Clock size={12} />
                                    <span>{incident.createdDateTime ? new Date(incident.createdDateTime).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="meta-item">
                                    <Users size={12} />
                                    <span>{incident.alertCount || 0} alerts</span>
                                </div>
                            </div>
                            {incident.incidentWebUrl && (
                                <a
                                    href={incident.incidentWebUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="view-link"
                                >
                                    View in Microsoft 365 Defender →
                                </a>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="no-data-state">
                        <AlertOctagon size={48} style={{ opacity: 0.3 }} />
                        <p>No security incidents found</p>
                    </div>
                )}
            </div>

            <style jsx>{`
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
                .incidents-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 16px;
                }
                .incident-card {
                    padding: 20px;
                    border-radius: 16px;
                    transition: all 0.3s ease;
                }
                .incident-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                }
                .incident-header {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                .severity-badge, .status-badge {
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                .incident-title {
                    font-size: 14px;
                    font-weight: 600;
                    margin: 0 0 12px 0;
                    color: var(--text-primary);
                    line-height: 1.4;
                }
                .incident-meta {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 12px;
                }
                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    color: var(--text-tertiary);
                }
                .view-link {
                    display: inline-block;
                    font-size: 12px;
                    color: var(--accent-blue);
                    text-decoration: none;
                    transition: opacity 0.2s;
                }
                .view-link:hover {
                    opacity: 0.8;
                }
                .no-data-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px;
                    color: var(--text-tertiary);
                    gap: 12px;
                    grid-column: 1 / -1;
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

export default SecurityIncidentsPage;
