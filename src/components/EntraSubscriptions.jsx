import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { SubscriptionsService } from '../services/entra';
import { ArrowLeft, CreditCard, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import Loader3D from './Loader3D';

const EntraSubscriptions = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSubs = async (isManual = false) => {
        if (accounts.length > 0) {
            if (isManual) setRefreshing(true);
            else setLoading(true);

            const startTime = Date.now();
            try {
                const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                const client = new GraphService(response.accessToken).client;
                const data = await SubscriptionsService.getSubscriptions(client);
                setSubs(data || []);

                // Background store for AI context
                const SiteDataStore = (await import('../services/siteDataStore')).default;
                SiteDataStore.store('entraSubscriptions', data || []);
            } catch (error) {
                console.error("Subs fetch error", error);
            } finally {
                if (isManual) {
                    const elapsedTime = Date.now() - startTime;
                    const remainingTime = Math.max(0, 1000 - elapsedTime);
                    setTimeout(() => setRefreshing(false), remainingTime);
                } else {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        }
    };

    useEffect(() => {
        fetchSubs();
    }, [accounts, instance]);

    if (loading) {
        return (
            <Loader3D showOverlay={true} />
        );
    }

    return (
        <div className="animate-in">
            <button onClick={() => navigate('/service/entra')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Dashboard
            </button>

            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Entra Subscriptions</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Tenant licensing portfolio and service entitlement tracking</p>
                </div>
                <div className="flex-gap-2">
                    <button className={`sync-btn ${refreshing ? 'spinning' : ''}`} onClick={() => fetchSubs(true)} title="Sync & Refresh">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </header>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="p-8 flex-between" style={{ padding: '24px' }}>
                    <h3 className="flex-center flex-gap-4">
                        <CreditCard size={20} color="var(--accent-success)" />
                        Identity SKUs
                    </h3>
                    <span className="badge badge-success">{subs.length} ACTIVE BUNDLES</span>
                </div>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Service SKU Name</th>
                                <th>Capability Status</th>
                                <th style={{ textAlign: 'center' }}>Total Seats</th>
                                <th style={{ textAlign: 'center' }}>Assigned</th>
                                <th style={{ textAlign: 'center' }}>Pool Available</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subs.length > 0 ? subs.map((sub, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className="flex-center justify-start flex-gap-4">
                                            <div style={{ padding: '8px', background: 'hsla(142, 70%, 50%, 0.1)', color: 'var(--accent-success)', borderRadius: '8px' }}>
                                                <CreditCard size={16} />
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{sub.skuPartNumber}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {sub.capabilityStatus === 'Enabled' ? (
                                            <span className="badge badge-success">Enabled</span>
                                        ) : (
                                            <span className="badge badge-error">{sub.capabilityStatus}</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{sub.prepaidUnits?.enabled || 0}</td>
                                    <td style={{ textAlign: 'center' }}>{sub.consumedUnits || 0}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="badge badge-info" style={{ minWidth: '60px' }}>
                                            {(sub.prepaidUnits?.enabled || 0) - (sub.consumedUnits || 0)}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <CreditCard size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                        <p>No active Entra ID subscriptions detected.</p>
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

export default EntraSubscriptions;
