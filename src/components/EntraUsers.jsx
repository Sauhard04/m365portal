import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { ArrowLeft, Search, Download, User, Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const EntraUsers = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [users, setUsers] = useState([]);
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

    const sortedUsers = React.useMemo(() => {
        let sortableItems = [...users];
        if (filterText) {
            sortableItems = sortableItems.filter(user =>
                user.displayName.toLowerCase().includes(filterText.toLowerCase()) ||
                user.userPrincipalName.toLowerCase().includes(filterText.toLowerCase())
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
    }, [users, filterText, sortConfig]);
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                if (accounts.length > 0) {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const graphService = new GraphService(response.accessToken);
                    const data = await graphService.getExchangeMailboxReport();
                    setUsers(data.reports || []);
                }
            } catch (error) {
                console.error("User fetch error:", error);
            } finally {
                setLoading(false);
            }
        };
        if (accounts.length > 0) {
            fetchUsers();
        }
    }, [accounts, instance]);

    const handleDownloadCSV = () => {
        const headers = ['Display Name', 'User Principal Name', 'User Type', 'Account Enabled', 'City', 'Country', 'Department', 'Job Title'];
        const rows = sortedUsers.map(u => [
            `"${u.displayName}"`,
            `"${u.userPrincipalName}"`,
            `"${u.userType || 'Member'}"`,
            u.accountEnabled,
            `"${u.city}"`,
            `"${u.country}"`,
            `"${u.department}"`,
            `"${u.jobTitle}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'entra_users.csv';
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
                            All Users
                        </h1>
                        <p className="text-gray-400 mt-1">Manage identities and access</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search users..."
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
                                        <th className="p-4 font-semibold text-gray-300 text-sm cursor-pointer hover:text-white select-none" onClick={() => requestSort('userPrincipalName')}>
                                            <div className="flex items-center gap-1">User Principal Name {sortConfig.key === 'userPrincipalName' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</div>
                                        </th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm cursor-pointer hover:text-white select-none" onClick={() => requestSort('city')}>
                                            <div className="flex items-center gap-1">Location {sortConfig.key === 'city' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</div>
                                        </th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm cursor-pointer hover:text-white select-none" onClick={() => requestSort('accountEnabled')}>
                                            <div className="flex items-center gap-1">Status {sortConfig.key === 'accountEnabled' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</div>
                                        </th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm cursor-pointer hover:text-white select-none" onClick={() => requestSort('jobTitle')}>
                                            <div className="flex items-center gap-1">Job Info {sortConfig.key === 'jobTitle' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedUsers.length > 0 ? (
                                        sortedUsers.map((user, i) => (
                                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                                                            {user.displayName.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-white">{user.displayName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-300 text-sm">{user.userPrincipalName}</td>
                                                <td className="p-4 text-gray-400 text-sm">{user.city ? `${user.city}, ${user.country}` : 'N/A'}</td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.accountEnabled === 'Yes'
                                                        ? 'bg-green-500/10 text-green-400'
                                                        : 'bg-red-500/10 text-red-400'
                                                        }`}>
                                                        {user.accountEnabled === 'Yes' ? (
                                                            <CheckCircle2 className="w-3 h-3" />
                                                        ) : (
                                                            <XCircle className="w-3 h-3" />
                                                        )}
                                                        {user.accountEnabled === 'Yes' ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-400 text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-300">{user.jobTitle || '-'}</span>
                                                        <span className="text-xs">{user.department}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-gray-500">
                                                No users found matching your search.
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

export default EntraUsers;
