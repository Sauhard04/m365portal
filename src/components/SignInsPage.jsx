import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { AlertTriangle, Loader2, MapPin, User, Clock, ArrowLeft } from 'lucide-react';

const SignInsPage = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [signIns, setSignIns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const graphService = new GraphService(response.accessToken);
                    const data = await graphService.getFailedSignIns();
                    setSignIns(data);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [instance, accounts]);

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-yellow-500" /></div>;

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8">
            <button onClick={() => navigate('/service/admin')} className="mb-4 flex items-center text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
                Recent Failed Sign-ins
            </h1>

            <div className="glass rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="p-4 font-semibold text-gray-400">User</th>
                                <th className="p-4 font-semibold text-gray-400">Location</th>
                                <th className="p-4 font-semibold text-gray-400">Reason</th>
                                <th className="p-4 font-semibold text-gray-400">Time</th>
                                <th className="p-4 font-semibold text-gray-400">App</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {signIns.length > 0 ? signIns.map((log, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/10 rounded-full">
                                                <User className="w-4 h-4 text-gray-300" />
                                            </div>
                                            <div>
                                                <div className="font-medium">{log.userPrincipalName}</div>
                                                <div className="text-xs text-gray-500">{log.userId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <MapPin className="w-4 h-4 text-gray-500" />
                                            {log.location?.city}, {log.location?.countryOrRegion}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-bold border border-red-500/20">
                                            {log.status?.failureReason || 'Unknown Error'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-400 flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        {new Date(log.createdDateTime).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-cyan-400">
                                        {log.appDisplayName}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">
                                        No recent failed sign-ins found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SignInsPage;
