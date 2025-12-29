import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { Loader2, CheckCircle2, Globe, ShieldAlert, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';

const DomainsPage = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDomains = async () => {
            if (accounts.length === 0) return;
            try {
                const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                const graphService = new GraphService(response.accessToken);
                const data = await graphService.getDomains();
                setDomains(data);
            } catch (err) {
                setError("Organization domains could not be retrieved.");
            } finally {
                setLoading(false);
            }
        };
        fetchDomains();
    }, [instance, accounts]);

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--accent-blue)" />
            </div>
        );
    }

    const verifiedCount = domains.filter(d => d.state === 'Verified').length;

    return (
        <div className="animate-in">
            <button onClick={() => navigate('/service/admin')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Dashboard
            </button>

            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Organization Domains</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>DNS configuration and identity verification status</p>
                </div>
            </header>

            {error && (
                <div className="glass-card" style={{ background: 'hsla(0, 84%, 60%, 0.05)', borderColor: 'hsla(0, 84%, 60%, 0.2)', marginBottom: '32px' }}>
                    <div className="flex-center justify-start flex-gap-4" style={{ color: 'var(--accent-error)' }}>
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            <div className="stat-grid">
                <div className="glass-card stat-card">
                    <span className="stat-label">Total Registered</span>
                    <div className="stat-value">{domains.length}</div>
                    <div className="mt-4"><span className="badge badge-info">Tenant Level</span></div>
                </div>
                <div className="glass-card stat-card">
                    <span className="stat-label">Verified & Secure</span>
                    <div className="stat-value" style={{ color: 'var(--accent-success)' }}>{verifiedCount}</div>
                    <div className="mt-4"><span className="badge badge-success">Active</span></div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Domain Identifier</th>
                                <th>State</th>
                                <th>Authentication Type</th>
                                <th style={{ textAlign: 'center' }}>Identity Default</th>
                            </tr>
                        </thead>
                        <tbody>
                            {domains.length > 0 ? domains.map((domain) => (
                                <tr key={domain.id}>
                                    <td>
                                        <div className="flex-center justify-start flex-gap-4">
                                            <div style={{ padding: '8px', background: 'hsla(var(--hue), 90%, 60%, 0.1)', color: 'var(--accent-blue)', borderRadius: '8px' }}>
                                                <Globe size={16} />
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{domain.id}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {domain.state === 'Verified' ? (
                                            <span className="badge badge-success">Verified</span>
                                        ) : (
                                            <span className="badge badge-error">{domain.state}</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className="badge badge-info">{domain.authenticationType}</span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {domain.isDefault && (
                                            <div className="flex-center">
                                                <ShieldCheck size={20} color="var(--accent-success)" />
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <Globe size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <p>No organization domains found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DomainsPage;
