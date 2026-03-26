import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Client } from '@microsoft/microsoft-graph-client';
import { sharepointScopes } from '../authConfig';
import { SharePointService } from '../services/sharepoint/sharepoint.service';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import Loader3D from './Loader3D';
import { Cloud, ArrowLeft, RefreshCw, Search, ExternalLink, User, Database } from 'lucide-react';

const OneDrivePage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [oneDriveAccounts, setOneDriveAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchOneDriveAccounts = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const accessToken = await acquireToken({
                ...sharepointScopes
            });

            const client = Client.init({
                authProvider: (done) => done(null, accessToken)
            });

            const data = await SharePointService.getOneDriveAccounts(client);
            setOneDriveAccounts(data);
            setFilteredAccounts(data);
        } catch (err) {
            console.error('Failed to fetch OneDrive accounts:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOneDriveAccounts();
    }, [activeTenantId]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredAccounts(oneDriveAccounts);
            return;
        }

        const filtered = oneDriveAccounts.filter(acc =>
            acc.owner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acc.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        setFilteredAccounts(filtered);
    }, [oneDriveAccounts, searchTerm]);

    const getStorageColor = (percentUsed) => {
        if (percentUsed >= 90) return '#ef4444';
        if (percentUsed >= 75) return '#f59e0b';
        return '#22c55e';
    };

    if (loading) {
        return <Loader3D showOverlay={true} text="Loading OneDrive Accounts..." />;
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
                            <Cloud size={24} style={{ color: '#f59e0b' }} />
                            OneDrive Accounts
                        </h1>
                        <p className="page-subtitle">{filteredAccounts.length} accounts found</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchOneDriveAccounts(true)}
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
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* OneDrive Grid */}
            <div className="onedrive-grid">
                {filteredAccounts.length > 0 ? (
                    filteredAccounts.map((account, idx) => {
                        const storageColor = getStorageColor(account.percentUsed);
                        return (
                            <div key={account.id || idx} className="onedrive-card glass-card">
                                <div className="card-header">
                                    <div className="user-avatar">
                                        <User size={20} />
                                    </div>
                                    {account.webUrl && (
                                        <a
                                            href={account.webUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="external-link"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                    )}
                                </div>
                                <h3 className="user-name">{account.owner}</h3>
                                <p className="user-email">{account.email}</p>

                                <div className="storage-info">
                                    <div className="storage-bar-container">
                                        <div
                                            className="storage-bar"
                                            style={{
                                                width: `${account.percentUsed}%`,
                                                background: storageColor
                                            }}
                                        />
                                    </div>
                                    <div className="storage-details">
                                        <span style={{ color: storageColor, fontWeight: 600 }}>
                                            {account.percentUsed}% used
                                        </span>
                                        <span>{account.usedGB} / {account.totalGB} GB</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="no-data-state">
                        <Cloud size={48} style={{ opacity: 0.3 }} />
                        <p>No OneDrive accounts found</p>
                    </div>
                )}
            </div>

            <style>{`
                .page-container { padding: 0; }
                .page-header {
                    display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
                }
                .header-left { display: flex; align-items: center; gap: 16px; }
                .btn-back-nav { display: flex; align-items: center; gap: 8px; padding: 8px 16px; height: 40px; }
                .page-title { display: flex; align-items: center; gap: 12px; font-size: 20px; margin: 0; }
                .page-subtitle { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0 0; }
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
                .onedrive-grid {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;
                }
                .onedrive-card {
                    padding: 20px; border-radius: 16px; transition: all 0.3s ease;
                }
                .onedrive-card:hover {
                    transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
                }
                .card-header { 
                    display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; 
                }
                .user-avatar {
                    width: 40px; height: 40px; border-radius: 10px;
                    background: linear-gradient(135deg, #f59e0b, #ef4444);
                    display: flex; align-items: center; justify-content: center;
                    color: white;
                }
                .external-link { color: var(--accent-blue); padding: 4px; }
                .user-name {
                    font-size: 14px; font-weight: 600; margin: 0 0 4px 0;
                    color: var(--text-primary); line-height: 1.4;
                }
                .user-email {
                    font-size: 11px; color: var(--text-tertiary); margin: 0 0 16px 0;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .storage-info { margin-top: 16px; }
                .storage-bar-container {
                    width: 100%; height: 8px; background: var(--bg-tertiary);
                    border-radius: 4px; overflow: hidden; margin-bottom: 8px;
                }
                .storage-bar {
                    height: 100%; border-radius: 4px;
                    transition: width 0.3s ease;
                }
                .storage-details {
                    display: flex; justify-content: space-between; align-items: center;
                    font-size: 11px; color: var(--text-secondary);
                }
                .no-data-state {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 60px; color: var(--text-tertiary); gap: 12px; grid-column: 1 / -1;
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default OneDrivePage;
