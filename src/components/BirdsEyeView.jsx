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
    Smartphone, Monitor, Command
} from 'lucide-react';

const BirdsEyeView = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        entra: {
            users: 0, signin: 0, licensed: 0, guest: 0,
            groups: 0, securityGroups: 0, distGroups: 0, unifiedGroups: 0,
            admins: [], // Array of { name, count }
            apps: 0, domains: 0, deletedUsers: 0
        },
        licenses: {
            purchased: 0, assigned: 0, total: 0,
            topSkus: [] // Array of { name, count }
        },
        devices: { total: 0, compliant: 0, entraTotal: 0, osSummary: null },
        security: { score: 0, max: 0, caPolicies: 0, healthIssues: 0 },
        exchange: { mailboxes: 0 },
        teams: { total: 0, private: 0, public: 0 },
        sharepoint: { sites: 0 }
    });

    useEffect(() => {
        const fetchData = async () => {
            // Check cache first
            const cached = await DataPersistenceService.load('BirdsEyeView');
            if (cached && !DataPersistenceService.isExpired('BirdsEyeView', 15)) { // 15 min cache
                setStats(cached);
                setLoading(false);
                return;
            }

            try {
                const request = {
                    scopes: ["User.Read.All", "Directory.Read.All", "DeviceManagementManagedDevices.Read.All", "Reports.Read.All", "Policy.Read.All", "ServiceHealth.Read.All"],
                    account: accounts[0],
                };
                const response = await instance.acquireTokenSilent(request);
                const graphService = new GraphService(response.accessToken);

                // Parallel Fetching of Expanded Data
                const [
                    users,
                    groups,
                    devices,
                    secureScore,
                    skus,
                    directoryRoles, // Now fetches all roles
                    apps,
                    domains,
                    deletedUsers,
                    caPolicies,
                    serviceIssues,
                    entraDevicesCount
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


                // --- Processing Data ---

                // Entra
                const userList = users.value || [];
                const groupList = groups.value || [];
                const skuList = skus.value || [];
                const roleList = directoryRoles || [];

                // Admin Roles Processing
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

                // Licenses
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

                // Teams
                const teamsGroups = groupList.filter(g => g.resourceProvisioningOptions?.includes('Team'));
                const teamsCount = teamsGroups.length;
                const privateTeams = teamsGroups.filter(g => g.visibility === 'Private').length;
                const publicTeams = teamsGroups.filter(g => g.visibility === 'Public').length;

                // Security Extras
                const activeIssues = serviceIssues.length;
                const enabledCaPolicies = (caPolicies || []).filter(p => p.state === 'enabled').length;

                const newStats = {
                    entra: userStats,
                    licenses: licenseStats,
                    devices: { ...devices, entraTotal: entraDevicesCount }, // { total, compliant, osSummary }
                    security: {
                        score: secureScore?.currentScore || 0,
                        max: secureScore?.maxScore || 0,
                        caPolicies: enabledCaPolicies,
                        healthIssues: activeIssues
                    },
                    exchange: { mailboxes: userStats.licensed }, // Proxy
                    teams: { total: teamsCount, private: privateTeams, public: publicTeams },
                    sharepoint: { sites: 0 } // Placeholder
                };

                setStats(newStats);
                await DataPersistenceService.save('BirdsEyeView', newStats);

            } catch (error) {
                console.error("Failed to fetch Bird's Eye data", error);
            } finally {
                setLoading(false);
            }
        };

        if (accounts.length > 0) {
            fetchData();
        }
    }, [instance, accounts]);

    if (loading) {
        return <div className="p-10 text-slate-500">Loading Overview...</div>;
    }

    const sections = [
        {
            title: "Entra ID",
            icon: ShieldCheck,
            color: "#0078D4", // Microsoft Blue
            stats: [
                { label: "Users", value: stats.entra.users, icon: Users, large: true, path: '/service/entra/users' },
                {
                    group: true,
                    path: '/service/entra/users',
                    items: [
                        { label: "Sign-in Enabled", value: stats.entra.signin },
                        { label: "Licensed Users", value: stats.entra.licensed },
                        { label: "Guest Users", value: stats.entra.guest },
                    ]
                },
                {
                    label: "Groups", value: stats.entra.groups, icon: Users, path: '/service/entra/groups',
                    subtext: `M365 ${stats.entra.unifiedGroups}\nSecurity ${stats.entra.securityGroups}\nDist ${stats.entra.distGroups}`
                },
                {
                    label: "Subscriptions", value: stats.licenses.total, icon: CreditCard, path: '/service/entra/subscriptions',
                    customRender: (
                        <div style={{ marginTop: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
                                <span>{stats.licenses.assigned} assigned / {stats.licenses.purchased} total</span>
                            </div>
                            {stats.licenses.topSkus.map((sku, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                                    <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '140px' }} title={sku.name}>{sku.name}</span>
                                    <span style={{ fontWeight: 600 }}>{sku.count}</span>
                                </div>
                            ))}
                        </div>
                    )
                },
                {
                    label: "Admin Roles", value: stats.entra.admins.reduce((sum, r) => sum + r.count, 0), icon: UserCog, path: '/service/entra/admins',
                    customRender: (
                        <div style={{ marginTop: '8px' }}>
                            {stats.entra.admins.slice(0, 3).map((role, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                                    <span>{role.name}</span>
                                    <span style={{ fontWeight: 600 }}>{role.count}</span>
                                </div>
                            ))}
                            {stats.entra.admins.length > 3 && <div style={{ fontSize: '10px', textAlign: 'right', color: 'var(--text-dim)' }}>+ {stats.entra.admins.length - 3} more roles</div>}
                        </div>
                    )
                },
                {
                    group: true,
                    items: [
                        { label: "Applications", value: stats.entra.apps, icon: AppWindow, path: '/service/entra/apps' },
                        { label: "Domains", value: stats.entra.domains, icon: Globe, path: '/service/admin/domains' },
                        { label: "Deleted Users", value: stats.entra.deletedUsers, icon: UserX, path: '/service/admin/deleted-users' }
                    ]
                }
            ]
        },
        {
            title: "Device Management",
            icon: Laptop,
            color: "#9332BF", // Intune Purple
            stats: [
                { label: "Total Devices", value: stats.devices.entraTotal, icon: Laptop, large: true, path: '/service/intune/devices' },
                {
                    label: "OS Breakdown", value: stats.devices.total > 0 ? "" : "No Data", icon: Command, path: '/service/intune/devices',
                    customRender: stats.devices.osSummary ? (
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Monitor size={12} /> Windows</div>
                                <span style={{ fontWeight: 600 }}>{stats.devices.osSummary.windowsCount}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Smartphone size={12} /> iOS</div>
                                <span style={{ fontWeight: 600 }}>{stats.devices.osSummary.iosCount}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Smartphone size={12} /> Android</div>
                                <span style={{ fontWeight: 600 }}>{stats.devices.osSummary.androidCount}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Laptop size={12} /> macOS</div>
                                <span style={{ fontWeight: 600 }}>{stats.devices.osSummary.macOSCount}</span>
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Use Intune for OS details</div>
                    )
                },
                {
                    label: "Intune Status", value: `${stats.devices.compliant}/${stats.devices.total}`, icon: CheckCircle, path: '/service/intune/devices',
                    subtext: `Managed ${stats.devices.total}\nCompliant ${stats.devices.compliant}`
                }
            ]
        },
        {
            title: "Teams & Groups",
            icon: Users,
            color: "#5059C9", // Teams Purple
            customIcon: (props) => (
                <div style={{ backgroundColor: '#5059C9', color: 'white', padding: '4px', borderRadius: '6px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>T</span>
                </div>
            ),
            stats: [
                { label: "Total Teams", value: stats.teams.total, large: true, path: '/service/entra/groups' },
                {
                    label: "Visibility", value: "", icon: Globe,
                    customRender: (
                        <div style={{ marginTop: '0px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <span>Private</span>
                                <span style={{ fontWeight: 600 }}>{stats.teams.private}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <span>Public</span>
                                <span style={{ fontWeight: 600 }}>{stats.teams.public}</span>
                            </div>
                        </div>
                    )
                }
            ]
        },
        {
            title: "Security & Health",
            icon: Shield,
            color: "#D83B01", // Microsoft Security Red/Orange
            stats: [
                { label: "Secure Score", value: `${stats.security.score}/${stats.security.max}`, icon: ShieldCheck, large: true, path: '/service/admin/secure-score' },
                {
                    label: "Health Status", value: stats.security.healthIssues > 0 ? "Alert" : "Healthy", icon: Activity, path: '/service/admin/service-health',
                    customRender: (
                        <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-dim)', textAlign: 'right' }}>
                            {stats.security.healthIssues > 0 ? (
                                <span style={{ fontWeight: 600, color: '#ef4444' }}>{stats.security.healthIssues} Active Issues</span>
                            ) : (
                                <span style={{ fontWeight: 600, color: '#10b981' }}>All Systems Operational</span>
                            )}
                        </div>
                    )
                },
                { label: "Active CA Policies", value: stats.security.caPolicies, icon: FileWarning, path: '/service/entra' } // CA Policies usually in Entra/Security
            ]
        }
    ];

    return (
        <div style={{ padding: '24px', height: '100%', overflowY: 'auto', backgroundColor: 'var(--bg-darker)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--glass-bg)', padding: '16px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--glass-border)' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        Microsoft 365 - Bird's Eye View
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-dim)' }}>
                        Deep-dive overview of your organization's Microsoft 365 environment.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: 'var(--text-dim)' }}>
                    <span>Live Monitor</span>
                    <div style={{ display: 'flex', marginLeft: '-8px' }}>
                        {sections.map((s, i) => (
                            <div key={i} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', position: 'relative', zIndex: 10, marginLeft: i > 0 ? '-8px' : 0 }}>
                                <s.icon size={14} style={{ color: s.color }} />
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'start' }}>
                {sections.map((section, index) => (
                    <div key={index} style={{ backgroundColor: 'var(--glass-bg)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--glass-border)', borderTop: `6px solid ${section.color}` }}>
                        <div style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)' }}>{section.title}</h3>
                                {section.customIcon ? section.customIcon() : (
                                    <section.icon size={24} style={{ color: section.color }} />
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {section.stats.map((stat, sIdx) => {
                                    if (stat.group) {
                                        return (
                                            <div
                                                key={sIdx}
                                                style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right' }}
                                            >
                                                {stat.items.map((item, i) => (
                                                    <div
                                                        key={i}
                                                        onClick={() => item.path && navigate(item.path)}
                                                        style={{ fontSize: '14px', display: 'flex', justifyContent: 'flex-end', gap: '8px', color: 'var(--text-dim)', cursor: item.path ? 'pointer' : 'default', alignItems: 'center' }}
                                                        className={item.path ? "hover:text-blue-600 dark:hover:text-blue-400" : ""}
                                                    >
                                                        <span>{item.label}</span>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)', minWidth: '20px', textAlign: 'right' }}>{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }
                                    return (
                                        <div
                                            key={sIdx}
                                            onClick={() => stat.path && navigate(stat.path)}
                                            style={{ position: 'relative', cursor: stat.path ? 'pointer' : 'default', transition: 'opacity 0.2s' }}
                                            className={stat.path ? "hover:opacity-75" : ""}
                                        >
                                            {/* Header Label */}
                                            {stat.label && <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{stat.label}</div>}

                                            {/* Main Value Row */}
                                            {(stat.value !== undefined) && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ fontSize: '28px', fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</div>
                                                    {stat.icon && <stat.icon size={28} style={{ color: 'var(--glass-border-hover)', strokeWidth: 1.5 }} />}
                                                </div>
                                            )}

                                            {/* Subtext Paragraph */}
                                            {stat.subtext && (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: 'var(--text-dim)', marginTop: '-8px', textAlign: 'right' }}>
                                                    <pre style={{ fontFamily: 'Inter, sans-serif', whiteSpace: 'pre-line', lineHeight: 1.2 }}>
                                                        {stat.subtext.split('\n').map((line, l) => (
                                                            <div key={l} style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                <span style={{ color: 'var(--text-dim)' }}>{line.split(' ')[0]}</span>
                                                                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{line.split(' ')[1]}</span>
                                                            </div>
                                                        ))}
                                                    </pre>
                                                </div>
                                            )}

                                            {/* Custom Render */}
                                            {stat.customRender}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BirdsEyeView;
