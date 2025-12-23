import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { ArrowLeft, Search, Download, Users, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const EntraGroups = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                if (accounts.length > 0) {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const graphService = new GraphService(response.accessToken);
                    const data = await graphService.getGroups();
                    setGroups(data || []);
                }
            } catch (error) {
                console.error("Failed to fetch groups", error);
            } finally {
                setLoading(false);
            }
        };
        if (accounts.length > 0) {
            fetchGroups();
        }
    }, [accounts, instance]);

    const sortedGroups = React.useMemo(() => {
        let sortableItems = [...groups];
        if (filterText) {
            sortableItems = sortableItems.filter(g =>
                g.displayName?.toLowerCase().includes(filterText.toLowerCase()) ||
                g.mail?.toLowerCase().includes(filterText.toLowerCase())
            );
        }
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key] || '';
                const bVal = b[sortConfig.key] || '';
                if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [groups, filterText, sortConfig]);

    const getGroupType = (group) => {
        if (group.groupTypes?.includes('Unified')) return 'Microsoft 365';
        if (group.securityEnabled && !group.mailEnabled) return 'Security';
        if (group.mailEnabled && !group.securityEnabled) return 'Distribution';
        if (group.mailEnabled && group.securityEnabled) return 'Mail-Enabled Security';
        return 'Other';
    };

    const handleDownloadCSV = () => {
        const headers = ['Display Name', 'Email', 'Type', 'Description', 'Created Date'];
        const rows = filteredGroups.map(g => [
            `"${g.displayName}"`,
            `"${g.mail || ''}"`,
            `"${getGroupType(g)}"`,
            `"${g.description || ''}"`,
            `"${g.createdDateTime || ''}"`
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
                <button onClick={() => navigate('/service/entra')} className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Entra ID
                </button>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-['Outfit'] bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            Groups
                        </h1>
                        <p className="text-gray-400 mt-1">Manage groups and membership</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search groups..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64 transition-all"
                            />
                        </div>
                        <button onClick={handleDownloadCSV} className="btn-primary !py-2 !px-4 !text-sm flex items-center gap-2">
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <div className="glass overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/5">
                                        <th className="p-4 font-semibold text-gray-300 text-sm cursor-pointer hover:text-white select-none" onClick={() => requestSort('displayName')}>
                                            <div className="flex items-center gap-1">Display Name {sortConfig.key === 'displayName' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</div>
                                        </th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm cursor-pointer hover:text-white select-none" onClick={() => requestSort('mail')}>
                                            <div className="flex items-center gap-1">Email {sortConfig.key === 'mail' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</div>
                                        </th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm">Type</th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedGroups.length > 0 ? (
                                        sortedGroups.map((group, i) => (
                                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold">
                                                            <Users className="w-4 h-4" />
                                                        </div>
                                                        <span className="font-medium text-white">{group.displayName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-300 text-sm">{group.mail || '-'}</td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
                                                        {getGroupType(group)}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-400 text-sm truncate max-w-xs">{group.description || '-'}</td>
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
