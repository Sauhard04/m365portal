import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { GroupsService } from '../services/entra';
import { ArrowLeft, Search, Download, UsersRound, Loader2, Users } from 'lucide-react';

const EntraGroups = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        const fetchGroups = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                    const client = new GraphService(response.accessToken).client;
                    const data = await GroupsService.getAllGroups(client, 100);
                    setGroups(data);
                } catch (error) {
                    console.error("Group fetch error:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchGroups();
    }, [accounts, instance]);

    const filteredGroups = groups.filter(group => {
        const matchesText = (group.displayName || '').toLowerCase().includes(filterText.toLowerCase());
        const isSecurity = group.securityEnabled;
        const isDist = group.mailEnabled && !group.securityEnabled;
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
            <div className="flex-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--accent-purple)" />
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
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Directory Groups</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Administrative groups, distribution lists, and M365 teams</p>
                </div>
                <button className="btn btn-primary" onClick={handleDownloadCSV} style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))', boxShadow: '0 4px 15px hsla(263, 70%, 50%, 0.3)' }}>
                    <Download size={16} />
                    Export Groups
                </button>
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
                    <select className="input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
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
