import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { loginRequest } from '../authConfig';
import { SharePointService } from '../services/sharepoint/sharepoint.service';
import Loader3D from './Loader3D';
import { Globe, ArrowLeft, RefreshCw, Search, ExternalLink, Calendar, Clock } from 'lucide-react';

const SharePointSitesPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sites, setSites] = useState([]);
    const [filteredSites, setFilteredSites] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

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

            const data = await SharePointService.getSites(client, 200);
            setSites(data);
            setFilteredSites(data);
        } catch (err) {
            console.error('Failed to fetch SharePoint sites:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSites();
    }, [instance, accounts]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredSites(sites);
            return;
        }

        const filtered = sites.filter(site =>
            site.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            site.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            site.webUrl?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        setFilteredSites(filtered);
    }, [sites, searchTerm]);

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
                    <button className="back-button" onClick={() => navigate('/service/sharepoint')}>
                        <ArrowLeft size={18} />
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
                        placeholder="Search sites..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Sites Grid */}
            <div className="sites-grid">
                {filteredSites.length > 0 ? (
                    filteredSites.map((site, idx) => {
                        const siteType = getSiteType(site.webUrl);
                        const typeStyle = getSiteTypeColor(siteType);
                        return (
                            <div key={site.id || idx} className="site-card glass-card">
                                <div className="site-header">
                                    <span
                                        className="type-badge"
                                        style={{ background: typeStyle.bg, color: typeStyle.color }}
                                    >
                                        {siteType}
                                    </span>
                                    {site.webUrl && (
                                        <a
                                            href={site.webUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="external-link"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                    )}
                                </div>
                                <h3 className="site-name">{site.displayName || site.name || 'Unnamed Site'}</h3>
                                <p className="site-url">{site.webUrl || 'No URL'}</p>
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
                            </div>
                        );
                    })
                ) : (
                    <div className="no-data-state">
                        <Globe size={48} style={{ opacity: 0.3 }} />
                        <p>No SharePoint sites found</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .page-container { padding: 0; }
                .page-header {
                    display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
                }
                .header-left { display: flex; align-items: center; gap: 16px; }
                .back-button {
                    background: var(--glass-bg); border: 1px solid var(--glass-border);
                    border-radius: 10px; padding: 10px; cursor: pointer; color: var(--text-primary);
                }
                .page-title { display: flex; align-items: center; gap: 12px; font-size: 20px; margin: 0; }
                .page-subtitle { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0 0; }
                .refresh-button {
                    display: flex; align-items: center; gap: 8px; padding: 10px 20px;
                    background: var(--glass-bg); border: 1px solid var(--glass-border);
                    border-radius: 10px; color: var(--text-primary); cursor: pointer;
                }
                .filters-bar {
                    display: flex; gap: 16px; padding: 16px; margin-bottom: 20px; border-radius: 12px;
                }
                .search-box {
                    display: flex; align-items: center; gap: 8px; flex: 1;
                    background: var(--bg-tertiary); padding: 8px 12px; border-radius: 8px;
                    border: 1px solid var(--glass-border);
                }
                .search-box input {
                    flex: 1; background: none; border: none;
                    color: var(--text-primary); font-size: 13px; outline: none;
                }
                .sites-grid {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px;
                }
                .site-card {
                    padding: 20px; border-radius: 16px; transition: all 0.3s ease;
                }
                .site-card:hover {
                    transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                }
                .site-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                .type-badge {
                    padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;
                }
                .external-link { color: var(--accent-blue); padding: 4px; }
                .site-name {
                    font-size: 14px; font-weight: 600; margin: 0 0 8px 0;
                    color: var(--text-primary); line-height: 1.4;
                }
                .site-url {
                    font-size: 11px; color: var(--text-tertiary); margin: 0 0 12px 0;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .site-meta { display: flex; flex-direction: column; gap: 6px; }
                .meta-item {
                    display: flex; align-items: center; gap: 6px;
                    font-size: 11px; color: var(--text-tertiary);
                }
                .no-data-state {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 60px; color: var(--text-tertiary); gap: 12px; grid-column: 1 / -1;
                }
                .loading-container {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    height: 60vh; gap: 16px;
                }
                .loading-spinner {
                    width: 40px; height: 40px; border: 3px solid var(--glass-border);
                    border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 1s linear infinite;
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default SharePointSitesPage;
