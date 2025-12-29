import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { motion } from 'framer-motion';
import { Settings, RefreshCw, Filter, Download, AlertCircle, CheckCircle2, XCircle, Loader2, Shield, Activity, AlertTriangle, Users, Mail, Globe, CreditCard, LayoutGrid, Trash2, ArrowRight } from 'lucide-react';

const ServicePage = ({ serviceId: propServiceId }) => {
    const params = useParams();
    const serviceId = propServiceId || params.serviceId;
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();

    const [reportData, setReportData] = useState([]);
    const [exchangeData, setExchangeData] = useState([]);
    const [domainsCount, setDomainsCount] = useState(0);
    const [groupsCount, setGroupsCount] = useState(0);
    const [emailActivity, setEmailActivity] = useState({ sent: 0, received: 0, date: null });
    const [filterText, setFilterText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Entra Specific State
    const [secureScore, setSecureScore] = useState(null);
    const [serviceHealth, setServiceHealth] = useState([]);
    const [failedSignIns, setFailedSignIns] = useState([]);
    const [deviceSummary, setDeviceSummary] = useState({ total: 0, compliant: 0 });
    const [appsCount, setAppsCount] = useState(0);
    const [auditLogs, setAuditLogs] = useState([]);
    const [caPolicies, setCaPolicies] = useState([]);
    const [globalAdmins, setGlobalAdmins] = useState([]);
    const [deletedUsersCount, setDeletedUsersCount] = useState(0);
    const [licensingSummary, setLicensingSummary] = useState([]);

    const serviceNames = {
        admin: 'Admin Center',
        entra: 'Microsoft Entra ID',
        intune: 'Microsoft Intune',
        purview: 'Microsoft Purview',
        licensing: 'Licensing & Billing'
    };

    const isAdmin = serviceId === 'admin';
    const isEntra = serviceId === 'entra';
    const isLicensing = serviceId === 'licensing';

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (accounts.length === 0) return;
            const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
            const graphService = new GraphService(response.accessToken);

            if (isAdmin) {
                const [exchangeResult, licensingResult] = await Promise.all([
                    graphService.getExchangeMailboxReport().catch(() => ({ reports: [] })),
                    graphService.getLicensingData().catch(() => ({ skus: [], users: [] }))
                ]);
                setExchangeData(exchangeResult.reports || []);
                setLicensingSummary(licensingResult.skus || []);

                graphService.getEmailActivityUserDetail('D7').then(activity => {
                    const sent = activity.reduce((acc, curr) => acc + (parseInt(curr.sendCount) || 0), 0);
                    const received = activity.reduce((acc, curr) => acc + (parseInt(curr.receiveCount) || 0), 0);
                    setEmailActivity({ sent, received, date: activity[0]?.reportRefreshDate });
                });

                graphService.getDomains().then(d => setDomainsCount(d.length));
                graphService.getGroups().then(g => setGroupsCount(g.length));
                graphService.getDeletedUsers().then(u => setDeletedUsersCount(u?.length || 0));
                graphService.getDeviceComplianceStats().then(s => setDeviceSummary(s));

                const [score, health, signIns] = await Promise.all([
                    graphService.getSecureScore(),
                    graphService.getServiceHealth(),
                    graphService.getFailedSignIns()
                ]);
                if (score) setSecureScore(score);
                if (health) setServiceHealth(health);
                if (signIns) setFailedSignIns(signIns);

            } else if (isEntra) {
                const [apps, groups, usersData, domains, audits, policies, admins] = await Promise.all([
                    graphService.getApplications(),
                    graphService.getGroups(),
                    graphService.getExchangeMailboxReport(),
                    graphService.getDomains(),
                    graphService.getDirectoryAudits(),
                    graphService.getConditionalAccessPolicies(),
                    graphService.getGlobalAdmins()
                ]);
                setAppsCount(apps?.length || 0);
                setGroupsCount(groups?.length || 0);
                setExchangeData(usersData.reports || []);
                setDomainsCount(domains?.length || 0);
                if (audits?.value) setAuditLogs(audits.value);
                if (policies) setCaPolicies(policies);
                if (admins) setGlobalAdmins(admins);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Connectivity issue with Microsoft Graph.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [serviceId]);

    const stats = isAdmin ? [
        { label: 'Total Mailboxes', value: exchangeData.length, icon: Mail, color: 'var(--accent-blue)', path: '/service/admin/report', trend: 'Live' },
        { label: 'Emails Sent (7d)', value: emailActivity.sent.toLocaleString(), icon: Activity, color: 'var(--accent-purple)', path: '/service/admin/emails', trend: emailActivity.date ? `As of ${emailActivity.date}` : '7 Days' },
        { label: 'Emails Received (7d)', value: emailActivity.received.toLocaleString(), icon: Activity, color: 'var(--accent-blue)', path: '/service/admin/emails', trend: emailActivity.date ? `As of ${emailActivity.date}` : '7 Days' },
        { label: 'Licenses Used', value: licensingSummary.reduce((acc, curr) => acc + (curr.consumedUnits || 0), 0), icon: CreditCard, color: 'var(--accent-cyan)', path: '/service/admin/licenses', trend: 'Active' },
        { label: 'Groups', value: groupsCount, icon: Users, color: 'var(--accent-indigo)', path: '/service/admin/groups', trend: 'Manage' },
        { label: 'Domains', value: domainsCount, icon: Globe, color: 'var(--accent-success)', path: '/service/admin/domains', trend: 'Manage' },
        { label: 'Deleted Users', value: deletedUsersCount, icon: Trash2, color: 'var(--accent-error)', path: '/service/admin/deleted-users', trend: 'Restore' },
        { label: 'Secure Score', value: secureScore ? `${Math.round((secureScore.currentScore / secureScore.maxScore) * 100)}%` : '--', icon: Shield, color: 'var(--accent-blue)', path: '/service/admin/secure-score', trend: `${secureScore?.currentScore || 0} Pts` },
        { label: 'Failed Logins (24h)', value: failedSignIns.length, icon: AlertTriangle, color: 'var(--accent-error)', path: '/service/admin/sign-ins', trend: 'Review' },
        { label: 'Service Health', value: `${serviceHealth.filter(s => s.status !== 'ServiceOperational').length} Issues`, icon: Activity, color: 'var(--accent-warning)', path: '/service/admin/service-health', trend: 'Status' },
        { label: 'Device Compliance', value: deviceSummary.total > 0 ? `${Math.round((deviceSummary.compliant / deviceSummary.total) * 100)}%` : '0%', icon: Shield, color: 'var(--accent-blue)', path: '/service/entra/devices', trend: `${deviceSummary.compliant}/${deviceSummary.total}` }
    ] : isEntra ? [
        { label: 'Users', value: exchangeData.length, icon: Users, color: 'var(--accent-blue)', path: '/service/entra/users' },
        { label: 'Groups', value: groupsCount, icon: Users, color: 'var(--accent-purple)', path: '/service/entra/groups' },
        { label: 'Applications', value: appsCount, icon: LayoutGrid, color: 'var(--accent-cyan)', path: '/service/entra/apps' },
        { label: 'Global Admins', value: globalAdmins.length, icon: Shield, color: 'var(--accent-error)' }
    ] : [];

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>{serviceNames[serviceId]} Overview</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Real-time operational telemetry and management</p>
                </div>
                <div className="flex-gap-4">
                    <button className="btn btn-secondary" onClick={fetchData}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button className="btn btn-primary">
                        <Download size={16} />
                        Export Data
                    </button>
                </div>
            </header>

            {error && (
                <div className="glass-card" style={{ background: 'hsla(0, 84%, 60%, 0.05)', borderColor: 'hsla(0, 84%, 60%, 0.2)', marginBottom: '32px', padding: '20px' }}>
                    <div className="flex-center flex-gap-4" style={{ color: 'var(--accent-error)' }}>
                        <AlertCircle size={24} />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            <div className="stat-grid">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -5 }}
                        className="glass-card stat-card"
                        onClick={() => stat.path && navigate(stat.path)}
                        style={{ cursor: stat.path ? 'pointer' : 'default' }}
                    >
                        <div className="flex-between spacing-v-4">
                            <span className="stat-label">{stat.label}</span>
                            <stat.icon size={20} style={{ color: stat.color }} />
                        </div>
                        <div className="stat-value">{stat.value}</div>
                        {stat.trend && (
                            <div className="flex-between mt-4" style={{ marginTop: '16px' }}>
                                <span className="badge badge-info">{stat.trend}</span>
                                <ArrowRight size={14} style={{ color: 'var(--text-dim)' }} />
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {isEntra && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                    <div className="glass-card">
                        <h3 className="spacing-v-8 flex-center justify-start flex-gap-4">
                            <Activity size={20} color="var(--accent-purple)" />
                            Directory Audits
                        </h3>
                        <div className="table-container">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>Activity</th>
                                        <th>Initiated By</th>
                                        <th>Result</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.slice(0, 5).map((log, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{log.activityDisplayName}</td>
                                            <td style={{ fontSize: '12px' }}>{log.initiatedBy?.user?.userPrincipalName || 'System'}</td>
                                            <td>
                                                <span className={`badge ${log.result === 'success' ? 'badge-success' : 'badge-error'}`}>
                                                    {log.result}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="glass-card">
                        <h3 className="spacing-v-8 flex-center justify-start flex-gap-4">
                            <Shield size={20} color="var(--accent-blue)" />
                            CA Policies
                        </h3>
                        <div className="table-container">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>Policy Name</th>
                                        <th>State</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {caPolicies.slice(0, 5).map((policy, i) => (
                                        <tr key={i}>
                                            <td>{policy.displayName}</td>
                                            <td>
                                                <span className={`badge ${policy.state === 'enabled' ? 'badge-success' : 'badge-error'}`}>
                                                    {policy.state}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {isAdmin && exchangeData.length > 0 && (
                <div className="glass-card" style={{ marginTop: '32px' }}>
                    <div className="flex-between spacing-v-8">
                        <h3 className="flex-center flex-gap-4">
                            <Mail size={20} color="var(--accent-blue)" />
                            Recent Mailboxes
                        </h3>
                        <button className="btn-secondary" onClick={() => navigate('/service/admin/report')}>View All Reports</button>
                    </div>
                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Archive</th>
                                    <th>Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exchangeData.slice(0, 8).map((mb, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mb.displayName}</td>
                                        <td style={{ fontSize: '12px' }}>{mb.emailAddress}</td>
                                        <td>
                                            <span className={`badge ${mb.archivePolicy ? 'badge-success' : 'badge-info'}`}>
                                                {mb.archivePolicy ? 'Active' : 'Not Set'}
                                            </span>
                                        </td>
                                        <td>{mb.mailboxSize || '0 KB'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {loading && (
                <div className="flex-center" style={{ padding: '60px' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--accent-blue)" />
                </div>
            )}
        </div>
    );
};

export default ServicePage;
