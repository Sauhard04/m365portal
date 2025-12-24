import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { GroupsService } from '../services/entra';
import { ArrowLeft, Search, Download, UsersRound, Users, Flag, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const EntraGroups = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        const fetchGroups = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const client = new GraphService(response.accessToken).client;
                    const data = await GroupsService.getAllGroups(client, 100);
                    setGroups(data);
                } catch (error) {
                    console.error("Group fetch error:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchGroups();
    }, [accounts, instance]);

    const filteredGroups = groups.filter(group => {
        const matchesText = (group.displayName || '').toLowerCase().includes(filterText.toLowerCase());

        const isSecurity = group.securityEnabled;
        const isDist = group.mailEnabled && !group.securityEnabled;

        let matchesType = true;
        if (filterType === 'security') matchesType = isSecurity;
        if (filterType === 'distribution') matchesType = isDist;
        if (filterType === 'm365') matchesType = group.groupTypes?.includes('Unified');

        return matchesText && matchesType;
    });

    const getGroupType = (group) => {
        if (group.groupTypes?.includes('Unified')) return 'Microsoft 365';
        if (group.securityEnabled) return 'Security';
        if (group.mailEnabled) return 'Distribution';
        return 'Other';
    };

    const handleDownloadCSV = () => {
        const headers = ['Group Name', 'Email', 'Type', 'Description'];
        const rows = filteredGroups.map(g => [
            `"${g.displayName}"`,
            `"${g.mail || ''}"`,
            `"${getGroupType(g)}"`,
            `"${g.description || ''}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'entra_groups.csv';
        link.click();
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
                <button
                    onClick={() => navigate('/service/entra')}
                    className="group relative px-6 py-2.5 rounded-full text-white font-medium bg-gradient-to-r from-[#00a4ef] to-[#0078d4] hover:from-[#2bbafa] hover:to-[#1089e6] shadow-[0_0_20px_rgba(0,164,239,0.3)] hover:shadow-[0_0_30px_rgba(0,164,239,0.5)] transition-all duration-300 flex items-center gap-2 overflow-hidden border border-white/10 mb-6"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <ArrowLeft className="w-4 h-4 relative z-10 group-hover:-translate-x-1 transition-transform" />
                    <span className="relative z-10">Back to Dashboard</span>
                </button>

                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold font-['Outfit'] bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            Groups
                        </h1>
                        <p className="text-gray-400 mt-1">Manage security and distribution groups</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 text-gray-300">
                            <option value="all">All Types</option>
                            <option value="security">Security</option>
                            <option value="distribution">Distribution</option>
                            <option value="m365">Microsoft 365</option>
                        </select>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search groups..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-48 transition-all"
                            />
                        </div>
                        <button onClick={handleDownloadCSV} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg px-3 py-2 text-sm transition-colors flex items-center gap-2">
                            <Download className="w-4 h-4" /> Export
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <div className="glass overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/5">
                                        <th className="p-4 font-semibold text-gray-300 text-sm">Group Name</th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm">Type</th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm">Email</th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGroups.length > 0 ? (
                                        filteredGroups.map((group, i) => (
                                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold">
                                                            <UsersRound className="w-4 h-4" />
                                                        </div>
                                                        <span className="font-medium text-white">{group.displayName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-300 text-sm">{getGroupType(group)}</td>
                                                <td className="p-4 text-gray-400 text-sm">{group.mail || '-'}</td>
                                                <td className="p-4 text-gray-400 text-sm max-w-xs truncate">{group.description}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="p-8 text-center text-gray-500">
                                                No groups found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};
export default EntraGroups;
