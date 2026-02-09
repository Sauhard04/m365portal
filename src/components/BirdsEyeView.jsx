import React, { useEffect, useState } from 'react';
import { useMsal } from "@azure/msal-react";
import { GraphService } from "../services/graphService";
import { useNavigate } from 'react-router-dom';
import { DataPersistenceService } from '../services/dataPersistence';
import SiteDataStore from '../services/siteDataStore';
import {
    Users, ShieldCheck, Mail, Globe,
    LayoutGrid, KeyRound, UserCog, Shield,
    UserX, CreditCard, AppWindow, Activity,
    Laptop, CheckCircle, AlertTriangle, FileWarning,
    Smartphone, Monitor, Command, RefreshCw,
    Database, FileText, Lock, TrendingUp
} from 'lucide-react';
import Loader3D from './Loader3D';
import { generateSections } from './BirdsEyeView_sections';

import styles from './BirdsEyeView.module.css';

const BirdsEyeView = ({ embedded = false }) => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const fetchRef = React.useRef(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        admin: { mailboxes: 0, activeMail: 0, domains: 0, healthIssues: 0 },
        entra: {
            users: 0, signin: 0, licensed: 0, guest: 0,
            groups: 0, securityGroups: 0, distGroups: 0, unifiedGroups: 0,
            admins: [], apps: 0, domains: 0, deletedUsers: 0, caPolicies: 0, riskyUsers: 0
        },
        licenses: { purchased: 0, assigned: 0, total: 0, topSkus: [] },
        intune: { total: 0, compliant: 0, entraTotal: 0, osSummary: null, configProfiles: 0, applications: 0 },
        security: { score: 0, max: 0, alerts: 0, incidents: 0, failedSignins: 0 },
        collaboration: { teams: 0, privateTeams: 0, publicTeams: 0, sharepoint: 0, onedrive: 0, mailboxes: 0, activeEmail: 0 },
        purview: { labels: 0, retentionPolicies: 0, dlpPolicies: 0, dlpAlerts: 0 },
        usage: { activeUsers7d: 0, activeUsers30d: 0, storage: 0 }
    });

    const fetchData = async (isManual = false) => {
        if (accounts.length === 0) return;

        const requestId = ++fetchRef.current;
        setError(null);

        if (!isManual) {
            const cached = await DataPersistenceService.load('BirdsEyeView');
            if (cached && !DataPersistenceService.isExpired('BirdsEyeView', 15)) {
                if (requestId !== fetchRef.current) return;
                setStats(cached);
                setLoading(false);
                return;
            }
        }

        if (isManual) {
            setRefreshing(true);
            await DataPersistenceService.clear('BirdsEyeView');
        } else {
            setLoading(true);
        }

        const startTime = Date.now();

        try {
            const request = {
                scopes: [
                    "User.Read.All", "Directory.Read.All", "DeviceManagementManagedDevices.Read.All",
                    "Reports.Read.All", "Policy.Read.All", "ServiceHealth.Read.All",
                    "Sites.Read.All", "InformationProtectionPolicy.Read", "SensitivityLabel.Read",
                    "RecordsManagement.Read.All", "eDiscovery.Read.All", "SecurityAlert.Read.All",
                    "SecurityIncident.Read.All", "IdentityRiskyUser.Read.All", "IdentityRiskEvent.Read.All"
                ],
                account: accounts[0],
            };

            let response;
            try {
                response = await instance.acquireTokenSilent(request);
            } catch (error) {
                if (error.name === "InteractionRequiredAuthError" || error.errorCode === "invalid_grant") {
                    if (isManual) {
                        response = await instance.acquireTokenPopup({ ...request, prompt: 'select_account' });
                    } else {
                        setError("InteractionRequired");
                        setLoading(false);
                        return;
                    }
                } else {
                    throw error;
                }
            }

            const graphService = new GraphService(response.accessToken);

            const [
                users, groups, devices, secureScore, skus,
                directoryRoles, apps, domains, deletedUsers,
                caPolicies, serviceIssues, entraDevicesCount,
                sharePointSites, purviewStats, emailActivityByDay,
                securityAlerts, securityIncidents, riskyUsersCount,
                configProfiles, intuneApps, activeUsers7d, oneDriveUsage
            ] = await Promise.all([
                graphService.client.api('/users').select('id,accountEnabled,userType,assignedLicenses').top(999).get().catch(() => ({ value: [] })),
                graphService.client.api('/groups').select('id,groupTypes,mailEnabled,securityEnabled,resourceProvisioningOptions,visibility').top(999).get().catch(() => ({ value: [] })),
                graphService.getDeviceComplianceStats().catch(() => ({ total: 0, compliant: 0, osSummary: null })),
                graphService.getSecureScore().catch(() => ({ currentScore: 0, maxScore: 0 })),
                graphService.client.api('/subscribedSkus').get().catch(() => ({ value: [] })),
                graphService.getDirectoryRoles().catch(() => []),
                graphService.getApplications().catch(() => []),
                graphService.getDomains().catch(() => []),
                graphService.getDeletedUsers().catch(() => []),
                graphService.getConditionalAccessPolicies().catch(() => []),
                graphService.getServiceIssues().catch(() => []),
                graphService.getTotalDevicesCount().catch(() => 0),
                graphService.getSharePointSiteCount().catch(() => 0),
                graphService.getPurviewStats().catch(() => ({ labels: 0, retentionPolicies: 0, dlpPolicies: 0, dlpAlerts: 0 })),
                graphService.getEmailActivityUserDetail('D7').catch(() => []),
                graphService.getSecurityAlerts().catch(() => []),
                graphService.getSecurityIncidents().catch(() => []),
                graphService.getRiskyUsersCount().catch(() => 0),
                graphService.getConfigurationProfiles().catch(() => []),
                graphService.getIntuneApplications().catch(() => []),
                graphService.getActiveUsersCount('D7').catch(() => []),
                graphService.getOneDriveUsage().catch(() => [])
            ]);

            const userList = users.value || [];
            const groupList = groups.value || [];
            const skuList = skus.value || [];
            const roleList = directoryRoles || [];

            const importantRoles = ['Global Administrator', 'Security Administrator', 'Exchange Administrator', 'SharePoint Administrator', 'User Administrator', 'Intune Administrator'];
            const adminStats = roleList
                .filter(r => importantRoles.includes(r.displayName))
                .map(r => ({ name: r.displayName.replace(' Administrator', ''), count: r.members?.length || 0 }))
                .filter(r => r.count > 0)
                .sort((a, b) => b.count - a.count);

            const userStats = {
                users: userList.length,
                signin: userList.filter(u => u.accountEnabled).length,
                licensed: userList.filter(u => u.assignedLicenses?.length > 0).length,
                guest: userList.filter(u => u.userType === 'Guest').length,
                groups: groupList.length,
                securityGroups: groupList.filter(g => g.securityEnabled && !g.mailEnabled).length,
                distGroups: groupList.filter(g => g.mailEnabled && !g.groupTypes?.includes('Unified')).length,
                unifiedGroups: groupList.filter(g => g.groupTypes?.includes('Unified')).length,
                admins: adminStats,
                apps: apps.length,
                domains: domains.length,
                deletedUsers: deletedUsers.length
            };

            const topSkus = skuList
                .sort((a, b) => (b.consumedUnits || 0) - (a.consumedUnits || 0))
                .slice(0, 3)
                .map(s => ({ name: s.skuPartNumber, count: s.consumedUnits || 0 }));

            const licenseStats = {
                purchased: skuList.reduce((acc, sku) => acc + (sku.prepaidUnits?.enabled || 0), 0),
                assigned: skuList.reduce((acc, sku) => acc + (sku.consumedUnits || 0), 0),
                total: skuList.length,
                topSkus: topSkus
            };

            const teamsGroups = groupList.filter(g => g.resourceProvisioningOptions?.includes('Team'));
            const teamsCount = teamsGroups.length;
            const privateTeams = teamsGroups.filter(g => g.visibility === 'Private').length;
            const publicTeams = teamsGroups.filter(g => g.visibility === 'Public').length;

            const activeIssues = serviceIssues.length;
            const enabledCaPolicies = (caPolicies || []).filter(p => p.state === 'enabled').length;

            const newStats = {
                admin: {
                    mailboxes: userStats.licensed,
                    activeMail: emailActivityByDay.length,
                    domains: domains.length,
                    healthIssues: activeIssues
                },
                entra: {
                    ...userStats,
                    caPolicies: enabledCaPolicies,
                    riskyUsers: riskyUsersCount
                },
                licenses: licenseStats,
                intune: {
                    ...devices,
                    entraTotal: entraDevicesCount,
                    configProfiles: configProfiles.length,
                    applications: intuneApps.length
                },
                security: {
                    score: secureScore?.currentScore || 0,
                    max: secureScore?.maxScore || 0,
                    alerts: securityAlerts.length,
                    incidents: securityIncidents.length,
                    failedSignins: 0
                },
                collaboration: {
                    teams: teamsCount,
                    privateTeams: privateTeams,
                    publicTeams: publicTeams,
                    sharepoint: Math.max(0, parseInt(sharePointSites) || 0),
                    onedrive: oneDriveUsage.length,
                    mailboxes: userStats.licensed,
                    activeEmail: emailActivityByDay.length
                },
                purview: purviewStats,
                usage: {
                    activeUsers7d: activeUsers7d.length,
                    activeUsers30d: 0,
                    storage: oneDriveUsage.reduce((acc, u) => acc + (parseInt(u.storageUsedInBytes) || 0), 0)
                }
            };

            setStats(newStats);
            await DataPersistenceService.save('BirdsEyeView', newStats);
            SiteDataStore.store('birdsEye', newStats, { source: 'BirdsEyeView' });

            console.log(`BirdsEyeView: Fetch finished in ${Date.now() - startTime}ms. SharePoint Sites: ${newStats.collaboration.sharepoint}`);

        } catch (error) {
            console.error("BirdsEyeView Error:", error);
            if (requestId === fetchRef.current) {
                setError(error.message || "Failed to load snapshot");
            }
        } finally {
            if (requestId === fetchRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    };

    useEffect(() => {
        if (accounts.length > 0) fetchData();
    }, [accounts]);

    const sections = generateSections(stats, styles);

    return (
        <div className={embedded ? styles.embeddedContainer : styles.container}>
            {loading && <Loader3D showOverlay={true} text="Assembling Bird's Eye Snapshot..." />}

            {!embedded && (
                <header className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.titleSection}>
                            <h1 className="title-gradient">M365 Bird's Eye</h1>
                            <p>Real-time environment telemetry and resource mapping.</p>
                        </div>
                        <button
                            className={`sync-btn ${refreshing ? 'spinning' : ''}`}
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                        >
                            <RefreshCw size={14} />
                            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
                        </button>
                    </div>

                    {error && (
                        <div className="error-banner" style={{
                            background: error === 'InteractionRequired' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${error === 'InteractionRequired' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            borderRadius: '12px', padding: '16px', marginTop: '16px',
                            color: error === 'InteractionRequired' ? 'var(--accent-blue)' : '#ef4444',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <span>{error === 'InteractionRequired' ? '🔐 Session expired or additional permissions required.' : error}</span>
                            {error === 'InteractionRequired' && (
                                <button onClick={() => fetchData(true)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }}>
                                    Reconnect
                                </button>
                            )}
                        </div>
                    )}
                </header>
            )}

            {embedded && error === "InteractionRequired" && (
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', marginBottom: '16px' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '13px' }}>🔐 Additional permissions required</p>
                    <button onClick={() => fetchData(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={16} /> Connect M365 Data
                    </button>
                </div>
            )}

            <div className={styles.cardGrid}>
                {sections.map((section, sIdx) => (
                    <div key={sIdx} className={styles.card} style={{ borderTopColor: section.color }}>
                        <div className={styles.cardContent}>
                            <div className={styles.cardHeader}>
                                {section.portalUrl ? (
                                    <a href={section.portalUrl} target="_blank" rel="noopener noreferrer" className={styles.cardTitle} style={{ textDecoration: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} title={`Open ${section.title}`}>
                                        {section.title}
                                    </a>
                                ) : (
                                    <h3 className={styles.cardTitle}>{section.title}</h3>
                                )}
                                <section.icon size={18} style={{ color: section.color }} />
                            </div>

                            <div className={styles.statSection}>
                                {section.blocks.map((block, bIdx) => (
                                    <div key={bIdx} className={`${styles.statBlock} ${block.path ? styles.interactive : ''}`} onClick={() => block.path && navigate(block.path)}>
                                        <div className={styles.statLabel}>{block.label}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <div className={styles.statValue}>{block.value}</div>
                                            {block.subValues && (
                                                <div className={styles.subValueGroup}>
                                                    {block.subValues.map((sv, svIdx) => (
                                                        <div key={svIdx} className={styles.subValueLine}>
                                                            <span className={styles.subValueLabel}>{sv.label}</span>
                                                            <span className={styles.subValueNumber}>{sv.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {block.custom}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BirdsEyeView;
