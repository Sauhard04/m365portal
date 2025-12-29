import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { Activity, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, ChevronDown, ChevronRight, AlertOctagon, Info, XCircle, ExternalLink } from 'lucide-react';

const ServiceHealthPage = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [health, setHealth] = useState([]);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState('All');
    const [expandedIssue, setExpandedIssue] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                    const graphService = new GraphService(response.accessToken);
                    const [healthData, issuesData] = await Promise.all([
                        graphService.getServiceHealth(),
                        graphService.getServiceIssues()
                    ]);
                    setHealth(healthData || []);
                    setIssues(issuesData || []);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [instance, accounts]);

    const filteredIssues = selectedService === 'All' ? issues : issues.filter(i => i.service === selectedService);
    const unhealthyServices = health.filter(s => s.status !== 'ServiceOperational');

    if (loading) {
        return (
            <div className="flex-center" style={{ height: '60vh' }}>
                <Loader2 className="animate-spin" size={40} color="var(--accent-success)" />
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
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Tenant Service Health</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Global operational status and incident management tracking</p>
                </div>

                {unhealthyServices.length > 0 ? (
                    <div className="glass-card" style={{ padding: '12px 24px', background: 'hsla(0, 84%, 60%, 0.1)', borderColor: 'hsla(0, 84%, 60%, 0.3)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <XCircle color="var(--accent-error)" size={24} />
                        <div>
                            <div style={{ fontWeight: 700, color: 'var(--accent-error)', fontSize: '14px' }}>{unhealthyServices.length} Active Issues</div>
                            <div style={{ fontSize: '11px', opacity: 0.8 }}>Impact detected</div>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: '12px 24px', background: 'hsla(142, 70%, 50%, 0.1)', borderColor: 'hsla(142, 70%, 50%, 0.3)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <CheckCircle2 color="var(--accent-success)" size={24} />
                        <div>
                            <div style={{ fontWeight: 700, color: 'var(--accent-success)', fontSize: '14px' }}>All Systems Nominal</div>
                            <div style={{ fontSize: '11px', opacity: 0.8 }}>No reported incidents</div>
                        </div>
                    </div>
                )}
            </header>

            <div className="flex-center justify-start flex-gap-4 spacing-v-8" style={{ overflowX: 'auto', paddingBottom: '12px', maskImage: 'linear-gradient(to right, black 80%, transparent)' }}>
                <button
                    className={`btn ${selectedService === 'All' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedService('All')}
                >
                    All Modules
                </button>
                {health.map((s, i) => (
                    <button
                        key={i}
                        className={`btn ${selectedService === s.service ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setSelectedService(s.service)}
                        style={{ whiteSpace: 'nowrap', borderColor: s.status !== 'ServiceOperational' ? 'var(--accent-warning)' : 'var(--glass-border)' }}
                    >
                        {s.service}
                        {s.status !== 'ServiceOperational' && <span style={{ width: '6px', height: '6px', background: 'var(--accent-warning)', borderRadius: '50%', marginLeft: '8px' }} />}
                    </button>
                ))}
            </div>

            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Classification</th>
                                <th>Service Module</th>
                                <th>Incident Title</th>
                                <th>Audit ID</th>
                                <th>Last Updated</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredIssues.length > 0 ? filteredIssues.map((issue) => (
                                <React.Fragment key={issue.id}>
                                    <tr
                                        onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>
                                            <span className={`badge ${issue.classification === 'Incident' ? 'badge-error' : 'badge-info'}`}>
                                                {issue.classification}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{issue.service}</td>
                                        <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{issue.title}</td>
                                        <td style={{ fontSize: '11px', fontFamily: 'monospace', opacity: 0.6 }}>{issue.id}</td>
                                        <td style={{ fontSize: '12px' }}>{new Date(issue.lastModifiedDateTime).toLocaleDateString()}</td>
                                        <td>{expandedIssue === issue.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                                    </tr>
                                    {expandedIssue === issue.id && (
                                        <tr>
                                            <td colSpan="6" style={{ background: 'hsla(0,0%,100%,0.02)', padding: '24px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
                                                    <div>
                                                        <h4 className="spacing-v-4" style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--accent-blue)' }}>Description</h4>
                                                        <p style={{ fontSize: '14px', lineHeight: '1.6', opacity: 0.8 }}>{issue.description}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="spacing-v-4" style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--accent-warning)' }}>User Impact</h4>
                                                        <p style={{ fontSize: '13px', opacity: 0.7 }}>{issue.impactDescription || 'No data reported.'}</p>
                                                        <a
                                                            href={`https://admin.microsoft.com/Adminportal/Home#/servicehealth/:/alerts/${issue.id}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="btn btn-secondary"
                                                            style={{ marginTop: '24px', width: '100%', justifyContent: 'center' }}
                                                        >
                                                            <ExternalLink size={14} />
                                                            Public Advisory
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                                        <Activity size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <p>No active incidents or advisories found for the selected view.</p>
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

export default ServiceHealthPage;
