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
    const [filteredTeams, setFilteredTeams] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

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

            const data = await TeamsService.getTeams(client, 200);
            setTeams(data);
            setFilteredTeams(data);
        } catch (err) {
            console.error('Failed to fetch teams:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, [instance, accounts]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredTeams(teams);
            return;
        }

        const filtered = teams.filter(team =>
            team.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            team.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            team.mail?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        setFilteredTeams(filtered);
    }, [teams, searchTerm]);

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
                    <button className="back-button" onClick={() => navigate('/service/teams')}>
                        <ArrowLeft size={18} />
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
                    className="refresh-button"
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
                .back-button { background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 10px; padding: 10px; cursor: pointer; color: var(--text-primary); }
                .page-title { display: flex; align-items: center; gap: 12px; font-size: 20px; margin: 0; }
                .page-subtitle { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0 0; }
                .refresh-button { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 10px; color: var(--text-primary); cursor: pointer; }
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
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default TeamsListPage;
