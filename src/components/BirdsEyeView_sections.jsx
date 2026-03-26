// Comprehensive sections configuration for Birds Eye View
// This file exports a function that generates sections based on stats

import {
    Users, ShieldCheck, Mail, Globe, LayoutGrid, KeyRound, UserCog, Shield,
    UserX, CreditCard, AppWindow, Activity, Laptop, CheckCircle, AlertTriangle,
    FileWarning, Smartphone, Monitor, Command, Database, FileText, Lock, TrendingUp
} from 'lucide-react';

export const generateSections = (inputStats, styles) => {
    // Ensure we have a high-integrity object to prevent crashes
    const stats = {
        admin: inputStats?.admin || { mailboxes: 0, activeMail: 0, domains: 0 },
        entra: inputStats?.entra || { users: 0, signin: 0, licensed: 0, guest: 0, groups: 0, unifiedGroups: 0, securityGroups: 0, distGroups: 0, admins: [], caPolicies: 0, riskyUsers: 0 },
        intune: inputStats?.intune || { entraTotal: 0, compliant: 0, total: 0, configProfiles: 0, applications: 0, osSummary: null },
        collaboration: inputStats?.collaboration || { teams: 0, privateTeams: 0, publicTeams: 0, sharepoint: 0, onedrive: 0, mailboxes: 0, activeEmail: 0 },
        security: inputStats?.security || { score: 0, max: 100, alerts: 0, incidents: 0 },
        usage: inputStats?.usage || { activeUsers7d: 0, storage: 0 },
        licenses: inputStats?.licenses || { total: 0, assigned: 0, purchased: 0 },
        purview: inputStats?.purview || { labels: 0, retentionPolicies: 0, dlpPolicies: 0, dlpAlerts: 0 },
    };

    return [
        // ROW 1: Identity & Security Foundations
        {
            title: "Entra ID",
            portalUrl: "https://entra.microsoft.com",
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
                    label: "Privileged Access",
                    value: stats.entra.admins.reduce((sum, r) => sum + r.count, 0),
                    path: '/service/entra/admins',
                    subValues: stats.entra.admins.slice(0, 3).map(r => ({ label: r.name, value: r.count }))
                }
            ]
        },
        {
            title: "Security & Compliance",
            portalUrl: "https://security.microsoft.com",
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
                    label: "Identity Protection",
                    value: stats.entra.riskyUsers,
                    path: '/service/security/risky-users',
                    custom: (
                        <span className={styles.statusText} style={{ color: stats.entra.riskyUsers > 0 ? '#ef4444' : '#10b981' }}>
                            {stats.entra.riskyUsers > 0 ? `${stats.entra.riskyUsers} At Risk` : "No Risks Detected"}
                        </span>
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
                }
            ]
        },
        {
            title: "Admin Center",
            portalUrl: "https://admin.microsoft.com",
            icon: LayoutGrid,
            color: "#0078d4",
            blocks: [
                {
                    label: "Mailbox Operations",
                    value: stats.admin.mailboxes,
                    path: '/service/admin/report',
                    subValues: [
                        { label: "Total", value: stats.admin.mailboxes },
                        { label: "Active (7D)", value: stats.admin.activeMail }
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
                    label: "Domain Infrastructure",
                    value: stats.admin.domains,
                    path: '/service/admin/domains',
                    custom: (
                        <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                            Registered Domains
                        </div>
                    )
                }
            ]
        },

        // ROW 2: Collaboration & Endpoints
        {
            title: "Collaboration",
            portalUrl: "https://admin.microsoft.com",
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
                    label: "SharePoint Sites",
                    value: stats.collaboration.sharepoint,
                    path: '/service/sharepoint',
                    custom: (
                        <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                            Total Collections
                        </div>
                    )
                },
                {
                    label: "Exchange Workloads",
                    value: stats.collaboration.mailboxes,
                    path: '/service/admin/report',
                    subValues: [
                        { label: "Active (7D)", value: stats.collaboration.activeEmail },
                        { label: "Mailboxes", value: stats.collaboration.mailboxes }
                    ]
                }
            ]
        },
        {
            title: "Endpoint Management",
            portalUrl: "https://intune.microsoft.com",
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
                }
            ]
        },
        {
            title: "Usage & Analytics",
            portalUrl: "https://admin.microsoft.com/Adminportal/Home#/reportsUsage",
            icon: TrendingUp,
            color: "#f59e0b",
            blocks: [
                {
                    label: "Active Users (7D)",
                    value: stats.usage.activeUsers7d,
                    path: '/service/usage',
                    custom: (
                        <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                            Cross-Service Activity
                        </div>
                    )
                },
                {
                    label: "Storage Consumption",
                    value: `${(stats.usage.storage / 1073741824).toFixed(2)} GB`,
                    path: '/service/usage?tab=onedrive',
                    custom: (
                        <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                            OneDrive Total
                        </div>
                    )
                },
                {
                    label: "OneDrive Accounts",
                    value: stats.collaboration.onedrive,
                    path: '/service/usage?tab=onedrive',
                    custom: (
                        <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                            Provisioned OneDrive
                        </div>
                    )
                }
            ]
        },

        // ROW 3: Governance & Policies
        {
            title: "Data Governance",
            portalUrl: "https://purview.microsoft.com",
            icon: FileText,
            color: "#059669",
            blocks: [
                {
                    label: "Information Protection",
                    value: stats.purview.labels,
                    path: '/service/purview',
                    subValues: [
                        { label: "Sens. Labels", value: stats.purview.labels },
                        { label: "Ret. Labels", value: stats.purview.retentionPolicies }
                    ]
                },
                {
                    label: "Data Loss Prevention",
                    value: stats.purview.dlpPolicies,
                    path: '/service/purview/policies',
                    custom: (
                        <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                            DLP Policies Active
                        </div>
                    )
                },
                {
                    label: "Active Investigations",
                    value: stats.purview.dlpAlerts,
                    path: '/service/purview',
                    custom: (
                        <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                            Alerts & Search Cases
                        </div>
                    )
                }
            ]
        },
        {
            title: "Policy & Compliance",
            icon: Lock,
            color: "#6b7280",
            blocks: [
                {
                    label: "Conditional Access",
                    value: stats.entra.caPolicies,
                    path: '/service/governance/conditional-access',
                    custom: (
                        <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                            Mandatory MFA & Rules
                        </div>
                    )
                },
                {
                    label: "Endpoint Security",
                    value: stats.intune.applications,
                    path: '/service/intune/applications',
                    custom: (
                        <div className={styles.statusText} style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                            App Integrity Policies
                        </div>
                    )
                }
            ]
        }
    ];
};
