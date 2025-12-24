import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { UsersService } from '../services/entra';
import { ArrowLeft, Search, Download, CheckCircle2, XCircle, Loader2, User, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const EntraUsers = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterLicense, setFilterLicense] = useState('all');

    useEffect(() => {
        const fetchUsers = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const client = new GraphService(response.accessToken).client;
                    const data = await UsersService.getAllUsers(client, 100);
                    setUsers(data);
                } catch (error) {
                    console.error("User fetch error:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchUsers();
    }, [accounts, instance]);

    const filteredUsers = users.filter(user => {
        const matchesText = (user.displayName || '').toLowerCase().includes(filterText.toLowerCase()) ||
            (user.userPrincipalName || '').toLowerCase().includes(filterText.toLowerCase());

        const matchesType = filterType === 'all' ||
            (filterType === 'guest' ? user.userType === 'Guest' : user.userType !== 'Guest');

        const matchesStatus = filterStatus === 'all' ||
            (filterStatus === 'enabled' ? user.accountEnabled : !user.accountEnabled);

        const isLicensed = user.assignedLicenses && user.assignedLicenses.length > 0;
        const matchesLicense = filterLicense === 'all' ||
            (filterLicense === 'licensed' ? isLicensed : !isLicensed);

        return matchesText && matchesType && matchesStatus && matchesLicense;
    });

    const handleDownloadCSV = () => {
        const headers = ['Display Name', 'User Principal Name', 'User Type', 'Account Enabled', 'Licensed', 'City', 'Country', 'Department', 'Job Title'];
        const rows = filteredUsers.map(u => [
            `"${u.displayName}"`,
            `"${u.userPrincipalName}"`,
            `"${u.userType || 'Member'}"`,
            u.accountEnabled,
            (u.assignedLicenses && u.assignedLicenses.length > 0) ? 'Yes' : 'No',
            `"${u.city || ''}"`,
            `"${u.country || ''}"`,
            `"${u.department || ''}"`,
            `"${u.jobTitle || ''}"`
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
                        <h1 className="text-3xl font-bold font-['Outfit'] bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            All Users
                        </h1>
                        <p className="text-gray-400 mt-1">Manage identities and access</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-gray-300">
                            <option value="all">All Types</option>
                            <option value="member">Members</option>
                            <option value="guest">Guests</option>
                        </select>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-gray-300">
                            <option value="all">All Status</option>
                            <option value="enabled">Enabled</option>
                            <option value="disabled">Disabled</option>
                        </select>
                        <select value={filterLicense} onChange={(e) => setFilterLicense(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-gray-300">
                            <option value="all">All License States</option>
                            <option value="licensed">Licensed</option>
                            <option value="unlicensed">Unlicensed</option>
                        </select>

                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-48 transition-all"
                            />
                        </div>
                        <button onClick={handleDownloadCSV} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg px-3 py-2 text-sm transition-colors flex items-center gap-2">
                            <Download className="w-4 h-4" /> Export
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
                                        <th className="p-4 font-semibold text-gray-300 text-sm">Display Name</th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm">User Principal Name</th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm">Type</th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm">Status</th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm">License</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map((user, i) => (
                                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                                                            {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'U'}
                                                        </div>
                                                        <span className="font-medium text-white">{user.displayName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-300 text-sm">{user.userPrincipalName}</td>
                                                <td className="p-4 text-gray-400 text-sm">{user.userType || 'Member'}</td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.accountEnabled
                                                        ? 'bg-green-500/10 text-green-400'
                                                        : 'bg-red-500/10 text-red-400'
                                                        }`}>
                                                        {user.accountEnabled ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                        {user.accountEnabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {user.assignedLicenses && user.assignedLicenses.length > 0 ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                                                            Licensed
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500 text-xs">Unlicensed</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-gray-500">
                                                No users found matching filters.
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
