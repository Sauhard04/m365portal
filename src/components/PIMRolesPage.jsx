import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { loginRequest } from '../authConfig';
import { GovernanceService } from '../services/governance/governance.service';
import { Key, ArrowLeft, RefreshCw, Filter, Search, Shield, Clock, User } from 'lucide-react';

const PIMRolesPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('eligible');
    const [eligibleRoles, setEligibleRoles] = useState([]);
    const [activeRoles, setActiveRoles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchRoles = async (isManual = false) => {
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

            const [eligible, active] = await Promise.all([
                GovernanceService.getEligibleRoleAssignments(client),
                GovernanceService.getActiveRoleAssignments(client)
            ]);

            setEligibleRoles(eligible);
            setActiveRoles(active);
        } catch (err) {
            console.error('Failed to fetch PIM roles:', err);
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
        fetchRoles();
    }, [instance, accounts]);

    const getCurrentData = () => {
        const data = activeTab === 'eligible' ? eligibleRoles : activeRoles;
        if (!searchTerm) return data;
        return data.filter(r =>
            r.roleDefinition?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.principal?.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const filteredData = getCurrentData();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading PIM Roles...</p>
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
                            <Key size={24} style={{ color: '#a855f7' }} />
                            Privileged Identity Management
                        </h1>
                        <p className="page-subtitle">Manage eligible and active role assignments</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchRoles(true)}
                    disabled={refreshing}
                    className="refresh-button"
                >
                    <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Summary Stats */}
            <div className="summary-stats">
                <div className="stat-item" style={{ borderColor: '#a855f7' }}>
                    <Clock size={18} style={{ color: '#a855f7' }} />
                    <div className="stat-content">
                        <span className="count">{eligibleRoles.length}</span>
                        <span className="label">Eligible Roles</span>
                    </div>
                </div>
                <div className="stat-item" style={{ borderColor: '#3b82f6' }}>
                    <Shield size={18} style={{ color: '#3b82f6' }} />
                    <div className="stat-content">
                        <span className="count">{activeRoles.length}</span>
                        <span className="label">Active Roles</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                <button
                    className={`tab ${activeTab === 'eligible' ? 'active' : ''}`}
                    onClick={() => setActiveTab('eligible')}
                >
                    <Clock size={14} />
                    Eligible Roles ({eligibleRoles.length})
                </button>
                <button
                    className={`tab ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveTab('active')}
                >
                    <Shield size={14} />
                    Active Roles ({activeRoles.length})
                </button>
            </div>

            {/* Search */}
            <div className="filters-bar glass-card">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search by role or user..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="table-container glass-card">
                {filteredData.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Role</th>
                                <th>Principal</th>
                                <th>Type</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((assignment, idx) => (
                                <tr key={assignment.id || idx}>
                                    <td className="role-cell">
                                        <Key size={14} style={{ color: '#a855f7' }} />
                                        {assignment.roleDefinition?.displayName || 'Unknown Role'}
                                    </td>
                                    <td>
                                        <div className="principal-info">
                                            <User size={14} />
                                            <div>
                                                <span className="name">{assignment.principal?.displayName || 'Unknown'}</span>
                                                <span className="type">{assignment.principal?.['@odata.type']?.replace('#microsoft.graph.', '') || 'User'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`type-badge ${activeTab}`}>
                                            {activeTab === 'eligible' ? 'Eligible' : 'Active'}
                                        </span>
                                    </td>
                                    <td>{assignment.startDateTime ? new Date(assignment.startDateTime).toLocaleDateString() : 'N/A'}</td>
                                    <td>{assignment.endDateTime ? new Date(assignment.endDateTime).toLocaleDateString() : 'Permanent'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-data-state">
                        <Key size={48} style={{ opacity: 0.3 }} />
                        <p>No {activeTab} role assignments found</p>
                    </div>
                )}
            </div>

            <style jsx>{`
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
                    gap: 12px;
                    padding: 16px 24px;
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-left: 4px solid;
                    border-radius: 12px;
                }
                .stat-content {
                    display: flex;
                    flex-direction: column;
                }
                .stat-item .count {
                    font-size: 24px;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .stat-item .label {
                    font-size: 12px;
                    color: var(--text-tertiary);
                }
                .tabs-container {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 16px;
                }
                .tab {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 10px 20px;
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: 10px;
                    color: var(--text-secondary);
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .tab.active {
                    background: var(--accent-purple);
                    color: white;
                    border-color: var(--accent-purple);
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
                .role-cell {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 500;
                }
                .principal-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .principal-info .name {
                    display: block;
                    font-weight: 500;
                }
                .principal-info .type {
                    display: block;
                    font-size: 10px;
                    color: var(--text-tertiary);
                }
                .type-badge {
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                }
                .type-badge.eligible {
                    background: rgba(168, 85, 247, 0.15);
                    color: #a855f7;
                }
                .type-badge.active {
                    background: rgba(59, 130, 246, 0.15);
                    color: #3b82f6;
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

export default PIMRolesPage;
