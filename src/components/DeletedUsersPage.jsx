import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { GraphService } from '../services/graphService';
import { loginRequest } from '../authConfig';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trash2, RefreshCw, AlertCircle, Loader2, Search, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DeletedUsersPage = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();

    // State
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterText, setFilterText] = useState('');

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (accounts.length > 0) {
                const response = await instance.acquireTokenSilent({
                    ...loginRequest,
                    account: accounts[0]
                });
                const graphService = new GraphService(response.accessToken);
                const data = await graphService.getDeletedUsers();
                setUsers(data);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to fetch deleted users.");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [accounts]);

    // Filtering
    const filteredUsers = users.filter(user => {
        const searchStr = filterText.toLowerCase();
        const name = user.displayName?.toLowerCase() || '';
        const email = user.userPrincipalName?.toLowerCase() || '';
        return name.includes(searchStr) || email.includes(searchStr);
    });

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto">
                <button
                    onClick={() => navigate('/service/admin')}
                    className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Admin
                </button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-['Outfit'] bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent leading-tight mb-2">
                            Deleted Users
                        </h1>
                        <p className="text-sm text-gray-400">Manage recently deleted users (Soft Deleted)</p>
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 w-64"
                            />
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={fetchData}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </motion.button>
                    </div>
                </div>

                {/* Content */}
                <div className="glass-panel rounded-xl overflow-hidden min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-4" />
                            <p className="text-gray-400">Fetching deleted users...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-red-400">
                            <AlertCircle className="w-10 h-10 mb-4" />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="py-4 px-6 font-semibold text-xs text-gray-400 uppercase tracking-wider">Display Name</th>
                                        <th className="py-4 px-6 font-semibold text-xs text-gray-400 uppercase tracking-wider">User Principal Name</th>
                                        <th className="py-4 px-6 font-semibold text-xs text-gray-400 uppercase tracking-wider">ID</th>
                                        <th className="py-4 px-6 font-semibold text-xs text-gray-400 uppercase tracking-wider">Deleted Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                                                        <Trash2 className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-medium text-white">{user.displayName}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-gray-400 text-sm">{user.userPrincipalName}</td>
                                            <td className="py-4 px-6 text-gray-500 text-xs font-mono">{user.id}</td>
                                            <td className="py-4 px-6 text-gray-400 text-sm">
                                                {user.deletedDateTime ? new Date(user.deletedDateTime).toLocaleDateString() : 'N/A'}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="py-16 text-center text-gray-500">
                                                No deleted users found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeletedUsersPage;
