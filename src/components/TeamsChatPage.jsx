import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { motion, AnimatePresence } from 'framer-motion';
import { teamsScopes } from '../authConfig';
import { TeamsService } from '../services/teams/teams.service';
import Loader3D from './Loader3D';
import {
    MessageSquare, ArrowLeft, RefreshCw, ExternalLink, Users, Clock, Hash
} from 'lucide-react';

const TeamsChatPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [chats, setChats] = useState([]);
    const [error, setError] = useState(null);

    const fetchChats = async (isManual = false) => {
        if (accounts.length === 0) return;

        if (isManual) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const account = accounts[0];
            const tokenResponse = await instance.acquireTokenSilent({
                ...teamsScopes,
                account
            });

            const client = Client.init({
                authProvider: (done) => done(null, tokenResponse.accessToken)
            });

            const data = await TeamsService.getMyChats(client);
            setChats(data);
        } catch (err) {
            console.error('Failed to fetch chats:', err);
            setError(err.message || "Failed to load chats");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchChats();
    }, [instance, accounts]);

    const getChatTitle = (chat) => {
        if (chat.topic) return chat.topic;
        if (chat.chatType === 'oneOnOne') {
            const otherUser = chat.members?.find(p => p.id !== accounts[0]?.localAccountId);
            return otherUser?.displayName || 'Private Chat';
        }
        return 'Group Chat';
    };

    const getChatLink = (chatId) => {
        return `https://teams.microsoft.com/l/chat/${chatId}/0?tenantId=${accounts[0]?.tenantId}`;
    };

    if (loading) return <Loader3D showOverlay={true} text="Localized Conversations..." />;

    return (
        <div className="animate-in">
            <button className="btn-back" onClick={() => navigate('/service/teams')}>
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Dashboard
            </button>

            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>My Conversations</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Recent private chats and group discussions</p>
                </div>
                <div className="flex-gap-2">
                    <button
                        className={`sync-btn ${refreshing ? 'spinning' : ''}`}
                        onClick={() => fetchChats(true)}
                        title="Sync Chats"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </header>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40%' }}>Conversation</th>
                                <th style={{ width: '15%' }}>Type</th>
                                <th style={{ width: '30%' }}>Last Activity</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {chats.length > 0 ? chats.map((chat, i) => (
                                <tr key={chat.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div className={`chat-avatar-icon ${chat.chatType}`}>
                                                {chat.chatType === 'oneOnOne' ? <Users size={16} /> : <Hash size={16} />}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{getChatTitle(chat)}</span>
                                                <span style={{ fontSize: '12px', color: 'var(--text-dim)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {chat.lastMessagePreview?.bodyContent || 'No message preview available'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`chat-type-badge ${chat.chatType}`}>
                                            {chat.chatType === 'oneOnOne' ? '1:1 Chat' : 'Group'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                            <Clock size={12} />
                                            {chat.lastUpdatedDateTime ? new Date(chat.lastUpdatedDateTime).toLocaleString() : 'Recent'}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <a
                                            href={getChatLink(chat.id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="action-link-btn"
                                        >
                                            <ExternalLink size={14} />
                                            Open
                                        </a>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" className="empty-row">No recent conversations found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .chat-avatar-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .chat-avatar-icon.oneOnOne { background: hsla(217, 91%, 60%, 0.1); color: var(--accent-blue); }
                .chat-avatar-icon.group { background: hsla(263, 70%, 50%, 0.1); color: var(--accent-purple); }

                .chat-type-badge {
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .chat-type-badge.oneOnOne { background: hsla(217, 91%, 60%, 0.1); color: var(--accent-blue); }
                .chat-type-badge.group { background: hsla(263, 70%, 50%, 0.1); color: var(--accent-purple); }

                .action-link-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: var(--accent-blue);
                    text-decoration: none;
                    font-size: 12px;
                    font-weight: 700;
                    padding: 6px 12px;
                    border-radius: 8px;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                .action-link-btn:hover {
                    background: hsla(217, 91%, 60%, 0.1);
                    border-color: hsla(217, 91%, 60%, 0.2);
                }

                .empty-row {
                    text-align: center;
                    padding: 100px !important;
                    color: var(--text-dim);
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

export default TeamsChatPage;
