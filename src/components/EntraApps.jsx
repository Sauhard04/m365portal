import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { ArrowLeft, Search, Download, Box, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const EntraApps = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        const fetchApps = async () => {
            try {
                if (accounts.length > 0) {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const graphService = new GraphService(response.accessToken);
                    const data = await graphService.getApplications();
                    setApps(data || []);
                }
            } catch (error) {
                console.error("Failed to fetch apps", error);
            } finally {
                setLoading(false);
            }
        };
        if (accounts.length > 0) {
            fetchApps();
        }
    }, [accounts, instance]);

    const filteredApps = apps.filter(app =>
        app.displayName?.toLowerCase().includes(filterText.toLowerCase()) ||
        app.appId?.toLowerCase().includes(filterText.toLowerCase())
    );

    const handleDownloadCSV = () => {
        const headers = ['Display Name', 'App ID', 'Created Date', 'Sign-in Audience'];
        const rows = filteredApps.map(a => [
            `"${a.displayName}"`,
            `"${a.appId}"`,
            `"${a.createdDateTime}"`,
            `"${a.signInAudience}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'entra_applications.csv';
        link.click();
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
                <button
                    onClick={() => navigate('/service/entra')}
                    className="group relative px-6 py-2.5 rounded-full text-white font-medium bg-gradient-to-r from-[#00a4ef] to-[#0078d4] hover:from-[#2bbafa] hover:to-[#1089e6] shadow-[0_0_20px_rgba(0,164,239,0.3)] hover:shadow-[0_0_30px_rgba(0,164,239,0.5)] transition-all duration-300 flex items-center gap-2 overflow-hidden border border-white/10"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <ArrowLeft className="w-4 h-4 relative z-10 group-hover:-translate-x-1 transition-transform" />
                    <span className="relative z-10">Back to Entra ID</span>
                </button>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-['Outfit'] bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            App Registrations
                        </h1>
                        <p className="text-gray-400 mt-1">Manage enterprise applications</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search apps..."
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
                                        <th className="p-4 font-semibold text-gray-300 text-sm">Display Name</th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm">Application (Client) ID</th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm">Created</th>
                                        <th className="p-4 font-semibold text-gray-300 text-sm">Audience</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredApps.length > 0 ? (
                                        filteredApps.map((app, i) => (
                                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-cyan-600/20 flex items-center justify-center text-cyan-400 font-bold">
                                                            <Box className="w-4 h-4" />
                                                        </div>
                                                        <span className="font-medium text-white">{app.displayName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-300 text-sm font-mono">{app.appId}</td>
                                                <td className="p-4 text-gray-400 text-sm">{new Date(app.createdDateTime).toLocaleDateString()}</td>
                                                <td className="p-4 text-gray-400 text-sm">{app.signInAudience}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="p-8 text-center text-gray-500">
                                                No applications found.
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

export default EntraApps;
