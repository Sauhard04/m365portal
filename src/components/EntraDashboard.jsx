import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { UsersService, GroupsService, DevicesService, SubscriptionsService, RolesService } from '../services/entra';
import { motion } from 'framer-motion';
import { Users, Shield, Smartphone, CreditCard, Loader2, LayoutGrid, ArrowRight } from 'lucide-react';

const EntraDashboard = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();

    const [stats, setStats] = useState({
        users: { total: 0, growth: 'Manage' },
        groups: { total: 0, growth: 'Manage' },
        devices: { total: 0, growth: 'Manage' },
        subs: { total: 0, growth: 'Active' },
        admins: { total: 0, growth: 'Global Admins' },
        apps: { total: 0, growth: 'Registered' }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
                    const client = new GraphService(response.accessToken).client;

                    const [userCounts, groupCounts, deviceCounts, subCounts, adminCounts, appsCount] = await Promise.all([
                        UsersService.getUserCounts(client),
                        GroupsService.getGroupCounts(client),
                        DevicesService.getDeviceCounts(client),
                        SubscriptionsService.getSubscriptionCounts(client),
                        RolesService.getAdminCounts(client),
                        client.api("/applications").count(true).header('ConsistencyLevel', 'eventual').get().then(res => res['@odata.count'] || 0).catch(() => 0)
                    ]);

                    setStats({
                        users: { total: userCounts.total, growth: 'Directory' },
                        groups: { total: groupCounts.total, growth: 'Teams' },
                        devices: { total: deviceCounts.total, growth: 'Managed' },
                        subs: { total: subCounts.active, growth: 'Verified' },
                        admins: { total: adminCounts.globalAdmins, growth: 'Privileged' },
                        apps: { total: appsCount, growth: 'Enterprise' }
                    });
                } catch (error) {
                    console.error("Dashboard fetch error:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchDashboardData();
    }, [accounts, instance]);

    const tiles = [
        { label: 'Total Identities', value: stats.users.total, trend: stats.users.growth, color: 'var(--accent-blue)', path: '/service/entra/users', icon: Users },
        { label: 'Cloud Groups', value: stats.groups.total, trend: stats.groups.growth, color: 'var(--accent-purple)', path: '/service/entra/groups', icon: LayoutGrid },
        { label: 'Subscriptions', value: stats.subs.total, trend: stats.subs.growth, color: 'var(--accent-cyan)', path: '/service/entra/subscriptions', icon: CreditCard },
        { label: 'Global Admins', value: stats.admins.total, trend: stats.admins.growth, color: 'var(--accent-error)', path: '/service/entra/admins', icon: Shield },
        { label: 'App Registrations', value: stats.apps.total, trend: stats.apps.growth, color: 'var(--accent-indigo)', path: '/service/entra/apps', icon: LayoutGrid },
        { label: 'Managed Devices', value: stats.devices.total, trend: stats.devices.growth, color: 'var(--accent-success)', path: '/service/entra/devices', icon: Smartphone }
    ];

    return (
        <div className="animate-in">
            <header className="flex-between spacing-v-8">
                <div>
                    <h1 className="title-gradient" style={{ fontSize: '32px' }}>Entra ID Dashboard</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Unified identity protection and cloud authentication hub</p>
                </div>
            </header>

            {loading ? (
                <div className="flex-center" style={{ height: '400px' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--accent-blue)" />
                </div>
            ) : (
                <div className="stat-grid">
                    {tiles.map((tile, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ y: -5 }}
                            className="glass-card stat-card"
                            onClick={() => navigate(tile.path)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="flex-between spacing-v-4">
                                <span className="stat-label">{tile.label}</span>
                                <tile.icon size={20} style={{ color: tile.color }} />
                            </div>
                            <div className="stat-value">{tile.value.toLocaleString()}</div>
                            <div className="flex-between mt-4" style={{ marginTop: '16px' }}>
                                <span className="badge badge-info">{tile.trend}</span>
                                <ArrowRight size={14} style={{ color: 'var(--text-dim)' }} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EntraDashboard;
