import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { loginRequest, sharepointScopes } from '../authConfig';
import { SharePointService } from '../services/sharepoint/sharepoint.service';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import Loader3D from './Loader3D';
import { Bell, ArrowLeft, RefreshCw, Search, Calendar, Tag, ChevronDown, ChevronUp, ExternalLink, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageCenterPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [messages, setMessages] = useState([]);
    const [filteredMessages, setFilteredMessages] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [expandedIds, setExpandedIds] = useState(new Set());

    const fetchMessages = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const accessToken = await acquireToken({
                ...sharepointScopes
            });

            const client = Client.init({
                authProvider: (done) => done(null, accessToken)
            });

            const data = await SharePointService.getServiceMessages(client);
            setMessages(data);
            setFilteredMessages(data);
        } catch (err) {
            console.error('Failed to fetch service messages:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, [activeTenantId]);

    useEffect(() => {
        let filtered = [...messages];

        if (selectedCategory !== 'All') {
            filtered = filtered.filter(m => m.category === selectedCategory);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(m =>
                m.title?.toLowerCase().includes(term) ||
                m.id?.toLowerCase().includes(term)
            );
        }

        setFilteredMessages(filtered);
    }, [messages, searchTerm, selectedCategory]);

    const toggleExpand = (id) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    const categories = ['All', ...new Set(messages.map(m => m.category))];

    if (loading) {
        return <Loader3D showOverlay={true} text="Loading Message Center..." />;
    }

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <div className="header-left">
                    <button className="glass-btn btn-back-nav" onClick={() => navigate('/service/sharepoint')}>
                        <ArrowLeft size={18} />
                        Back to Dashboard
                    </button>
                    <div>
                        <h1 className="page-title">
                            <Bell size={24} style={{ color: '#3b82f6' }} />
                            Message Center
                        </h1>
                        <p className="page-subtitle">Microsoft 365 Service Announcements</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchMessages(true)}
                    disabled={refreshing}
                    className="glass-btn"
                    style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                    <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Filters */}
            <div className="filters-section spacing-v-6">
                <div className="search-and-tabs glass-card">
                    <div className="tabs-nav">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`tab-item ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                                {selectedCategory === cat && <motion.div layoutId="activeCatUnderline" className="tab-underline" />}
                            </button>
                        ))}
                    </div>
                    <div className="search-box-enhanced">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by title or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Messages List */}
            <div className="messages-list">
                {filteredMessages.length > 0 ? (
                    filteredMessages.map((msg, idx) => {
                        const isExpanded = expandedIds.has(msg.id);
                        return (
                            <motion.div
                                key={msg.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`message-card glass-card ${isExpanded ? 'active' : ''}`}
                            >
                                <div className="message-summary" onClick={() => toggleExpand(msg.id)}>
                                    <div className="summary-left">
                                        <div className="category-tag">
                                            <Tag size={12} />
                                            {msg.category}
                                        </div>
                                        <h3 className="message-title">{msg.title}</h3>
                                        <div className="message-meta">
                                            <div className="meta-item">
                                                <Calendar size={12} />
                                                <span>Modified: {new Date(msg.lastModifiedDateTime).toLocaleDateString()}</span>
                                            </div>
                                            <div className="meta-item">
                                                <Info size={12} />
                                                <span>ID: {msg.id}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="summary-right">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="message-content"
                                        >
                                            <div className="content-inner">
                                                {msg.details?.[0]?.value ? (
                                                    <div className="html-content" dangerouslySetInnerHTML={{ __html: msg.details[0].value }} />
                                                ) : (
                                                    <p className="no-details">No further details provided for this message.</p>
                                                )}

                                                <div className="content-footer">
                                                    <a
                                                        href={`https://admin.microsoft.com/#/servicehealth/history/:/messages/${msg.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="glass-btn btn-external"
                                                    >
                                                        <ExternalLink size={14} />
                                                        View in M365 Admin Center
                                                    </a>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="no-data-state-premium">
                        <Search size={48} />
                        <h3>No messages found</h3>
                        <p>Adjust your search or category filters.</p>
                    </div>
                )}
            </div>

            <style>{`
                .page-container { padding: 0; }
                .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
                .header-left { display: flex; align-items: center; gap: 20px; }
                .btn-back-nav { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 12px; }
                .page-title { display: flex; align-items: center; gap: 12px; font-size: 24px; font-weight: 700; margin: 0; }
                .page-subtitle { font-size: 14px; color: var(--text-secondary); margin: 4px 0 0 0; }

                .search-and-tabs { padding: 8px; border-radius: 16px; display: flex; flex-direction: column; gap: 16px; }
                .tabs-nav { display: flex; gap: 8px; padding: 4px; background: rgba(0,0,0,0.2); border-radius: 12px; width: fit-content; flex-wrap: wrap; }
                .tab-item {
                    position: relative; padding: 8px 16px; border: none; background: none; color: var(--text-tertiary);
                    font-size: 13px; font-weight: 600; cursor: pointer; transition: color 0.3s ease;
                }
                .tab-item.active { color: var(--text-primary); }
                .tab-underline {
                    position: absolute; bottom: 0; left: 0; right: 0; height: 100%;
                    background: var(--glass-bg); border-radius: 8px; z-index: -1;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                }

                .search-box-enhanced {
                    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
                    background: var(--bg-tertiary); border-radius: 12px; border: 1px solid var(--glass-border);
                }
                .search-box-enhanced input { flex: 1; background: none; border: none; color: var(--text-primary); font-size: 14px; outline: none; }

                .messages-list { display: flex; flex-direction: column; gap: 16px; }
                .message-card { padding: 0; border-radius: 20px; overflow: hidden; transition: all 0.3s ease; }
                .message-card.active { border-color: var(--accent-blue-alpha); }
                .message-summary { padding: 24px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 20px; }
                .message-summary:hover { background: rgba(255,255,255,0.02); }
                .summary-left { flex: 1; min-width: 0; }
                .category-tag {
                    display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
                    background: var(--accent-blue-alpha); color: var(--accent-blue);
                    font-size: 10px; font-weight: 700; border-radius: 8px; text-transform: uppercase; margin-bottom: 12px;
                }
                .message-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0 0 8px 0; }
                .message-meta { display: flex; gap: 20px; }
                .meta-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-tertiary); }
                .summary-right { color: var(--text-tertiary); }

                .message-content { border-top: 1px solid var(--glass-border); background: rgba(0,0,0,0.1); }
                .content-inner { padding: 24px; }
                .html-content { font-size: 14px; line-height: 1.6; color: var(--text-secondary); }
                .html-content :global(p) { margin-bottom: 12px; }
                .html-content :global(a) { color: var(--accent-blue); text-decoration: underline; }
                .content-footer { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--glass-border); }
                .btn-external { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }

                .no-data-state-premium { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 40px; text-align: center; gap: 16px; color: var(--text-tertiary); }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default MessageCenterPage;
