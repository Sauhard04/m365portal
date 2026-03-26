import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { PurviewService } from '../services/purview';
import { ArrowLeft, Shield, Users, Folder } from 'lucide-react';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import Loader3D from './Loader3D';

const CollectionsPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCollections();
    }, [activeTenantId]);

    const fetchCollections = async () => {
        if (accounts.length === 0) return;
        setLoading(true);

        try {
            const accessToken = await acquireToken({
                scopes: ['https://purview.azure.net/.default']
            });

            const collectionsData = await PurviewService.getCollections(accessToken);
            setCollections(collectionsData);
        } catch (error) {
            console.error('Error fetching collections:', error);
            console.warn('Purview API call failed. Please configure Purview endpoint in .env');
            setCollections([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-4">
                <div className="flex-center flex-gap-3">
                    <button onClick={() => navigate('/service/purview')} className="back-btn">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="title-gradient" style={{ fontSize: '22px' }}>Collections & Access Control</h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '11px' }}>RBAC and collection hierarchy management</p>
                    </div>
                </div>
            </header>

            {loading ? (
                <Loader3D showOverlay={false} />
            ) : collections.length === 0 ? (
                <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <Folder size={48} style={{ opacity: 0.3, marginBottom: '16px', color: 'var(--text-dim)' }} />
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>No collections found. Configure Purview endpoint to load data.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {collections.map((collection, idx) => (
                        <div key={idx} className="glass-card" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-cyan))',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Folder size={24} color="white" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{collection.name}</div>
                                    {collection.parent && (
                                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Parent: {collection.parent}</div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        <Users size={16} />
                                        {collection.roleAssignments}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>Roles</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        <Folder size={16} />
                                        {collection.subcollections}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>Subcollections</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CollectionsPage;
