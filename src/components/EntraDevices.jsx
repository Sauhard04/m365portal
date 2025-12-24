import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { DevicesService } from '../services/entra';
import { ArrowLeft, Search, Laptop, Monitor, Smartphone, Tablet, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const EntraDevices = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        const fetchDevices = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const client = new GraphService(response.accessToken).client;
                    const data = await DevicesService.getAllDevices(client, 100);
                    setDevices(data);
                } catch (error) {
                    console.error("Device fetch error", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchDevices();
    }, [accounts, instance]);

    const filteredDevices = devices.filter(d =>
        d.displayName?.toLowerCase().includes(filterText.toLowerCase())
    );

    const getOsIcon = (os) => {
        const lower = os?.toLowerCase() || '';
        if (lower.includes('window')) return <Monitor className="w-4 h-4" />;
        if (lower.includes('ios') || lower.includes('iphone')) return <Smartphone className="w-4 h-4" />;
        if (lower.includes('android')) return <Smartphone className="w-4 h-4" />;
        return <Laptop className="w-4 h-4" />;
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

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-['Outfit'] bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Devices
                        </h1>
                        <p className="text-gray-400 mt-1">Manage organization devices</p>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search devices..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none w-64 transition-all"
                        />
                    </div>
                </div>

                <div className="glass overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="p-4 font-semibold text-gray-300 text-sm">Device Name</th>
                                <th className="p-4 font-semibold text-gray-300 text-sm">OS</th>
                                <th className="p-4 font-semibold text-gray-300 text-sm">Ownership</th>
                                <th className="p-4 font-semibold text-gray-300 text-sm">Last Sign-in</th>
                                <th className="p-4 font-semibold text-gray-300 text-sm">Compliance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDevices.map((device, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-medium text-white">{device.displayName}</td>
                                    <td className="p-4 text-gray-400 text-sm flex items-center gap-2">
                                        {getOsIcon(device.operatingSystem)} {device.operatingSystem}
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">{device.isManaged ? 'Managed' : 'Unmanaged'}</td>
                                    <td className="p-4 text-gray-400 text-sm">
                                        {device.approximateLastSignInDateTime
                                            ? new Date(device.approximateLastSignInDateTime).toLocaleDateString()
                                            : 'Never'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${device.complianceState === 'compliant' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                                            }`}>
                                            {device.complianceState === 'compliant' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                            {device.complianceState}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default EntraDevices;
