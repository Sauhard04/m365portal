import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { PurviewService } from '../services/purview';
import { ArrowLeft, FileKey, CheckCircle } from 'lucide-react';
import Loader3D from './Loader3D';

const PoliciesPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPolicies();
    }, [accounts]);

    const fetchPolicies = async () => {
        if (accounts.length === 0) return;
        setLoading(true);

        try {
            const response = await instance.acquireTokenSilent({
                scopes: ['https://purview.azure.net/.default'],
                account: accounts[0]
            });

            const policiesData = await PurviewService.getPolicies(response.accessToken);
            setPolicies(policiesData);
        } catch (error) {
            console.error('Error fetching policies:', error);
            console.warn('Purview API call failed. Please configure Purview endpoint in .env');
            setPolicies([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-8">
                <div className="flex-center flex-gap-3">
                    <button onClick={() => navigate('/service/purview')} className="back-btn">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="title-gradient" style={{ fontSize: '32px' }}>Policy Management</h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Metadata policies and access controls</p>
                    </div>
                </div>
            </header>

            {loading ? (
                <Loader3D showOverlay={false} />
            ) : policies.length === 0 ? (
                <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <FileKey size={48} style={{ opacity: 0.3, marginBottom: '16px', color: 'var(--text-dim)' }} />
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>No policies found. Configure Purview endpoint to load data.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {policies.map((policy, idx) => (
                        <div
                            key={idx}
                            className="glass-card"
                            style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', transition: 'transform 0.2s', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                        >

                            <div style={{
                                width: '56px',
                                height: '56px',
                                background: 'linear-gradient(135deg, var(--accent-error), var(--accent-pink))',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <FileKey size={28} color="white" />
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{policy.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Scope: {policy.scope} • {policy.resources} resources • Modified {policy.lastModified}</div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--accent-success)20', borderRadius: '8px', border: '1px solid var(--accent-success)' }}>
                                <CheckCircle size={14} color="var(--accent-success)" />
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-success)' }}>{policy.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PoliciesPage;
