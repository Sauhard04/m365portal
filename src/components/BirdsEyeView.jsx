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
    const [loading, setLoading] = useState(true);
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
        setError(null);
        if (!isManual) {
            const cached = await DataPersistenceService.load('BirdsEyeView');
            if (cached && !DataPersistenceService.isExpired('BirdsEyeView', 15)) {
                // Merge cached data with current structure to ensure all new comprehensive fields exist
                const mergedStats = {
                    admin: cached.admin || stats.admin,
                    entra: { ...stats.entra, ...cached.entra },
                    licenses: cached.licenses || stats.licenses,
                    intune: cached.intune || stats.intune,
                    security: cached.security || stats.security,
                    collaboration: cached.collaboration || stats.collaboration,
                    purview: cached.purview || stats.purview,
                    usage: cached.usage || stats.usage
                };
                setStats(mergedStats);
                setLoading(false);
                return;
            }
        }

        if (isManual) {
            setLoading(true);
            // Clear broken cache
            await DataPersistenceService.clear('BirdsEyeView');
        }
        console.log("BirdsEyeView: fetchData started", { isManual });
        const startTime = Date.now();

        try {
            const request = {
                scopes: ["User.Read.All", "Directory.Read.All", "DeviceManagementManagedDevices.Read.All", "Reports.Read.All", "Policy.Read.All", "ServiceHealth.Read.All", "Sites.Read.All"],
                account: accounts[0],
            };
            let response;
            try {
                response = await instance.acquireTokenSilent(request);
            } catch (error) {
                if (error.name === "InteractionRequiredAuthError") {
                    if (isManual) {
                        // Only trigger popup if user explicitly asked for it (Refresh button)
                        const interactiveRequest = { ...request, prompt: 'select_account' };
                        response = await instance.acquireTokenPopup(interactiveRequest);
                    } else {
                        // On auto-load, don't popup. Show error asking user to click refresh.
                        console.warn("Silent auth failed, user interaction required.");
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
                sharePointSites, purviewStats, emailActivity,
                securityAlerts, securityIncidents, riskyUsers,
                configProfiles, intuneApps, activeUsers7d, oneDriveUsage
            ] = await Promise.all([
                graphService.client.api('/users').select('id,accountEnabled,userType,assignedLicenses').top(999).get().catch(e => ({ value: [] })),
                graphService.client.api('/groups').select('id,groupTypes,mailEnabled,securityEnabled,resourceProvisioningOptions,visibility').top(999).get().catch(e => ({ value: [] })),
                graphService.getDeviceComplianceStats().catch(() => ({ total: 0, compliant: 0, osSummary: null })),
                graphService.getSecureScore().catch(() => ({ currentScore: 0, maxScore: 0 })),
                graphService.client.api('/subscribedSkus').get().catch(e => ({ value: [] })),
                graphService.getDirectoryRoles(),
                graphService.getApplications(),
                graphService.getDomains(),
                graphService.getDeletedUsers(),
                graphService.getConditionalAccessPolicies(),
                graphService.getServiceIssues(),
                graphService.getTotalDevicesCount(),
                graphService.getSharePointSiteCount(),
                graphService.getPurviewStats(),
                graphService.getEmailActivityUserDetail('D7'),
                graphService.getSecurityAlerts().catch(() => []),
                graphService.getSecurityIncidents().catch(() => []),
                graphService.getRiskyUsersCount().catch(() => 0),
                graphService.getConfigurationProfiles().catch(() => []),
                graphService.getIntuneApplications().catch(() => []),
                graphService.getActiveUsersCount('D7').catch(() => []),
                graphService.getOneDriveUsage().catch(() => [])
            ]);

            console.log("BirdsEyeView: Data fetched", {
                usersLen: users?.value?.length,
                groupsLen: groups?.value?.length,
                devices,
                secureScore,
                sharePointSites,
                purviewStats,
                securityAlertsLen: securityAlerts?.length
            });

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
                    activeMail: emailActivity.length,
                    domains: domains.length,
                    healthIssues: activeIssues
                },
                entra: {
                    ...userStats,
                    caPolicies: enabledCaPolicies,
                    riskyUsers: riskyUsers
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
                    failedSignins: 0 // Will be calculated from sign-ins if available
                },
                collaboration: {
                    teams: teamsCount,
                    privateTeams: privateTeams,
                    publicTeams: publicTeams,
                    sharepoint: sharePointSites,
                    onedrive: oneDriveUsage.length,
                    mailboxes: userStats.licensed,
                    activeEmail: emailActivity.length
                },
                purview: purviewStats,
                usage: {
                    activeUsers7d: activeUsers7d.length,
                    activeUsers30d: 0, // Can be fetched separately if needed
                    storage: oneDriveUsage.reduce((acc, u) => acc + (u.storageUsedInBytes || 0), 0)
                }
            };

            setStats(newStats);
            await DataPersistenceService.save('BirdsEyeView', newStats);
            SiteDataStore.store('birdsEye', newStats, { source: 'BirdsEyeView' });

        } catch (error) {
            console.error("Failed to fetch Bird's Eye data", error);
            setError(error.message || "Failed to load data");
        } finally {
            if (isManual) {
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, 2000 - elapsedTime);
                setTimeout(() => {
                    setLoading(false);
                }, remainingTime);
            } else {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (accounts.length > 0) {
            fetchData();
        }
    }, [instance, accounts]);

    const sections = generateSections(stats, styles);

    return (
        <div className={embedded ? styles.embeddedContainer : styles.container}>
            {loading && <Loader3D showOverlay={true} />}

            {!embedded && (
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>M365 Bird's Eye</h1>
                        <p className={styles.subtitle}>Real-time environment telemetry and resource mapping.</p>
                        {error && error !== "InteractionRequired" && (
                            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>
                                ⚠️ Error: {error}
                            </div>
                        )}
                        {error === "InteractionRequired" && (
                            <div style={{ marginTop: '8px' }}>
                                <button
                                    onClick={() => fetchData(true)}
                                    style={{
                                        background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px',
                                        borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    <ShieldCheck size={14} />
                                    Connect M365 Data
                                </button>
                            </div>
                        )}
                    </div>
                    <button onClick={() => fetchData(true)} className={styles.refreshBtn}>
                        <RefreshCw size={14} className={loading ? styles.spinning : ""} />
                        <span>Refresh</span>
                    </button>
                </header>
            )}

            {embedded && error === "InteractionRequired" && (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    marginBottom: '16px'
                }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '13px' }}>
                        🔐 Additional permissions required to display M365 data
                    </p>
                    <button
                        onClick={() => fetchData(true)}
                        style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <ShieldCheck size={16} />
                        Connect M365 Data
                    </button>
                </div>
            )}

            <div className={styles.cardGrid}>
                {sections.map((section, idx) => (
                    <div key={idx} className={styles.card} style={{ borderTopColor: section.color }}>
                        <div className={styles.cardContent}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>{section.title}</h3>
                                <section.icon size={18} style={{ color: section.color }} />
                            </div>

                            <div className={styles.statSection}>
                                {section.blocks.map((block, bIdx) => (
                                    <div
                                        key={bIdx}
                                        className={`${styles.statBlock} ${block.path ? styles.interactive : ""}`}
                                        onClick={() => block.path && navigate(block.path)}
                                    >
                                        <div className={styles.statLabel}>{block.label}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                            <div className={styles.statValue}>{block.value}</div>
                                            {block.subValues && (
                                                <div className={styles.subValueGroup}>
                                                    {block.subValues.map((sv, svi) => (
                                                        <div key={svi} className={styles.subValueLine}>
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
