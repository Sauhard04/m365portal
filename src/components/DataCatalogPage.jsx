import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { PurviewService } from '../services/purview';
import { motion } from 'framer-motion';
import { Search, Filter, Database, FileText, Tag, User, Calendar, ArrowLeft } from 'lucide-react';
import Loader3D from './Loader3D';

const DataCatalogPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();

    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        fetchAssets();
    }, [accounts]);

    const fetchAssets = async () => {
        if (accounts.length === 0) return;
        setLoading(true);

        try {
            const response = await instance.acquireTokenSilent({
                scopes: ['https://purview.azure.net/.default'],
                account: accounts[0]
            });

            const results = await PurviewService.searchCatalog(response.accessToken, {
                keywords: '*',
                limit: 100
            });

            setAssets(results);
        } catch (error) {
            console.error('Error fetching assets:', error);
            console.warn('Purview API call failed. Please configure Purview endpoint in .env');
            setAssets([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredAssets = assets.filter(asset => {
        const matchesSearch = asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.entityType?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterType === 'all' || asset.entityType === filterType;
        return matchesSearch && matchesFilter;
    });

    const getTypeColor = (type) => {
        const colors = {
            'Azure SQL Database': 'var(--accent-blue)',
            'Azure Data Lake': 'var(--accent-cyan)',
            'SQL Server': 'var(--accent-purple)',
            'Power BI Dataset': 'var(--accent-warning)',
            'Azure Blob Storage': 'var(--accent-success)',
            default: 'var(--accent-indigo)'
        };
        return colors[type] || colors.default;
    };

    const getClassificationColor = (classification) => {
        const colors = {
            'PII': 'var(--accent-error)',
            'Confidential': 'var(--accent-warning)',
            'Highly Confidential': 'var(--accent-pink)',
            'Financial': 'var(--accent-purple)',
            'Internal': 'var(--accent-blue)',
            'Public': 'var(--accent-success)'
        };
        return colors[classification] || 'var(--text-dim)';
    };

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-8">
                <div className="flex-center flex-gap-3">
                    <button onClick={() => navigate('/service/purview')} className="back-btn">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="title-gradient" style={{ fontSize: '32px' }}>Data Catalog</h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Search and browse registered data assets</p>
                    </div>
                </div>
            </header>

            {/* Search and Filter Bar */}
            <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input
                            type="text"
                            placeholder="Search assets by name or type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 40px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                fontSize: '13px'
                            }}
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{
                            padding: '10px 12px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Types</option>
                        <option value="Azure SQL Database">Azure SQL Database</option>
                        <option value="Azure Data Lake">Azure Data Lake</option>
                        <option value="SQL Server">SQL Server</option>
                        <option value="Power BI Dataset">Power BI Dataset</option>
                        <option value="Azure Blob Storage">Azure Blob Storage</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <Loader3D showOverlay={false} />
            ) : (
                <>
                    {/* Results Count */}
                    <div style={{ marginBottom: '16px', color: 'var(--text-dim)', fontSize: '13px' }}>
                        {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''} found
                    </div>

                    {/* Assets Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                        {filteredAssets.map((asset, idx) => (
                            <motion.div
                                key={asset.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                whileHover={{ y: -5, scale: 1.02 }}
                                className="glass-card"
                                onClick={() => navigate(`/service/purview/asset/${asset.id}`)}
                                style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}
                            >
                                {/* Header */}
                                <div className="flex-between">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Database size={20} style={{ color: getTypeColor(asset.entityType) }} />
                                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{asset.name}</span>
                                    </div>
                                </div>

                                {/* Type Badge */}
                                <div style={{
                                    display: 'inline-flex',
                                    alignSelf: 'flex-start',
                                    padding: '4px 10px',
                                    background: `${getTypeColor(asset.entityType)}20`,
                                    border: `1px solid ${getTypeColor(asset.entityType)}`,
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: getTypeColor(asset.entityType)
                                }}>
                                    {asset.entityType}
                                </div>

                                {/* Classifications */}
                                {asset.classifications && asset.classifications.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {asset.classifications.map((cls, i) => (
                                            <span key={i} style={{
                                                padding: '3px 8px',
                                                background: `${getClassificationColor(cls)}15`,
                                                border: `1px solid ${getClassificationColor(cls)}40`,
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                color: getClassificationColor(cls),
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                <Tag size={10} />
                                                {cls}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Metadata */}
                                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <User size={12} />
                                            {asset.owner}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={12} />
                                            {asset.lastModified}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {filteredAssets.length === 0 && (
                        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                            <Database size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>No assets found matching your search criteria</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DataCatalogPage;
