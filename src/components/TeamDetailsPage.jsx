import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { motion, AnimatePresence } from 'framer-motion';
import { teamsScopes } from '../authConfig';
import { TeamsService } from '../services/teams/teams.service';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import Loader3D from './Loader3D';
import {
    Users, Hash, Globe, Lock, Info, ExternalLink, ArrowLeft, RefreshCw
} from 'lucide-react';

const TeamDetailsPage = () => {
    const { teamId } = useParams();
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [team, setTeam] = useState(null);
    const [channels, setChannels] = useState([]);
    const [members, setMembers] = useState([]);
    const [activeTab, setActiveTab] = useState('channels');
    const [error, setError] = useState(null);

    const fetchData = async (isManual = false) => {
        if (accounts.length === 0) return;

        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const accessToken = await acquireToken({
                ...teamsScopes
            });

            const client = Client.init({
                authProvider: (done) => done(null, accessToken)
            });

            const [teamData, channelsData, membersData] = await Promise.all([
                TeamsService.getTeamById(client, teamId),
                TeamsService.getTeamChannels(client, teamId),
                TeamsService.getTeamMembers(client, teamId)
            ]);

            setTeam(teamData);
            setChannels(channelsData);
            setMembers(membersData);
        } catch (err) {
            console.error('Failed to fetch team details:', err);
            setError(err.message || "Failed to load team details");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [teamId, activeTenantId]);

    const formatVisibility = (vis) => {
        if (!vis || vis === 'UnknownFutureValue') return 'Private';
        return vis;
    };

    if (loading) return <Loader3D showOverlay={true} text="Architecting Details View..." />;

    if (error || !team) {
        return (
            <div className="animate-in" style={{ padding: '40px', textAlign: 'center' }}>
                <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px' }}>
                    <Info size={48} color="var(--accent-error)" style={{ marginBottom: '16px' }} />
                    <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>Workspace Not Found</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error || "This team may have been archived or removed from the tenant."}</p>
                    <button className="btn-back" onClick={() => navigate('/service/teams/list')}>
                        <ArrowLeft size={16} />
                        Return to Teams List
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in">
            {/* Standard Navigation */}
            <button className="btn-back" onClick={() => navigate('/service/teams/list')}>
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Teams List
            </button>

            {/* Standard Header with title-gradient for proper light mode support */}
            <header className="flex-between spacing-v-8">
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div className="team-avatar-standard">
                        {(team.displayName || 'T').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <h1 className="title-gradient" style={{ fontSize: '32px', margin: 0 }}>{team.displayName}</h1>
                            <span className={`badge-standard ${formatVisibility(team.visibility).toLowerCase()}`}>
                                {formatVisibility(team.visibility) === 'Public' ? <Globe size={11} /> : <Lock size={11} />}
                                {formatVisibility(team.visibility)}
                            </span>
                        </div>
                        <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginTop: '4px' }}>
                            {team.description || 'Enterprise collaboration workspace.'}
                        </p>
                    </div>
                </div>
                <div className="flex-gap-2">
                    <button
                        className={`sync-btn ${refreshing ? 'spinning' : ''}`}
                        onClick={() => fetchData(true)}
                        title="Sync Data"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <a href={team.webUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-indigo))' }}>
                        <ExternalLink size={16} />
                        Open in Teams
                    </a>
                </div>
            </header>

            {/* Standard Tab System aligned with Portal styles */}
            <div className="portal-tabs">
                <button
                    className={`portal-tab ${activeTab === 'channels' ? 'active' : ''}`}
                    onClick={() => setActiveTab('channels')}
                >
                    <Hash size={16} />
                    Channels
                    <span className="count-pill">{channels.length}</span>
                </button>
                <button
                    className={`portal-tab ${activeTab === 'members' ? 'active' : ''}`}
                    onClick={() => setActiveTab('members')}
                >
                    <Users size={16} />
                    Members
                    <span className="count-pill">{members.length}</span>
                </button>
            </div>

            {/* Content Area using Standard table-container and modern-table */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="glass-card"
                style={{ padding: 0, overflow: 'hidden' }}
            >
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            {activeTab === 'channels' ? (
                                <tr>
                                    <th style={{ width: '35%' }}>Channel Name</th>
                                    <th style={{ width: '15%' }}>Visibility</th>
                                    <th style={{ width: '35%' }}>Description</th>
                                    <th style={{ width: '15%', textAlign: 'right' }}>Created</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th style={{ width: '40%' }}>Member Identity</th>
                                    <th style={{ width: '20%' }}>Access Role</th>
                                    <th style={{ width: '40%', textAlign: 'right' }}>Principal Address</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {activeTab === 'channels' ? (
                                channels.length > 0 ? channels.map((channel, i) => (
                                    <tr key={channel.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div className="icon-circle blue">
                                                    <Hash size={14} />
                                                </div>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{channel.displayName}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                                                {channel.membershipType || 'Standard'}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{channel.description || 'General discussion channel'}</td>
                                        <td style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'right' }}>
                                            {channel.createdDateTime ? new Date(channel.createdDateTime).toLocaleDateString() : '--'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" className="empty-row">No channels discovered in this workspace</td></tr>
                                )
                            ) : (
                                members.length > 0 ? members.map((member, i) => (
                                    <tr key={member.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div className="avatar-circle">
                                                    {(member.displayName || '?').charAt(0)}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member.displayName}</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Active User</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${member.roles?.includes('owner') ? 'badge-info' : ''}`}
                                                style={!member.roles?.includes('owner') ? { background: 'hsla(0,0%,100%,0.05)', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' } : {}}>
                                                {member.roles?.includes('owner') ? 'Owner' : 'Member'}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'right' }}>
                                            {member.email || member.mail || 'Local Account'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="3" className="empty-row">No members discovered in this registry</td></tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            <style>{`
                .team-avatar-standard {
                    width: 72px;
                    height: 72px;
                    background: linear-gradient(135deg, var(--accent-blue), var(--accent-indigo));
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    font-weight: 800;
                    color: white;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                }

                .badge-standard {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    text-transform: capitalize;
                }
                .badge-standard.public { color: var(--accent-success); border-color: hsla(150, 84%, 40%, 0.2); }
                .badge-standard.private { color: var(--accent-purple); border-color: hsla(263, 70%, 50%, 0.2); }

                .portal-tabs {
                    display: flex;
                    gap: 32px;
                    margin-bottom: 24px;
                    border-bottom: 1px solid var(--glass-border);
                    padding: 0 8px;
                }
                .portal-tab {
                    background: none;
                    border: none;
                    padding: 12px 4px;
                    color: var(--text-dim);
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    position: relative;
                    transition: all 0.2s;
                }
                .portal-tab:hover { color: var(--text-primary); }
                .portal-tab.active { color: var(--accent-blue); }
                .portal-tab.active::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: var(--accent-blue);
                    box-shadow: 0 0 10px var(--accent-blue-glow);
                }
                .count-pill {
                    font-size: 10px;
                    background: var(--glass-bg);
                    padding: 2px 8px;
                    border-radius: 10px;
                    color: var(--text-dim);
                }
                .portal-tab.active .count-pill { color: var(--accent-blue); background: hsla(217, 91%, 60%, 0.1); }

                .icon-circle {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .icon-circle.blue { background: hsla(217, 91%, 60%, 0.1); color: var(--accent-blue); }

                .avatar-circle {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, var(--accent-purple), var(--accent-indigo));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    font-size: 14px;
                }

                .empty-row {
                    text-align: center;
                    padding: 80px !important;
                    color: var(--text-dim);
                    font-size: 14px;
                }

                .sync-btn {
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    color: var(--text-secondary);
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .sync-btn:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
                .spinning svg { animation: spin 1s linear infinite; }

                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default TeamDetailsPage;
