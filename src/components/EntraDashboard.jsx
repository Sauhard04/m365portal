import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { UsersService, GroupsService, DevicesService, SubscriptionsService, RolesService } from '../services/entra';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Smartphone, CreditCard, UserCog, Loader2, ArrowRight, LayoutGrid } from 'lucide-react';

const EntraDashboard = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();

    // Stats State
    const [stats, setStats] = useState({
        users: { total: 0, growth: '+0%' },
        groups: { total: 0, growth: '+0%' },
        devices: { total: 0, growth: '+0%' },
        subs: { total: 0, growth: 'Active' },
        devices: { total: 0, growth: '+0%' },
        subs: { total: 0, growth: 'Active' },
        admins: { total: 0, growth: 'Security' },
        apps: { total: 0, growth: 'Registered' }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const client = new GraphService(response.accessToken).client;

                    // Parallel Fetch
                    // Parallel Fetch
                    const [userCounts, groupCounts, deviceCounts, subCounts, adminCounts, appsCount] = await Promise.all([
                        UsersService.getUserCounts(client),
                        GroupsService.getGroupCounts(client),
                        DevicesService.getDeviceCounts(client),
                        SubscriptionsService.getSubscriptionCounts(client),
                        RolesService.getAdminCounts(client),
                        client.api("/applications").count(true).header('ConsistencyLevel', 'eventual').get().then(res => res['@odata.count'] || 0).catch(() => 0)
                    ]);

                    setStats({
                        users: { total: userCounts.total, growth: 'Manage' },
                        groups: { total: groupCounts.total, growth: 'Manage' },
                        devices: { total: deviceCounts.total, growth: 'Manage' },
                        subs: { total: subCounts.active, growth: 'Active' },
                        admins: { total: adminCounts.globalAdmins, growth: 'Global Admins' },
                        apps: { total: appsCount, growth: 'Registered' }
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
        {
            label: 'Total Users',
            value: stats.users.total.toLocaleString(),
            trend: stats.users.growth,
            color: 'text-blue-400',
            path: '/service/entra/users',
            icon: Users
        },
        {
            label: 'Groups',
            value: stats.groups.total.toLocaleString(),
            trend: stats.groups.growth,
            color: 'text-indigo-400',
            path: '/service/entra/groups',
            icon: Users
        },
        {
            label: 'Subscriptions',
            value: stats.subs.total.toLocaleString(),
            trend: stats.subs.growth,
            color: 'text-orange-400',
            path: '/service/entra/subscriptions',
            icon: CreditCard
        },
        {
            label: 'Privileged Roles',
            value: stats.admins.total.toLocaleString(),
            trend: stats.admins.growth,
            color: 'text-red-400',
            path: '/service/entra/admins',
            icon: Shield
        },
        {
            label: 'Applications',
            value: stats.apps.total.toLocaleString(),
            trend: stats.apps.growth,
            color: 'text-cyan-400',
            path: '/service/entra/apps',
            icon: LayoutGrid
        },
        {
            label: 'Devices',
            value: stats.devices.total.toLocaleString(),
            trend: stats.devices.growth,
            color: 'text-teal-400',
            path: '/service/entra/devices',
            icon: Smartphone
        }
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <div className="w-full">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-['Outfit'] bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent leading-tight mb-2">
                        Microsoft Entra ID
                    </h1>
                    <p className="text-sm text-gray-400">Identity and access management</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
                    >
                        {tiles.map((tile, i) => (
                            <div
                                key={i}
                                onClick={() => navigate(tile.path)}
                                className="glass p-6 cursor-pointer hover:bg-white/5 transition-all hover:scale-[1.02]"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-gray-400 text-sm">{tile.label}</p>
                                    <tile.icon className={`w-5 h-5 ${tile.color}`} />
                                </div>

                                <p className="text-3xl font-bold">{tile.value}</p>

                                <div className={`mt-4 flex items-center text-xs ${tile.color}`}>
                                    <span className="font-bold">{tile.trend}</span>
                                    {/* Replicating the "Source: Microsoft Graph" part if needed, or just keeping it simple */}
                                    <span className="ml-2 text-gray-500 text-[10px] uppercase tracking-wider">Source: Microsoft Graph</span>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default EntraDashboard;
