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
import { useDataCaching } from '../hooks/useDataCaching';
import { loginRequest } from '../authConfig';
import { generateSections } from './BirdsEyeView_sections';
import Loader3D from './Loader3D';

import styles from './BirdsEyeView.module.css';

const BirdsEyeView = ({ embedded = false }) => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const fetchFn = async () => {
        const request = {
            scopes: [
                "User.Read.All",
                "Directory.Read.All",
                "DeviceManagementManagedDevices.Read.All",
                "Reports.Read.All",
                "Policy.Read.All",
                "ServiceHealth.Read.All",
                "Sites.Read.All",
                "InformationProtectionPolicy.Read",
                "SensitivityLabel.Read",
                "RecordsManagement.Read.All",
                "eDiscovery.Read.All"
            ],
            account: accounts[0],
        };

        const response = await instance.acquireTokenSilent(request);
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

        return {
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
                failedSignins: 0
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
                activeUsers30d: 0,
                storage: oneDriveUsage.reduce((acc, u) => acc + (u.storageUsedInBytes || 0), 0)
            }
        };
    };

    const {
        data: stats,
        loading,
        refreshing,
        error: fetchError,
        refetch
    } = useDataCaching('BirdsEyeView_v3', fetchFn, {
        maxAge: 15,
        storeSection: 'birdsEye',
        storeMetadata: { source: 'BirdsEyeView' },
        enabled: accounts.length > 0
    });

    const [interactionError, setInteractionError] = useState(false);

    useEffect(() => {
        if (fetchError && (fetchError.includes('InteractionRequiredAuthError') || fetchError.includes('interaction_required'))) {
            setInteractionError(true);
        }
    }, [fetchError]);

    const sections = generateSections(stats, styles);

    return (
        <div className={embedded ? styles.embeddedContainer : styles.container}>
            {loading && !stats && <Loader3D showOverlay={true} />}

            {!embedded && (
                <header className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.titleSection}>
                            <h1 className="title-gradient">M365 Bird's Eye</h1>
                            <p>Real-time environment telemetry and resource mapping.</p>
                        </div>
                        <button
                            className={`sync-btn ${refreshing ? 'spinning' : ''}`}
                            onClick={() => refetch(true)}
                            disabled={refreshing}
                        >
                            <RefreshCw size={14} />
                            <span>Refresh</span>
                        </button>
                    </div>

                    {fetchError && !interactionError && (
                        <div className={styles.errorBanner}>
                            <AlertTriangle size={14} />
                            <span>{fetchError}</span>
                        </div>
                    )}

                    {interactionError && (
                        <div className="error-banner" style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginTop: '16px',
                            color: 'var(--accent-blue)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span>🔐 Session expired or additional permissions required to load telemetry.</span>
                            <button
                                onClick={() => refetch(true)}
                                style={{
                                    background: 'var(--accent-blue)',
                                    color: 'white', border: 'none', padding: '6px 12px',
                                    borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                                }}
                            >
                                Reconnect
                            </button>
                        </div>
                    )}
                </header>
            )}

            {embedded && interactionError && (
                <div style={{
                    padding: '20px', textAlign: 'center', background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)', borderRadius: '12px', marginBottom: '16px'
                }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '13px' }}>
                        🔐 Additional permissions required to display data
                    </p>
                    <button
                        onClick={() => refetch(true)}
                        style={{
                            background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px',
                            borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '8px'
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
                                {section.portalUrl ? (
                                    <a
                                        href={section.portalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.cardTitle}
                                        style={{
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        title={`Open ${section.title}`}
                                    >
                                        {section.title}

                                    </a>
                                ) : (
                                    <h3 className={styles.cardTitle}>{section.title}</h3>
                                )}
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
        </div >
    );
};

export default BirdsEyeView;
