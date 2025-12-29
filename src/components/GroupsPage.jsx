import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { Loader2, ArrowLeft, Users, Shield, Globe, Mail, Search } from 'lucide-react';

const GroupsPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterText, setFilterText] = useState('');
    const [filterType, setFilterType] = useState(null);

    useEffect(() => {
        const fetchGroups = async () => {
            if (accounts.length === 0) return;
            try {
                const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                const graphService = new GraphService(response.accessToken);
                const data = await graphService.getGroups();
                setGroups(data);
            } catch (err) {
                setError("Organization groups could not be fetched.");
            } finally {
                setLoading(false);
            }
        };
        fetchGroups();
    }, [instance, accounts]);

    const m365Count = groups.filter(g => g.groupTypes?.includes('Unified')).length;
    const securityCount = groups.filter(g => g.securityEnabled && !g.groupTypes?.includes('Unified')).length;
    const distributionCount = groups.filter(g => g.mailEnabled && !g.securityEnabled && !g.groupTypes?.includes('Unified')).length;

    const filteredGroups = groups.filter(group => {
        const searchStr = filterText.toLowerCase();
        const matchesText = (group.displayName?.toLowerCase() || '').includes(searchStr) || (group.mail?.toLowerCase() || '').includes(searchStr);
        if (!matchesText) return false;
        if (filterType === 'Unified') return group.groupTypes?.includes('Unified');
        if (filterType === 'Security') return group.securityEnabled && !group.groupTypes?.includes('Unified');
        if (filterType === 'Distribution') return group.mailEnabled && !group.securityEnabled && !group.groupTypes?.includes('Unified');
        return true;
    });

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--accent-blue)" />
            </div>
        );
    }

    return (
        <div className="animate-in">
            <button onClick={() => navigate('/service/admin')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Dashboard
            </button>

            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Admin Groups</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Global directory group management and communication lists</p>
                </div>
            </header>

            <div className="stat-grid">
                <div
                    className="glass-card stat-card"
                    onClick={() => setFilterType(filterType === 'Unified' ? null : 'Unified')}
                    style={{ cursor: 'pointer', borderColor: filterType === 'Unified' ? 'var(--accent-blue)' : 'var(--glass-border)' }}
                >
                    <span className="stat-label">Microsoft 365</span>
                    <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{m365Count}</div>
                    <div className="mt-4"><span className="badge badge-info">Collab</span></div>
                </div>
                <div
                    className="glass-card stat-card"
                    onClick={() => setFilterType(filterType === 'Security' ? null : 'Security')}
                    style={{ cursor: 'pointer', borderColor: filterType === 'Security' ? 'var(--accent-purple)' : 'var(--glass-border)' }}
                >
                    <span className="stat-label">Security</span>
                    <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>{securityCount}</div>
                    <div className="mt-4"><span className="badge" style={{ background: 'hsla(263, 70%, 50%, 0.1)', color: 'var(--accent-purple)' }}>Protected</span></div>
                </div>
                <div
                    className="glass-card stat-card"
                    onClick={() => setFilterType(filterType === 'Distribution' ? null : 'Distribution')}
                    style={{ cursor: 'pointer', borderColor: filterType === 'Distribution' ? 'var(--accent-success)' : 'var(--glass-border)' }}
                >
                    <span className="stat-label">Distribution</span>
                    <div className="stat-value" style={{ color: 'var(--accent-success)' }}>{distributionCount}</div>
                    <div className="mt-4"><span className="badge badge-success">Email</span></div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="p-8 flex-between" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '18px' }}>Active Directory Groups</h3>
                    <div className="search-wrapper" style={{ maxWidth: '400px' }}>
                        <input
                            type="text"
                            className="input search-input"
                            placeholder="Find group by name or email..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                        <Search size={18} className="search-icon" />
                    </div>
                </div>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Group Identity</th>
                                <th>Primary Email</th>
                                <th>Category</th>
                                <th>Metadata</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGroups.length > 0 ? filteredGroups.map((group) => (
                                <tr key={group.id}>
                                    <td>
                                        <div className="flex-center justify-start flex-gap-4">
                                            <div style={{ padding: '8px', background: 'hsla(var(--hue), 90%, 60%, 0.1)', color: 'var(--accent-blue)', borderRadius: '8px' }}>
                                                <Users size={16} />
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{group.displayName}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '12px' }}>{group.mail || <span style={{ opacity: 0.3 }}>-</span>}</td>
                                    <td>
                                        {group.groupTypes?.includes('Unified') ? (
                                            <span className="badge badge-info">M365 Group</span>
                                        ) : group.securityEnabled ? (
                                            <span className="badge" style={{ background: 'hsla(263, 70%, 50%, 0.1)', color: 'var(--accent-purple)', borderColor: 'hsla(263, 70%, 50%, 0.2)' }}>Security</span>
                                        ) : (
                                            <span className="badge badge-success">Distribution</span>
                                        )}
                                    </td>
                                    <td style={{ fontSize: '11px', color: 'var(--text-dim)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {group.description || '-'}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <Users size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <p>No groups match your selection.</p>
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

export default GroupsPage;
