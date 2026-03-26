import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { PurviewService } from '../services/purview';
import { ArrowLeft, Scan, Database, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToken } from '../hooks/useToken';
import { useActiveTenant } from '../hooks/useActiveTenant';
import Loader3D from './Loader3D';

const ScanningPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const { getAccessToken: acquireToken } = useToken();
    const activeTenantId = useActiveTenant();
    const [dataSources, setDataSources] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDataSources();
    }, [activeTenantId]);

    const fetchDataSources = async () => {
        if (accounts.length === 0) return;
        setLoading(true);

        try {
            const accessToken = await acquireToken({
                scopes: ['https://purview.azure.net/.default']
            });

            const sources = await PurviewService.getDataSources(accessToken);
            setDataSources(sources);
        } catch (error) {
            console.error('Error fetching data sources:', error);
            console.warn('Purview API call failed. Please configure Purview endpoint in .env');
            setDataSources([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        return status === 'Active' ? <CheckCircle size={16} color="var(--accent-success)" /> : <XCircle size={16} color="var(--text-dim)" />;
    };

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-4">
                <div className="flex-center flex-gap-3">
                    <button onClick={() => navigate('/service/purview')} className="back-btn">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="title-gradient" style={{ fontSize: '22px' }}>Data Sources & Scanning</h1>
                        <p style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Registered data sources and scan history</p>
                    </div>
                </div>
            </header>

            {loading ? (
                <Loader3D showOverlay={false} />
            ) : dataSources.length === 0 ? (
                <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <Scan size={48} style={{ opacity: 0.3, marginBottom: '16px', color: 'var(--text-dim)' }} />
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>No data sources found. Configure Purview endpoint to load data.</p>
                </div>
            ) : (
                <div className="glass-card" style={{ padding: '24px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Data Source</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Type</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Last Scan</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Scans</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dataSources.map((source, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Database size={16} color="var(--accent-cyan)" />
                                            {source.name}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{source.type}</td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {getStatusIcon(source.status)}
                                            <span style={{ fontSize: '12px', color: source.status === 'Active' ? 'var(--accent-success)' : 'var(--text-dim)' }}>
                                                {source.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} />
                                        {source.lastScan}
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: 'var(--accent-blue)', fontWeight: 700, textAlign: 'right' }}>
                                        {source.scansCompleted}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ScanningPage;
