// Comprehensive sections configuration for Birds Eye View
// This file exports a function that generates sections based on stats

import {
    Users, ShieldCheck, Mail, Globe, LayoutGrid, KeyRound, UserCog, Shield,
    UserX, CreditCard, AppWindow, Activity, Laptop, CheckCircle, AlertTriangle,
    FileWarning, Smartphone, Monitor, Command, Database, FileText, Lock, TrendingUp
} from 'lucide-react';

export const generateSections = (stats, styles) => [
    {
        title: "Admin Center",
        icon: LayoutGrid,
        color: "#0078d4",
        blocks: [
            {
                label: "Mailbox Operations",
                value: stats.admin.mailboxes,
                path: '/service/admin/emails',
                subValues: [
                    { label: "Total", value: stats.admin.mailboxes },
                    { label: "Active (7D)", value: stats.admin.activeMail }
                ]
            },
            {
                label: "Domain Infrastructure",
                value: stats.admin.domains,
                path: '/service/admin/domains',
                custom: (
                    <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                        Registered Domains
                    </div>
                )
            },
            {
                label: "Service Health",
                value: stats.admin.healthIssues > 0 ? "Alert" : "Healthy",
                path: '/service/admin/service-health',
                custom: (
                    <span className={styles.statusText} style={{ color: stats.admin.healthIssues > 0 ? '#ef4444' : '#10b981' }}>
                        {stats.admin.healthIssues > 0 ? `${stats.admin.healthIssues} Active Issues` : "All Systems Operational"}
                    </span>
                )
            }
        ]
    },
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
                    { label: "Guests", value: stats.entra.guest }
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
            },
            {
                label: "Conditional Access",
                value: stats.entra.caPolicies,
                path: '/service/entra/conditional-access',
                custom: (
                    <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                        Active Policies
                    </div>
                )
            },
            {
                label: "Identity Protection",
                value: stats.entra.riskyUsers,
                path: '/service/entra/risky-users',
                custom: (
                    <span className={styles.statusText} style={{ color: stats.entra.riskyUsers > 0 ? '#ef4444' : '#10b981' }}>
                        {stats.entra.riskyUsers > 0 ? `${stats.entra.riskyUsers} At Risk` : "No Risks Detected"}
                    </span>
                )
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
                value: stats.intune.entraTotal,
                path: '/service/intune/devices',
                subValues: stats.intune.osSummary ? [
                    { label: "Windows", value: stats.intune.osSummary.windowsCount },
                    { label: "iOS", value: stats.intune.osSummary.iosCount },
                    { label: "macOS", value: stats.intune.osSummary.macOSCount }
                ] : []
            },
            {
                label: "Intune Compliance",
                value: `${stats.intune.compliant}/${stats.intune.total}`,
                path: '/service/intune/devices',
                subValues: [
                    { label: "Managed", value: stats.intune.total },
                    { label: "Healthy", value: stats.intune.compliant }
                ]
            },
            {
                label: "Configuration Profiles",
                value: stats.intune.configProfiles,
                path: '/service/intune/config-profiles',
                custom: (
                    <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                        Active Configurations
                    </div>
                )
            },
            {
                label: "Applications",
                value: stats.intune.applications,
                path: '/service/intune/applications',
                custom: (
                    <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                        Deployed Apps
                    </div>
                )
            }
        ]
    },
    {
        title: "Security & Compliance",
        icon: Shield,
        color: "#ef4444",
        blocks: [
            {
                label: "Secure Score",
                value: `${stats.security.score}/${stats.security.max}`,
                path: '/service/admin/secure-score',
                custom: (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-20px' }}>
                        <div className={styles.circularChartContainer}>
                            <svg viewBox="0 0 36 36" className={styles.circularChart}>
                                <path className={styles.circularChartBg}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path className={styles.circularChartFill}
                                    strokeDasharray={`${(stats.security.score / stats.security.max) * 100 || 0}, 100`}
                                    stroke="#ef4444"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                            </svg>
                            <div className={styles.circularChartText}>
                                {Math.round((stats.security.score / stats.security.max) * 100 || 0)}%
                            </div>
                        </div>
                    </div>
                )
            },
            {
                label: "Security Alerts",
                value: stats.security.alerts,
                path: '/service/security/alerts',
                custom: (
                    <span className={styles.statusText} style={{ color: stats.security.alerts > 0 ? '#ef4444' : '#10b981' }}>
                        {stats.security.alerts > 0 ? `${stats.security.alerts} Active` : "No Alerts"}
                    </span>
                )
            },
            {
                label: "Security Incidents",
                value: stats.security.incidents,
                path: '/service/security/incidents',
                custom: (
                    <span className={styles.statusText} style={{ color: stats.security.incidents > 0 ? '#ef4444' : '#10b981' }}>
                        {stats.security.incidents > 0 ? `${stats.security.incidents} Open` : "No Incidents"}
                    </span>
                )
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
                value: stats.collaboration.teams,
                path: '/service/teams',
                subValues: [
                    { label: "Private", value: stats.collaboration.privateTeams },
                    { label: "Public", value: stats.collaboration.publicTeams }
                ]
            },
            {
                label: "Exchange Workloads",
                value: stats.collaboration.mailboxes,
                path: '/service/admin/emails',
                subValues: [
                    { label: "Active (7D)", value: stats.collaboration.activeEmail },
                    { label: "Mailboxes", value: stats.collaboration.mailboxes }
                ]
            },
            {
                label: "SharePoint Sites",
                value: stats.collaboration.sharepoint || "N/A",
                path: '/service/sharepoint',
                custom: (
                    <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                        Total Collections
                    </div>
                )
            },
            {
                label: "OneDrive Accounts",
                value: stats.collaboration.onedrive,
                path: null,
                custom: (
                    <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                        Active Storage
                    </div>
                )
            }
        ]
    },
    {
        title: "Data Governance",
        icon: FileText,
        color: "#059669",
        blocks: [
            {
                label: "Information Protection",
                value: stats.purview.labels,
                path: null,
                subValues: [
                    { label: "Sens. Labels", value: stats.purview.labels },
                    { label: "Ret. Labels", value: stats.purview.retentionPolicies }
                ]
            },
            {
                label: "Data Loss Prevention",
                value: stats.purview.dlpPolicies,
                path: null,
                custom: (
                    <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                        Active Policies & Searches
                    </div>
                )
            },
            {
                label: "eDiscovery Cases",
                value: stats.purview.dlpAlerts,
                path: null,
                custom: (
                    <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                        Active Investigations
                    </div>
                )
            }
        ]
    },
    {
        title: "Usage & Analytics",
        icon: TrendingUp,
        color: "#f59e0b",
        blocks: [
            {
                label: "Active Users (7D)",
                value: stats.usage.activeUsers7d,
                path: '/service/usage',
                custom: (
                    <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                        Last 7 Days
                    </div>
                )
            },
            {
                label: "Storage Consumption",
                value: `${(stats.usage.storage / 1073741824).toFixed(2)} GB`,
                path: null,
                custom: (
                    <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                        OneDrive Total
                    </div>
                )
            }
        ]
    }
];
