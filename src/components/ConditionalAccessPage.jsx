import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { loginRequest } from '../authConfig';
import { GovernanceService } from '../services/governance/governance.service';
import { Lock, ArrowLeft, RefreshCw, Filter, Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';

const ConditionalAccessPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [policies, setPolicies] = useState([]);
    const [filteredPolicies, setFilteredPolicies] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [stateFilter, setStateFilter] = useState('all');

    const fetchPolicies = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const accessToken = await acquireToken({
                ...loginRequest
            });

            const client = Client.init({
                authProvider: (done) => done(null, accessToken)
            });

            const data = await GovernanceService.getConditionalAccessPolicies(client);
            setPolicies(data);
            setFilteredPolicies(data);
        } catch (err) {
            console.error('Failed to fetch conditional access policies:', err);
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
        fetchPolicies();
    }, [activeTenantId]);

    useEffect(() => {
        let filtered = policies;

        if (stateFilter !== 'all') {
            filtered = filtered.filter(p => p.state === stateFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredPolicies(filtered);
    }, [policies, stateFilter, searchTerm]);

    const getStateIcon = (state) => {
        switch (state) {
            case 'enabled': return <CheckCircle2 size={14} style={{ color: '#22c55e' }} />;
            case 'disabled': return <XCircle size={14} style={{ color: '#6b7280' }} />;
            case 'enabledForReportingButNotEnforced': return <AlertCircle size={14} style={{ color: '#f59e0b' }} />;
            default: return null;
        }
    };

    const getStateColor = (state) => {
        switch (state) {
            case 'enabled': return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' };
            case 'disabled': return { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' };
            case 'enabledForReportingButNotEnforced': return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
            default: return { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' };
        }
    };

    const formatConditions = (conditions) => {
        if (!conditions) return 'No conditions';
        const parts = [];
        if (conditions.users?.includeUsers?.length) parts.push('Users');
        if (conditions.applications?.includeApplications?.length) parts.push('Apps');
        if (conditions.locations) parts.push('Locations');
        if (conditions.platforms) parts.push('Platforms');
        return parts.length ? parts.join(', ') : 'No conditions';
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading Conditional Access Policies...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div className="header-left">
                    <button className="back-button" onClick={() => navigate('/service/governance')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="page-title">
                            <Lock size={24} style={{ color: '#22c55e' }} />
                            Conditional Access Policies
                        </h1>
                        <p className="page-subtitle">{filteredPolicies.length} policies found</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchPolicies(true)}
                    disabled={refreshing}
                    className="refresh-button"
                >
                    <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Summary Stats */}
            <div className="summary-stats">
                <div className="stat-item enabled">
                    <CheckCircle2 size={16} />
                    <span className="count">{policies.filter(p => p.state === 'enabled').length}</span>
                    <span className="label">Enabled</span>
                </div>
                <div className="stat-item report-only">
                    <AlertCircle size={16} />
                    <span className="count">{policies.filter(p => p.state === 'enabledForReportingButNotEnforced').length}</span>
                    <span className="label">Report-only</span>
                </div>
                <div className="stat-item disabled">
                    <XCircle size={16} />
                    <span className="count">{policies.filter(p => p.state === 'disabled').length}</span>
                    <span className="label">Disabled</span>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar glass-card">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search policies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={14} />
                    <select
                        value={stateFilter}
                        onChange={(e) => setStateFilter(e.target.value)}
                    >
                        <option value="all">All States</option>
                        <option value="enabled">Enabled</option>
                        <option value="enabledForReportingButNotEnforced">Report-only</option>
                        <option value="disabled">Disabled</option>
                    </select>
                </div>
            </div>

            {/* Policies Table */}
            <div className="table-container glass-card">
                {filteredPolicies.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Policy Name</th>
                                <th>State</th>
                                <th>Conditions</th>
                                <th>Created</th>
                                <th>Modified</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPolicies.map((policy, idx) => {
                                const stateStyle = getStateColor(policy.state);
                                return (
                                    <tr key={policy.id || idx}>
                                        <td className="policy-name">{policy.displayName || 'Unnamed Policy'}</td>
                                        <td>
                                            <span
                                                className="state-badge"
                                                style={{ background: stateStyle.bg, color: stateStyle.color }}
                                            >
                                                {getStateIcon(policy.state)}
                                                {policy.state === 'enabledForReportingButNotEnforced' ? 'Report-only' : policy.state}
                                            </span>
                                        </td>
                                        <td className="conditions-cell">{formatConditions(policy.conditions)}</td>
                                        <td>{policy.createdDateTime ? new Date(policy.createdDateTime).toLocaleDateString() : 'N/A'}</td>
                                        <td>{policy.modifiedDateTime ? new Date(policy.modifiedDateTime).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-data-state">
                        <Lock size={48} style={{ opacity: 0.3 }} />
                        <p>No conditional access policies found</p>
                    </div>
                )}
            </div>

            <style>{`
                .page-container { padding: 0; }
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
                }
                .summary-stats {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 20px;
                }
                .stat-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 20px;
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: 12px;
                }
                .stat-item.enabled { color: #22c55e; }
                .stat-item.report-only { color: #f59e0b; }
                .stat-item.disabled { color: #6b7280; }
                .stat-item .count {
                    font-size: 20px;
                    font-weight: 700;
                }
                .stat-item .label {
                    font-size: 12px;
                    opacity: 0.8;
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
                .policy-name {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                .state-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                .conditions-cell {
                    font-size: 12px;
                    color: var(--text-secondary);
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
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ConditionalAccessPage;
