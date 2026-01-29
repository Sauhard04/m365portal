import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { loginRequest } from '../authConfig';
import { SecurityService } from '../services/security/security.service';
import { UserX, ArrowLeft, RefreshCw, Filter, Search, AlertTriangle, Shield } from 'lucide-react';

const RiskyUsersPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [riskFilter, setRiskFilter] = useState('all');

    const fetchRiskyUsers = async (isManual = false) => {
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

            const data = await SecurityService.getRiskyUsers(client);
            setUsers(data);
            setFilteredUsers(data);
        } catch (err) {
            console.error('Failed to fetch risky users:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRiskyUsers();
    }, [instance, accounts]);

    useEffect(() => {
        let filtered = users;

        if (riskFilter !== 'all') {
            filtered = filtered.filter(u => u.riskLevel?.toLowerCase() === riskFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(u =>
                u.userDisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.userPrincipalName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredUsers(filtered);
    }, [users, riskFilter, searchTerm]);

    const getRiskLevelColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#22c55e';
            case 'hidden': return '#6b7280';
            default: return '#6b7280';
        }
    };

    const getRiskStateColor = (state) => {
        switch (state?.toLowerCase()) {
            case 'atrisk': return '#ef4444';
            case 'confirmedcompromised': return '#dc2626';
            case 'remediated': return '#22c55e';
            case 'dismissed': return '#6b7280';
            default: return '#6b7280';
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading Risky Users...</p>
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
                            <UserX size={24} style={{ color: '#a855f7' }} />
                            Risky Users
                        </h1>
                        <p className="page-subtitle">{filteredUsers.length} users at risk</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchRiskyUsers(true)}
                    disabled={refreshing}
                    className="refresh-button"
                >
                    <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stats Summary */}
            <div className="stats-summary">
                <div className="stat-item" style={{ borderColor: '#ef4444' }}>
                    <span className="stat-value">{users.filter(u => u.riskLevel === 'high').length}</span>
                    <span className="stat-label">High Risk</span>
                </div>
                <div className="stat-item" style={{ borderColor: '#f59e0b' }}>
                    <span className="stat-value">{users.filter(u => u.riskLevel === 'medium').length}</span>
                    <span className="stat-label">Medium Risk</span>
                </div>
                <div className="stat-item" style={{ borderColor: '#22c55e' }}>
                    <span className="stat-value">{users.filter(u => u.riskLevel === 'low').length}</span>
                    <span className="stat-label">Low Risk</span>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar glass-card">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={14} />
                    <select
                        value={riskFilter}
                        onChange={(e) => setRiskFilter(e.target.value)}
                    >
                        <option value="all">All Risk Levels</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="table-container glass-card">
                {filteredUsers.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Risk Level</th>
                                <th>Risk State</th>
                                <th>Risk Detail</th>
                                <th>Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user, idx) => (
                                <tr key={user.id || idx}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar">
                                                {(user.userDisplayName || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="user-info">
                                                <span className="user-name">{user.userDisplayName || 'Unknown'}</span>
                                                <span className="user-email">{user.userPrincipalName || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span
                                            className="risk-badge"
                                            style={{
                                                background: `${getRiskLevelColor(user.riskLevel)}20`,
                                                color: getRiskLevelColor(user.riskLevel)
                                            }}
                                        >
                                            <AlertTriangle size={10} />
                                            {user.riskLevel || 'Unknown'}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className="state-badge"
                                            style={{
                                                background: `${getRiskStateColor(user.riskState)}20`,
                                                color: getRiskStateColor(user.riskState)
                                            }}
                                        >
                                            {user.riskState || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="detail-cell">
                                        {user.riskDetail || 'No details available'}
                                    </td>
                                    <td>
                                        {user.riskLastUpdatedDateTime
                                            ? new Date(user.riskLastUpdatedDateTime).toLocaleDateString()
                                            : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-data-state">
                        <Shield size={48} style={{ opacity: 0.3, color: '#22c55e' }} />
                        <p>No risky users found - Great job!</p>
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
                .stats-summary {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 20px;
                }
                .stat-item {
                    flex: 1;
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-left: 4px solid;
                    border-radius: 12px;
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                }
                .stat-value {
                    font-size: 28px;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .stat-label {
                    font-size: 12px;
                    color: var(--text-tertiary);
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
                .user-cell {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .user-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 13px;
                    color: white;
                }
                .user-info {
                    display: flex;
                    flex-direction: column;
                }
                .user-name {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                .user-email {
                    font-size: 11px;
                    color: var(--text-tertiary);
                }
                .risk-badge, .state-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                .detail-cell {
                    max-width: 250px;
                    font-size: 12px;
                    color: var(--text-secondary);
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

export default RiskyUsersPage;
