import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { DataPersistenceService } from '../services/dataPersistence';
import { motion } from 'framer-motion';
import { Settings, RefreshCw, Filter, Download, AlertCircle, CheckCircle2, XCircle, Loader2, Shield, Activity, AlertTriangle, Users, Mail, Globe, CreditCard, LayoutGrid, Trash2, ArrowRight, Lock, Terminal } from 'lucide-react';

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
    const [isAutomating, setIsAutomating] = useState(false);
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

    // Purview Specific State
    const [purviewStats, setPurviewStats] = useState({
        labels: 0,
        dlpPolicies: 0,
        retentionPolicies: 0,
        dlpAlerts: 0
    });

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
    const isPurview = serviceId === 'purview';

    const fetchData = async (isManual = false) => {
        if (accounts.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
            const graphService = new GraphService(response.accessToken);

            if (isAdmin) {
                const [exchangeResult, licensingResult, domainsCount, groupsCount, deletedUsersCount, score, health, signIns] = await Promise.all([
                    graphService.getExchangeMailboxReport().catch(() => ({ reports: [] })),
                    graphService.getLicensingData().catch(() => ({ skus: [], users: [] })),
                    graphService.getDomains().then(d => d.length),
                    graphService.getGroups().then(g => g.length),
                    graphService.getDeletedUsers().then(u => u?.length || 0),
                    graphService.getSecureScore(),
                    graphService.getServiceHealth(),
                    graphService.getFailedSignIns()
                ]);

                const persistenceData = {
                    admincenter: {
                        mailboxes: { total: exchangeResult.reports?.length || 0, status: "Live" },
                        licenses: { used: licensingResult.skus?.reduce((acc, curr) => acc + (curr.consumedUnits || 0), 0) || 0, status: "Active" },
                        groups: { count: groupsCount, action: "Manage" },
                        domains: { count: domainsCount, action: "Manage" },
                        users: { deleted_count: deletedUsersCount, action: "Restore" },
                        security: {
                            secure_score_percentage: score ? `${Math.round((score.currentScore / score.maxScore) * 100)}%` : "0%",
                            secure_score_points: score?.currentScore || 0,
                            failed_logins_24h: signIns?.length || 0,
                            action: "Review"
                        },
                        service_health: { issues_count: health?.filter(s => s.status !== 'ServiceOperational').length || 0, status: "View Status" }
                    },
                    raw: {
                        exchangeData: exchangeResult.reports || [],
                        licensingSummary: licensingResult.skus || [],
                        domainsCount,
                        groupsCount,
                        deletedUsersCount,
                        secureScore: score,
                        serviceHealth: health,
                        failedSignIns: signIns
                    }
                };

                await DataPersistenceService.save('AdminCenter', persistenceData);

                setExchangeData(exchangeResult.reports || []);
                setLicensingSummary(licensingResult.skus || []);
                setDomainsCount(domainsCount);
                setGroupsCount(groupsCount);
                setDeletedUsersCount(deletedUsersCount);
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

                // Persistence Logic for Entra could go here if needed, but usually handled in EntraDashboard
                setAppsCount(apps?.length || 0);
                setGroupsCount(groups?.length || 0);
                setExchangeData(usersData.reports || []);
                setDomainsCount(domains?.length || 0);
                if (audits?.value) setAuditLogs(audits.value);
                if (policies) setCaPolicies(policies);
                if (admins) setGlobalAdmins(admins);
            } else if (isPurview) {
                // Default to Graph API for speed, but provide manual terminal sync if needed
                if (!purviewStats) {
                    try {
                        const purviewResponse = await instance.acquireTokenSilent({
                            scopes: ["https://graph.microsoft.com/.default"],
                            account: accounts[0]
                        }).catch(() => null);

                        const stats = await (purviewResponse
                            ? new GraphService(purviewResponse.accessToken).getPurviewStats()
                            : graphService.getPurviewStats());
                        setPurviewStats(stats);
                    } catch (err) {
                        console.error("Purview initial fetch failed:", err);
                    }
                }
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Connectivity issue with Microsoft Graph.");
        } finally {
            setLoading(false);
        }
    };

    const fetchPurviewViaTerminal = async () => {
        const timestamp = new Date().toISOString();
        console.log(`[Purview Sync] Starting sync... (Version: ${timestamp})`);
        setLoading(true);
        setError('');
        try {
            // 1. Get SCC Token (specifically for Connect-IPPSSession)
            console.log("[Purview Sync] Requesting SCC token (ps.compliance)...");
            let sccResponse = null;

            try {
                // Try silent authentication first
                sccResponse = await instance.acquireTokenSilent({
                    scopes: ["https://ps.compliance.protection.outlook.com/.default"],
                    account: accounts[0]
                });
                console.log("[Purview Sync] Token acquired silently");
            } catch (silentError) {
                console.log("[Purview Sync] Silent auth failed, trying redirect...");
                try {
                    // If silent fails, use redirect
                    await instance.acquireTokenRedirect({
                        scopes: ["https://ps.compliance.protection.outlook.com/.default"],
                        account: accounts[0]
                    });
                    // This will redirect the page, so code below won't execute
                    return;
                } catch (redirectError) {
                    console.error("[Purview Sync] Redirect auth failed:", redirectError);
                    throw new Error(`Authentication failed: ${redirectError.message}`);
                }
            }

            if (!sccResponse || !sccResponse.accessToken) {
                throw new Error("Could not acquire SCC access token. Check your Azure AD permissions.");
            }
            console.log(`[Purview Sync] Token acquired (${exoResponse.accessToken.length} chars)`);

            // 2. Define the Purview script that outputs JSON
            const script = `
                $results = @{
                    sensitivityLabels = @()
                    eDiscoveryCases = @()
                    dlpPolicies = 0
                }
                
                try {
                    $labels = Get-Label -ErrorAction SilentlyContinue
                    if ($labels) { 
                        $results.sensitivityLabels = $labels | Select-Object Name, Priority, UniqueId
                    }
                    
                    $cases = Get-ComplianceCase -ErrorAction SilentlyContinue
                    if ($cases) {
                        $results.eDiscoveryCases = $cases | Select-Object Name, Status, CreatedDateTime
                    }
                } catch {
                    Write-Warning "Partial data fetch error: $($_.Exception.Message)"
                }
                
                $results | ConvertTo-Json -Depth 3 -Compress
            `;

            // 3. Extract organization info
            const userUpn = accounts[0]?.username;
            const tenantId = accounts[0]?.tenantId;

            // Get organization from username domain or use tenant domain from env
            let organization = userUpn ? userUpn.split('@')[1] : null;

            // Fallback: Use the tenant domain from .env if available
            if (!organization) {
                const tenantDomain = import.meta.env.VITE_TENANT_DOMAIN;
                if (tenantDomain) {
                    organization = tenantDomain;
                } else {
                    // Last resort: construct from tenant ID (not ideal but works)
                    organization = `${tenantId}.onmicrosoft.com`;
                }
            }

            console.log(`[Purview Sync] User: ${userUpn || 'N/A'}, Org: ${organization || 'N/A'}, Tenant: ${tenantId}`);

            if (!organization && !userUpn) {
                throw new Error("Could not determine organization or user principal name. Please check your account information.");
            }

            // 4. Connect to backend to run it on GitHub Actions
            console.log("[Purview Sync] Sending command to backend...");
            const response = await fetch('http://localhost:4000/api/script/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: script,
                    token: sccResponse.accessToken,
                    tokenType: 'scc',
                    organization: organization || undefined,
                    userUpn: userUpn || undefined
                }),
            });

            console.log("[Purview Sync] Backend response status:", response.status);

            const result = await response.json();
            console.log("[Purview Sync] Result:", result.success ? "Success" : "Failed", result);

            if (result.success && result.data) {
                // Map the PowerShell data to our dashboard structure
                const data = result.data;
                console.log("[Purview Sync] Parsed data:", data);

                const stats = {
                    sensitivityLabels: Array.isArray(data.sensitivityLabels) ? data.sensitivityLabels.length : (data.sensitivityLabels ? 1 : 0),
                    retentionLabels: 0,
                    dlpPolicies: data.dlpPolicies || 0,
                    dlpAlerts: Array.isArray(data.eDiscoveryCases) ? data.eDiscoveryCases.length : (data.eDiscoveryCases ? 1 : 0),
                    rawLabels: data.sensitivityLabels,
                    rawCases: data.eDiscoveryCases
                };
                console.log("[Purview Sync] Setting stats:", stats);
                setPurviewStats(stats);
            } else {
                const errorMsg = result.error || result.stderr || result.stdout || "Terminal sync failed.";
                console.error("[Purview Sync] Error:", errorMsg);
                throw new Error(errorMsg);
            }
        } catch (err) {
            console.error("Terminal sync error:", err);
            setError("Terminal Sync Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        const cacheName = isAdmin ? 'AdminCenter' : (isEntra ? 'EntraID' : (isPurview ? 'Purview' : null));
        if (!cacheName) {
            fetchData(false);
            return;
        }

        const cached = await DataPersistenceService.load(cacheName);
        if (cached && cached.raw) {
            if (isAdmin) {
                setExchangeData(cached.raw.exchangeData);
                setLicensingSummary(cached.raw.licensingSummary);
                setDomainsCount(cached.raw.domainsCount);
                setGroupsCount(cached.raw.groupsCount);
                setDeletedUsersCount(cached.raw.deletedUsersCount);
                setSecureScore(cached.raw.secureScore);
                setServiceHealth(cached.raw.serviceHealth);
                setFailedSignIns(cached.raw.failedSignIns);
            }
            // Add Entra hydrations here if needed
            setLoading(false);

            if (DataPersistenceService.isExpired(cacheName, 30)) {
                fetchData(false);
            }
        } else {
            fetchData(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [serviceId]);

    const stats = isAdmin ? [
        { label: 'Total Mailboxes', value: exchangeData.length, icon: Mail, color: 'var(--accent-blue)', path: '/service/admin/report', trend: 'Live' },
        { label: 'Licenses Used', value: licensingSummary.reduce((acc, curr) => acc + (curr.consumedUnits || 0), 0), icon: CreditCard, color: 'var(--accent-cyan)', path: '/service/admin/licenses', trend: 'Active' },
        { label: 'Groups', value: groupsCount, icon: Users, color: 'var(--accent-indigo)', path: '/service/admin/groups', trend: 'Manage' },
        { label: 'Domains', value: domainsCount, icon: Globe, color: 'var(--accent-success)', path: '/service/admin/domains', trend: 'Manage' },
        { label: 'Deleted Users', value: deletedUsersCount, icon: Trash2, color: 'var(--accent-error)', path: '/service/admin/deleted-users', trend: 'Restore' },
        { label: 'Secure Score', value: secureScore ? `${Math.round((secureScore.currentScore / secureScore.maxScore) * 100)}%` : '--', icon: Shield, color: 'var(--accent-blue)', path: '/service/admin/secure-score', trend: `${secureScore?.currentScore || 0} Pts` },
        { label: 'Failed Logins (24h)', value: failedSignIns.length, icon: AlertTriangle, color: 'var(--accent-error)', path: '/service/admin/sign-ins', trend: 'Review' }
    ] : isEntra ? [
        { label: 'Users', value: exchangeData.length, icon: Users, color: 'var(--accent-blue)', path: '/service/entra/users' },
        { label: 'Groups', value: groupsCount, icon: Users, color: 'var(--accent-purple)', path: '/service/entra/groups' },
        { label: 'Applications', value: appsCount, icon: LayoutGrid, color: 'var(--accent-cyan)', path: '/service/entra/apps' },
        { label: 'Global Admins', value: globalAdmins.length, icon: Shield, color: 'var(--accent-error)' }
    ] : isPurview ? [
        { label: 'Sensitivity Labels', value: purviewStats.labels, icon: Lock, color: 'var(--accent-purple)' },
        { label: 'DLP Policies', value: purviewStats.dlpPolicies, icon: AlertTriangle, color: 'var(--accent-warning)' },
        { label: 'Retention Policies', value: purviewStats.retentionPolicies, icon: Activity, color: 'var(--accent-blue)' },
        { label: 'DLP Alerts', value: purviewStats.dlpAlerts, icon: Shield, color: 'var(--accent-error)' }
    ] : [];

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-4">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '18px' }}>{serviceNames[serviceId]} Overview</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '10px' }}>Real-time operational telemetry and management</p>
                </div>
                <div className="flex-gap-2">
                    {isPurview && (
                        <button
                            className="btn btn-secondary"
                            onClick={fetchPurviewViaTerminal}
                            disabled={loading}
                            style={{
                                padding: '8px 16px',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'hsla(210, 100%, 50%, 0.1)',
                                borderColor: 'var(--accent-blue)',
                                color: 'var(--accent-blue)',
                                fontWeight: 'bold'
                            }}
                        >
                            <Terminal size={14} />
                            {loading ? 'Running Action...' : 'Sync via Terminal'}
                        </button>
                    )}
                    <button className={`sync-btn ${loading ? 'spinning' : ''}`} onClick={() => fetchData(true)} title="Sync & Refresh">
                        <RefreshCw size={14} />
                    </button>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }}>
                        <Download size={14} />
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
                        <div className="flex-between spacing-v-2">
                            <span className="stat-label">{stat.label}</span>
                            <stat.icon size={14} style={{ color: stat.color }} />
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

            {isPurview && isAutomating && (
                <div className="glass-card flex-center border-accent-blue" style={{ marginTop: '32px', padding: '40px', gap: '15px' }}>
                    <Loader2 size={24} className="animate-spin text-accent-blue" />
                    <div>
                        <h3 className="font-bold">Configuring Secure Session</h3>
                        <p className="text-xs text-dim">Using your Microsoft credentials to unlock Purview data...</p>
                    </div>
                </div>
            )}

            {isPurview && !loading && !error && !isAutomating && (purviewStats.labels === 0 && purviewStats.dlpPolicies === 0) && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card"
                    style={{
                        marginTop: '32px',
                        padding: '60px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '20px',
                        background: 'hsla(0, 0%, 100%, 0.02)'
                    }}
                >
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'hsla(0, 0%, 100%, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-warning)'
                    }}>
                        <Lock size={40} />
                    </div>
                    <div>
                        <h2 className="title-gradient" style={{ fontSize: '24px', marginBottom: '8px' }}>No Purview Data Found</h2>
                        <p style={{ color: 'var(--text-dim)', maxWidth: '400px', margin: '0 auto' }}>
                            We connected successfully, but didn't find any labels or policies. If you expect data, try refreshing below.
                        </p>
                    </div>
                    <div className="flex-gap-2">
                        <button className="btn btn-primary" style={{ background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' }} onClick={fetchPurviewViaTerminal}>
                            <Terminal size={14} style={{ marginRight: '8px' }} />
                            Sync Now via GitHub Terminal
                        </button>
                        <button className="btn btn-secondary" onClick={() => fetchData(true, true)}>
                            {loading ? 'Retrying...' : 'Reset Graph Session'}
                        </button>
                    </div>
                </motion.div>
            )}

            {isEntra && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                    gap: '24px'
                }}>
                    <div className="glass-card" style={{ padding: '14px' }}>
                        <h3 className="spacing-v-4 flex-center justify-start flex-gap-2" style={{ fontSize: '12px' }}>
                            <Activity size={14} color="var(--accent-purple)" />
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

                    <div className="glass-card" style={{ padding: '14px' }}>
                        <h3 className="spacing-v-4 flex-center justify-start flex-gap-2" style={{ fontSize: '12px' }}>
                            <Shield size={14} color="var(--accent-blue)" />
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
                <div className="glass-card" style={{ marginTop: '16px', padding: '14px' }}>
                    <div className="flex-between spacing-v-4">
                        <h3 className="flex-center flex-gap-2" style={{ fontSize: '12px' }}>
                            <Mail size={14} color="var(--accent-blue)" />
                            Recent Mailboxes
                        </h3>
                        <motion.button
                            whileHover={{ scale: 1.05, x: -4 }}
                            whileTap={{ scale: 0.95 }}
                            className="btn btn-secondary"
                            style={{
                                padding: '6px 14px',
                                fontSize: '11px',
                                border: '1px solid var(--glass-border)',
                                background: 'hsla(0,0%,100%,0.05)',
                                color: 'var(--text-secondary)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: 600
                            }}
                            onClick={() => navigate('/service/admin/report')}
                        >
                            View All Reports
                            <ArrowRight size={12} />
                        </motion.button>
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
