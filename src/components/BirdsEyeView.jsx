import React, { useEffect, useState } from 'react';
import { useMsal } from "@azure/msal-react";
import { GraphService } from "../services/graphService";
import { useNavigate } from 'react-router-dom';
import { DataPersistenceService } from '../services/dataPersistence';
import {
    Users, ShieldCheck, Mail, Globe,
    LayoutGrid, KeyRound, UserCog, Shield,
    UserX, CreditCard, AppWindow, Activity,
    Laptop, CheckCircle, AlertTriangle, FileWarning,
    Smartphone, Monitor, Command, RefreshCw
} from 'lucide-react';
import Loader3D from './Loader3D';

import styles from './BirdsEyeView.module.css';

const BirdsEyeView = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        entra: {
            users: 0, signin: 0, licensed: 0, guest: 0,
            groups: 0, securityGroups: 0, distGroups: 0, unifiedGroups: 0,
            admins: [],
            apps: 0, domains: 0, deletedUsers: 0
        },
        licenses: {
            purchased: 0, assigned: 0, total: 0,
            topSkus: []
        },
        devices: { total: 0, compliant: 0, entraTotal: 0, osSummary: null },
        security: { score: 0, max: 0, caPolicies: 0, healthIssues: 0 },
        exchange: { mailboxes: 0 },
        teams: { total: 0, private: 0, public: 0 },
        sharepoint: { sites: 0 }
    });

    const fetchData = async (isManual = false) => {
        if (!isManual) {
            const cached = await DataPersistenceService.load('BirdsEyeView');
            if (cached && !DataPersistenceService.isExpired('BirdsEyeView', 15)) {
                setStats(cached);
                setLoading(false);
                return;
            }
        }

        if (isManual) setLoading(true);
        const startTime = Date.now();

        try {
            const request = {
                scopes: ["User.Read.All", "Directory.Read.All", "DeviceManagementManagedDevices.Read.All", "Reports.Read.All", "Policy.Read.All", "ServiceHealth.Read.All"],
                account: accounts[0],
            };
            const response = await instance.acquireTokenSilent(request);
            const graphService = new GraphService(response.accessToken);

            const [
                users, groups, devices, secureScore, skus,
                directoryRoles, apps, domains, deletedUsers,
                caPolicies, serviceIssues, entraDevicesCount
            ] = await Promise.all([
                graphService.client.api('/users').select('id,accountEnabled,userType,assignedLicenses').top(999).get().catch(e => ({ value: [] })),
                graphService.client.api('/groups').select('id,groupTypes,mailEnabled,securityEnabled,resourceProvisioningOptions,visibility').top(999).get().catch(e => ({ value: [] })),
                graphService.getDeviceComplianceStats(),
                graphService.getSecureScore(),
                graphService.client.api('/subscribedSkus').get().catch(e => ({ value: [] })),
                graphService.getDirectoryRoles(),
                graphService.getApplications(),
                graphService.getDomains(),
                graphService.getDeletedUsers(),
                graphService.getConditionalAccessPolicies(),
                graphService.getServiceIssues(),
                graphService.getTotalDevicesCount()
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
                entra: userStats,
                licenses: licenseStats,
                devices: { ...devices, entraTotal: entraDevicesCount },
                security: {
                    score: secureScore?.currentScore || 0,
                    max: secureScore?.maxScore || 0,
                    caPolicies: enabledCaPolicies,
                    healthIssues: activeIssues
                },
                exchange: { mailboxes: userStats.licensed },
                teams: { total: teamsCount, private: privateTeams, public: publicTeams },
                sharepoint: { sites: 0 }
            };

            setStats(newStats);
            await DataPersistenceService.save('BirdsEyeView', newStats);

        } catch (error) {
            console.error("Failed to fetch Bird's Eye data", error);
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

    const sections = [
        {
            title: "Entra ID",
            icon: ShieldCheck,
            color: "#3b82f6",
            blocks: [
                {
                    label: "Directory Identities",
                    value: stats.entra.users,
                    path: '/service/entra/users',
                    subValues: [
                        { label: "Active", value: stats.entra.signin },
                        { label: "Licensed", value: stats.entra.licensed },
                        { label: "Guests", value: stats.entra.guest },
                    ]
                },
                {
                    label: "Resource Distribution",
                    value: stats.entra.groups,
                    path: '/service/entra/groups',
                    subValues: [
                        { label: "M365", value: stats.entra.unifiedGroups },
                        { label: "Security", value: stats.entra.securityGroups },
                        { label: "Dist", value: stats.entra.distGroups }
                    ]
                },
                {
                    label: "Licenses",
                    value: stats.licenses.total,
                    path: '/service/entra/subscriptions',
                    custom: (
                        <div>
                            <div className={styles.progressBarContainer}>
                                <div
                                    className={styles.progressBarFill}
                                    style={{ width: `${(stats.licenses.assigned / stats.licenses.purchased) * 100 || 0}%`, background: 'var(--accent-blue)' }}
                                />
                            </div>
                            <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                                {stats.licenses.assigned} assigned / {stats.licenses.purchased} seats
                            </div>
                        </div>
                    )
                },
                {
                    label: "Privileged Access",
                    value: stats.entra.admins.reduce((sum, r) => sum + r.count, 0),
                    path: '/service/entra/admins',
                    subValues: stats.entra.admins.slice(0, 3).map(r => ({ label: r.name, value: r.count }))
                }
            ]
        },
        {
            title: "Endpoint Management",
            icon: Laptop,
            color: "#a855f7",
            blocks: [
                {
                    label: "Fleet Inventory",
                    value: stats.devices.entraTotal,
                    path: '/service/intune/devices',
                    subValues: stats.devices.osSummary ? [
                        { label: "Windows", value: stats.devices.osSummary.windowsCount },
                        { label: "iOS", value: stats.devices.osSummary.iosCount },
                        { label: "macOS", value: stats.devices.osSummary.macOSCount }
                    ] : []
                },
                {
                    label: "Intune Compliance",
                    value: `${stats.devices.compliant}/${stats.devices.total}`,
                    path: '/service/intune/devices',
                    subValues: [
                        { label: "Managed", value: stats.devices.total },
                        { label: "Healthy", value: stats.devices.compliant }
                    ]
                }
            ]
        },
        {
            title: "Collaboration",
            icon: Users,
            color: "#6366f1",
            blocks: [
                {
                    label: "Teams Infrastructure",
                    value: stats.teams.total,
                    path: '/service/entra/groups',
                    subValues: [
                        { label: "Private", value: stats.teams.private },
                        { label: "Public", value: stats.teams.public }
                    ]
                }
            ]
        },
        {
            title: "Tenant Posture",
            icon: Shield,
            color: "#f59e0b",
            blocks: [
                {
                    label: "Secure Score",
                    value: `${stats.security.score}/${stats.security.max}`,
                    path: '/service/admin/secure-score',
                    custom: (
                        <div className={styles.progressBarContainer}>
                            <div
                                className={styles.progressBarFill}
                                style={{ width: `${(stats.security.score / stats.security.max) * 100 || 0}%`, background: 'var(--accent-warning)' }}
                            />
                        </div>
                    )
                },
                {
                    label: "Service Health",
                    value: stats.security.healthIssues > 0 ? "Alert" : "Healthy",
                    path: '/service/admin/service-health',
                    custom: (
                        <span className={styles.statusText} style={{ color: stats.security.healthIssues > 0 ? '#ef4444' : '#10b981' }}>
                            {stats.security.healthIssues > 0 ? `${stats.security.healthIssues} Active Issues` : "All Systems Operational"}
                        </span>
                    )
                }
            ]
        }
    ];

    return (
        <div className={styles.container}>
            {loading && <Loader3D showOverlay={true} />}

            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>M365 Bird's Eye</h1>
                    <p className={styles.subtitle}>Real-time environment telemetry and resource mapping.</p>
                </div>
                <button onClick={() => fetchData(true)} className={styles.refreshBtn}>
                    <RefreshCw size={14} className={loading ? styles.spinning : ""} />
                    <span>Refresh</span>
                </button>
            </header>

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
