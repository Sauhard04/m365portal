import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { loginRequest } from '../authConfig';
import { TeamsService } from '../services/teams/teams.service';
import { Users, ArrowLeft, RefreshCw, Search, Globe, Lock, Calendar, Mail } from 'lucide-react';

const TeamsListPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [teams, setTeams] = useState([]);
    const [myTeams, setMyTeams] = useState([]);
    const [filteredTeams, setFilteredTeams] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState('all'); // 'all' or 'my'

    const fetchTeams = async (isManual = false) => {
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

            const [allTeams, myJoinedTeams] = await Promise.all([
                TeamsService.getTeams(client, 999),
                TeamsService.getMyJoinedTeams(client)
            ]);

            setTeams(allTeams);
            setMyTeams(myJoinedTeams);

            // Check URL params for initial filter
            const params = new URLSearchParams(window.location.search);
            if (params.get('filter') === 'my') {
                setFilterMode('my');
                setFilteredTeams(myJoinedTeams);
            } else {
                setFilterMode('all');
                setFilteredTeams(allTeams);
            }
        } catch (err) {
            console.error('Failed to fetch teams:', err);
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
        fetchTeams();
    }, [instance, accounts]);

    useEffect(() => {
        let source = filterMode === 'my' ? myTeams : teams;

        if (!searchTerm) {
            setFilteredTeams(source);
            return;
        }

        const filtered = source.filter(team =>
            team.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            team.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            team.mail?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        setFilteredTeams(filtered);
    }, [teams, myTeams, searchTerm, filterMode]);

    const getVisibilityStyle = (visibility) => {
        switch (visibility) {
            case 'Public': return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' };
            case 'Private': return { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' };
            default: return { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' };
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading Teams...</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div className="header-left">
                    <button className="glass-btn btn-back-nav" onClick={() => navigate('/service/teams')}>
                        <ArrowLeft size={18} />
                        Back to Dashboard
                    </button>
                    <div>
                        <h1 className="page-title">
                            <Users size={24} style={{ color: '#a855f7' }} />
                            All Teams
                        </h1>
                        <p className="page-subtitle">{filteredTeams.length} teams found</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchTeams(true)}
                    disabled={refreshing}
                    className="glass-btn"
                    style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                    <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Search */}
            <div className="filters-bar glass-card">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search teams..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group glass-card" style={{ padding: '4px', display: 'flex', gap: '4px' }}>
                    <button
                        className={`filter-tab ${filterMode === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterMode('all')}
                    >
                        All Teams
                    </button>
                    <button
                        className={`filter-tab ${filterMode === 'my' ? 'active' : ''}`}
                        onClick={() => setFilterMode('my')}
                    >
                        My Teams
                    </button>
                </div>
            </div>

            {/* Teams Grid */}
            <div className="teams-grid">
                {filteredTeams.length > 0 ? (
                    filteredTeams.map((team, idx) => {
                        const visStyle = getVisibilityStyle(team.visibility);
                        return (
                            <div key={team.id || idx} className="team-card glass-card">
                                <div className="team-header">
                                    <div className="team-avatar">
                                        {(team.displayName || 'T').charAt(0).toUpperCase()}
                                    </div>
                                    <span
                                        className="visibility-badge"
                                        style={{ background: visStyle.bg, color: visStyle.color }}
                                    >
                                        {team.visibility === 'Public' ? <Globe size={10} /> : <Lock size={10} />}
                                        {team.visibility || 'Unknown'}
                                    </span>
                                </div>
                                <h3 className="team-name">{team.displayName || 'Unnamed Team'}</h3>
                                <p className="team-desc">{team.description?.substring(0, 80) || 'No description'}</p>
                                <div className="team-meta">
                                    {team.mail && (
                                        <div className="meta-item">
                                            <Mail size={12} />
                                            <span>{team.mail}</span>
                                        </div>
                                    )}
                                    <div className="meta-item">
                                        <Calendar size={12} />
                                        <span>Created: {team.createdDateTime ? new Date(team.createdDateTime).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="no-data-state">
                        <Users size={48} style={{ opacity: 0.3 }} />
                        <p>No teams found</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .page-container { padding: 0; }
                .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .header-left { display: flex; align-items: center; gap: 16px; }
                .btn-back-nav { display: flex; align-items: center; gap: 8px; padding: 8px 16px; height: 40px; }
                .page-title { display: flex; align-items: center; gap: 12px; font-size: 20px; margin: 0; }
                .page-subtitle { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0 0; }
                .filters-bar { display: flex; gap: 16px; padding: 16px; margin-bottom: 20px; border-radius: 12px; }
                .search-box { display: flex; align-items: center; gap: 8px; flex: 1; background: var(--bg-tertiary); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--glass-border); }
                .search-box input { flex: 1; background: none; border: none; color: var(--text-primary); font-size: 13px; outline: none; }
                .teams-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
                .team-card { padding: 20px; border-radius: 16px; transition: all 0.3s ease; }
                .team-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2); }
                .team-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                .team-avatar { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #a855f7, #3b82f6); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 16px; color: white; }
                .visibility-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; }
                .team-name { font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: var(--text-primary); line-height: 1.4; }
                .team-desc { font-size: 12px; color: var(--text-secondary); margin: 0 0 12px 0; line-height: 1.5; }
                .team-meta { display: flex; flex-direction: column; gap: 6px; }
                .meta-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-tertiary); }
                .no-data-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: var(--text-tertiary); gap: 12px; grid-column: 1 / -1; }
                .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; gap: 16px; }
                .loading-spinner { width: 40px; height: 40px; border: 3px solid var(--glass-border); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 1s linear infinite; }
                .spin { animation: spin 1s linear infinite; }
                .filter-group { display: flex; align-items: center; background: var(--bg-tertiary); border-radius: 8px; }
                .filter-tab { background: none; border: none; padding: 6px 12px; border-radius: 6px; color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
                .filter-tab.active { background: var(--accent-blue); color: white; shadow: 0 2px 8px rgba(0,0,0,0.2); }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default TeamsListPage;
