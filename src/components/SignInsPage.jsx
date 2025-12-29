import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { AlertTriangle, Loader2, MapPin, User, Clock, ArrowLeft, XCircle, ShieldAlert } from 'lucide-react';

const SignInsPage = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [signIns, setSignIns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                    const graphService = new GraphService(response.accessToken);
                    const data = await graphService.getFailedSignIns();
                    setSignIns(data || []);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [instance, accounts]);

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--accent-warning)" />
            </div>
        );
    }

    return (
        <div className="animate-in">
            <button onClick={() => navigate('/service/admin')} className="btn-back">
                <ArrowLeft size={14} style={{ marginRight: '8px' }} />
                Back to Dashboard
            </button>

            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Authentication Audit</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Real-time monitoring of failed identity verification attempts</p>
                </div>
            </header>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="p-8 flex-between" style={{ padding: '24px' }}>
                    <h3 className="flex-center flex-gap-4">
                        <ShieldAlert size={20} color="var(--accent-error)" />
                        Interrupted Sessions
                    </h3>
                    <span className="badge badge-error">{signIns.length} ERRORS DETECTED</span>
                </div>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Subject Identity</th>
                                <th>Geolocation</th>
                                <th>Reason for Interruption</th>
                                <th>Incident Timestamp</th>
                                <th>Target Application</th>
                            </tr>
                        </thead>
                        <tbody>
                            {signIns.length > 0 ? signIns.map((log, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className="flex-center justify-start flex-gap-4">
                                            <div style={{ padding: '8px', background: 'hsla(0,0%,100%,0.05)', borderRadius: '50%' }}>
                                                <User size={16} color="var(--text-dim)" />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{log.userPrincipalName}</div>
                                                <div style={{ fontSize: '10px', opacity: 0.5, fontFamily: 'monospace' }}>{log.userId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex-center justify-start flex-gap-2" style={{ fontSize: '12px' }}>
                                            <MapPin size={12} color="var(--text-dim)" />
                                            {log.location?.city}, {log.location?.countryOrRegion}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-error" style={{ fontSize: '11px', textTransform: 'none' }}>
                                            {log.status?.failureReason || 'Auth Failed'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '12px' }}>
                                        <div className="flex-center justify-start flex-gap-2">
                                            <Clock size={12} color="var(--text-dim)" />
                                            {new Date(log.createdDateTime).toLocaleString()}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-info">{log.appDisplayName}</span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <CheckCircle2 size={48} color="var(--accent-success)" style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <p>No recent authentication failures detected in the tenant.</p>
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

export default SignInsPage;
