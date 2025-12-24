import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { SubscriptionsService } from '../services/entra';
import { ArrowLeft, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const EntraSubscriptions = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubs = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const client = new GraphService(response.accessToken).client;
                    const data = await SubscriptionsService.getSubscriptions(client);
                    setSubs(data);
                } catch (error) {
                    console.error("Subs fetch error", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchSubs();
    }, [accounts, instance]);

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

                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-['Outfit'] bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                        Subscriptions
                    </h1>
                    <p className="text-gray-400 mt-1">Manage licenses and services</p>
                </div>

                <div className="glass overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="p-4 font-semibold text-gray-300 text-sm">SKU Name</th>
                                <th className="p-4 font-semibold text-gray-300 text-sm">Status</th>
                                <th className="p-4 font-semibold text-gray-300 text-sm">Total Licenses</th>
                                <th className="p-4 font-semibold text-gray-300 text-sm">Assigned</th>
                                <th className="p-4 font-semibold text-gray-300 text-sm">Available</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subs.map((sub, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-medium text-white flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-emerald-400" />
                                        {sub.skuPartNumber}
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sub.capabilityStatus === 'Enabled' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                            }`}>
                                            {sub.capabilityStatus === 'Enabled' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                            {sub.capabilityStatus}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-300">{sub.prepaidUnits?.enabled || 0}</td>
                                    <td className="p-4 text-gray-300">{sub.consumedUnits || 0}</td>
                                    <td className="p-4 text-gray-300">{(sub.prepaidUnits?.enabled || 0) - (sub.consumedUnits || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default EntraSubscriptions;
