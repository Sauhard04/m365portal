import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { GroupsService } from '../services/entra';
import { ArrowLeft, Search, Download, UsersRound, Loader2, Users, RefreshCw } from 'lucide-react';
import Loader3D from './Loader3D';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';

const EntraGroups = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [filterType, setFilterType] = useState('all');

    const fetchGroups = async (isManual = false) => {
        if (accounts.length > 0) {
            if (isManual) setRefreshing(true);
            else setLoading(true);

            const startTime = Date.now();
            try {
                const accessToken = await acquireToken({ ...loginRequest });
                const client = new GraphService(accessToken).client;
                const data = await GroupsService.getAllGroups(client, 100);
                setGroups(data);

                // Background store for AI context
                const SiteDataStore = (await import('../services/siteDataStore')).default;
                SiteDataStore.store('groups', data);
            } catch (error) {
                console.error("Group fetch error:", error);
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
        fetchGroups();
    }, [accounts, activeTenantId]);

    const filteredGroups = groups.filter(group => {
        const matchesText = (group.displayName || '').toLowerCase().includes(filterText.toLowerCase());
        const isSecurity = group.securityEnabled;
        const isDist = group.mailEnabled && !group.securityEnabled && !group.groupTypes?.includes('Unified');
        let matchesType = true;
        if (filterType === 'security') matchesType = isSecurity;
        if (filterType === 'distribution') matchesType = isDist;
        if (filterType === 'm365') matchesType = group.groupTypes?.includes('Unified');
        return matchesText && matchesType;
    });

    const getGroupType = (group) => {
        if (group.groupTypes?.includes('Unified')) return 'Microsoft 365';
        if (group.securityEnabled) return 'Security';
        if (group.mailEnabled) return 'Distribution';
        return 'Other';
    };

    const handleDownloadCSV = () => {
        const headers = ['Group Name', 'Email', 'Type', 'Description'];
        const rows = filteredGroups.map(g => [
            `"${g.displayName}"`, `"${g.mail || ''}"`, `"${getGroupType(g)}"`, `"${g.description || ''}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'entra_groups.csv';
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
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Directory Groups</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Administrative groups, distribution lists, and M365 teams</p>
                </div>
                <div className="flex-gap-2">
                    <button className={`sync-btn ${refreshing ? 'spinning' : ''}`} onClick={() => fetchGroups(true)} title="Sync & Refresh">
                        <RefreshCw size={16} />
                    </button>
                    <button className="btn btn-primary" onClick={handleDownloadCSV} style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))', boxShadow: '0 4px 15px hsla(263, 70%, 50%, 0.3)' }}>
                        <Download size={16} />
                        Export Groups
                    </button>
                </div>
            </header>

            <div className="glass-card" style={{ marginBottom: '32px', padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
                    <div className="search-wrapper">
                        <input
                            type="text"
                            className="input search-input"
                            placeholder="Search by group name..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                        <Search size={18} className="search-icon" />
                    </div>
                    <select className="input" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ color: 'var(--text-primary)', cursor: 'pointer' }}>
                        <option value="all">All Group Types</option>
                        <option value="security">Security Enabled</option>
                        <option value="distribution">Distribution Lists</option>
                        <option value="m365">Microsoft 365 Groups</option>
                    </select>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Group Name</th>
                                <th>Category</th>
                                <th>Primary Email</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGroups.length > 0 ? filteredGroups.map((group, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className="flex-center justify-start flex-gap-4">
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%',
                                                background: 'hsla(263, 70%, 50%, 0.1)',
                                                color: 'var(--accent-purple)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '1px solid hsla(263, 70%, 50%, 0.2)'
                                            }}>
                                                <Users size={14} />
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{group.displayName}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {getGroupType(group) === 'Microsoft 365' ? (
                                            <span className="badge badge-info">M365 Group</span>
                                        ) : getGroupType(group) === 'Security' ? (
                                            <span className="badge" style={{ background: 'hsla(263, 70%, 50%, 0.1)', color: 'var(--accent-purple)', borderColor: 'hsla(263, 70%, 50%, 0.2)' }}>Security</span>
                                        ) : (
                                            <span className="badge badge-success">Distribution</span>
                                        )}
                                    </td>
                                    <td style={{ fontSize: '12px' }}>{group.mail || '-'}</td>
                                    <td style={{ fontSize: '12px', color: 'var(--text-dim)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {group.description || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No description</span>}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <UsersRound size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                                        <p>No groups found for this criteria.</p>
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

export default EntraGroups;
