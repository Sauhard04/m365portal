import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { loginRequest } from '../authConfig';
import { SharePointService } from '../services/sharepoint/sharepoint.service';
import Loader3D from './Loader3D';
import { Globe, ArrowLeft, RefreshCw, Search, ExternalLink, Calendar, Clock, Filter, Grid, List as ListIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SharePointSitesPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sites, setSites] = useState([]);
    const [filteredSites, setFilteredSites] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');

    const fetchSites = async (isManual = false) => {
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

            const data = await SharePointService.getSites(client, 999);
            setSites(data);
            setFilteredSites(data);
        } catch (err) {
            console.error('Failed to fetch SharePoint sites:', err);
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
        fetchSites();
    }, [instance, accounts]);

    useEffect(() => {
        let filtered = [...sites];

        // Apply Tab Filter
        if (activeTab !== 'All') {
            filtered = filtered.filter(site => {
                const type = getSiteType(site.webUrl);
                return (activeTab === 'Team Sites' && type === 'Team Site') ||
                    (activeTab === 'Communication Sites' && type === 'Communication Site');
            });
        }

        // Apply Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(site =>
                site.displayName?.toLowerCase().includes(term) ||
                site.name?.toLowerCase().includes(term) ||
                site.webUrl?.toLowerCase().includes(term)
            );
        }

        setFilteredSites(filtered);
    }, [sites, searchTerm, activeTab]);

    const getSiteType = (webUrl) => {
        if (!webUrl) return 'Other';
        if (webUrl.includes('/teams/')) return 'Team Site';
        if (webUrl.includes('/sites/')) return 'Communication Site';
        return 'Other';
    };

    const getSiteTypeColor = (type) => {
        switch (type) {
            case 'Team Site': return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' };
            case 'Communication Site': return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' };
            default: return { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' };
        }
    };

    if (loading) {
        return <Loader3D showOverlay={true} text="Loading SharePoint Sites..." />;
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
                            <Globe size={24} style={{ color: '#3b82f6' }} />
                            SharePoint Sites
                        </h1>
                        <p className="page-subtitle">{filteredSites.length} sites found</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchSites(true)}
                    disabled={refreshing}
                    className="glass-btn"
                    style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                    <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Search and Filters */}
            <div className="filters-section spacing-v-6">
                <div className="search-and-tabs glass-card">
                    <div className="tabs-nav">
                        {['All', 'Team Sites', 'Communication Sites'].map(tab => (
                            <button
                                key={tab}
                                className={`tab-item ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                                {activeTab === tab && <motion.div layoutId="activeTabUnderline" className="tab-underline" />}
                            </button>
                        ))}
                    </div>
                    <div className="search-box-enhanced">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search sites by name or URL..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="clear-btn" onClick={() => setSearchTerm('')}>&times;</button>
                        )}
                    </div>
                </div>
            </div>

            {/* Sites Grid */}
            <div className="sites-grid">
                <AnimatePresence mode="popLayout">
                    {filteredSites.length > 0 ? (
                        filteredSites.map((site, idx) => {
                            const siteType = getSiteType(site.webUrl);
                            const typeStyle = getSiteTypeColor(siteType);
                            return (
                                <motion.div
                                    key={site.id || idx}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                                    className="site-card glass-card clickable"
                                    onClick={() => navigate(`/service/sharepoint/site/${site.id}`)}
                                >
                                    <div className="site-header">
                                        <span
                                            className="type-badge"
                                            style={{ background: typeStyle.bg, color: typeStyle.color }}
                                        >
                                            {siteType}
                                        </span>
                                        <div className="header-actions">
                                            {site.webUrl && (
                                                <a
                                                    href={site.webUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="external-link"
                                                    onClick={(e) => e.stopPropagation()}
                                                    title="Open in SharePoint"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="site-info">
                                        <div className="site-avatar" style={{ background: `linear-gradient(135deg, ${typeStyle.color}33, ${typeStyle.color}11)` }}>
                                            <Globe size={20} style={{ color: typeStyle.color }} />
                                        </div>
                                        <div className="site-text">
                                            <h3 className="site-name">{site.displayName || site.name || 'Unnamed Site'}</h3>
                                            <p className="site-url" title={site.webUrl}>{site.webUrl || 'No URL'}</p>
                                        </div>
                                    </div>
                                    <div className="site-meta">
                                        <div className="meta-item">
                                            <Calendar size={12} />
                                            <span>Created: {site.createdDateTime ? new Date(site.createdDateTime).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="meta-item">
                                            <Clock size={12} />
                                            <span>Modified: {site.lastModifiedDateTime ? new Date(site.lastModifiedDateTime).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="card-footer-glow" style={{ background: typeStyle.color }} />
                                </motion.div>
                            );
                        })
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="no-data-state-premium"
                        >
                            <div className="empty-icon-wrapper">
                                <Search size={48} />
                                <Filter size={24} className="sub-icon" />
                            </div>
                            <h3>No matching sites found</h3>
                            <p>Try adjusting your search or filters to find what you're looking for.</p>
                            <button className="glass-btn" onClick={() => { setSearchTerm(''); setActiveTab('All'); }}>
                                Reset All Filters
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`
                .page-container { padding: 0; }
                .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
                .header-left { display: flex; align-items: center; gap: 20px; }
                .btn-back-nav { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 12px; }
                .page-title { display: flex; align-items: center; gap: 12px; font-size: 24px; font-weight: 700; margin: 0; }
                .page-subtitle { font-size: 14px; color: var(--text-secondary); margin: 4px 0 0 0; }
                
                .search-and-tabs {
                    padding: 8px; border-radius: 16px; display: flex; flex-direction: column; gap: 16px;
                }
                .tabs-nav { display: flex; gap: 8px; padding: 4px; background: rgba(0,0,0,0.2); border-radius: 12px; width: fit-content; }
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
                    transition: all 0.3s ease;
                }
                .search-box-enhanced:focus-within { border-color: var(--accent-blue); box-shadow: 0 0 0 2px var(--accent-blue-alpha); }
                .search-box-enhanced input { flex: 1; background: none; border: none; color: var(--text-primary); font-size: 14px; outline: none; }
                .clear-btn { background: none; border: none; color: var(--text-tertiary); font-size: 18px; cursor: pointer; padding: 0 4px; }
                
                .sites-grid {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;
                }
                .site-card {
                    position: relative; padding: 24px; border-radius: 20px; cursor: pointer;
                    display: flex; flex-direction: column; gap: 20px; overflow: hidden;
                    transition: border-color 0.3s ease;
                }
                .site-card:hover { border-color: var(--accent-blue-alpha); transform: translateY(-4px); }
                .site-header { display: flex; justify-content: space-between; align-items: center; }
                .type-badge { padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
                .external-link { color: var(--accent-blue); padding: 6px; border-radius: 8px; background: var(--bg-secondary); }
                .site-info { display: flex; gap: 16px; align-items: center; }
                .site-avatar { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .site-text { flex: 1; min-width: 0; }
                .site-name { font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .site-url { font-size: 12px; color: var(--text-tertiary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .site-meta { display: flex; flex-direction: column; gap: 8px; padding-top: 16px; border-top: 1px solid var(--glass-border); }
                .meta-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-secondary); }
                .card-footer-glow {
                    position: absolute; bottom: -20px; left: 50%; width: 60%; height: 2px;
                    transform: translateX(-50%); filter: blur(15px); opacity: 0; transition: opacity 0.3s ease;
                }
                .site-card:hover .card-footer-glow { opacity: 0.5; }

                .no-data-state-premium {
                    grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center;
                    justify-content: center; padding: 80px 40px; text-align: center; gap: 16px;
                }
                .empty-icon-wrapper { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); }
                .sub-icon { position: absolute; bottom: 10px; right: 10px; background: var(--bg-primary); border-radius: 50%; padding: 4px; }
                .no-data-state-premium h3 { font-size: 20px; color: var(--text-primary); margin: 0; }
                .no-data-state-premium p { color: var(--text-tertiary); max-width: 300px; margin: 0; font-size: 14px; }

                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default SharePointSitesPage;
