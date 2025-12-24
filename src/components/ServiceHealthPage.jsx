/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { Activity, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, ChevronDown, ChevronRight, AlertOctagon, Info, XCircle } from 'lucide-react';

const ServiceHealthPage = () => {
    const { instance, accounts } = useMsal();
    const navigate = useNavigate();
    const [health, setHealth] = useState([]);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState('All');
    const [expandedIssue, setExpandedIssue] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (accounts.length > 0) {
                try {
                    const response = await instance.acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0]
                    });
                    const graphService = new GraphService(response.accessToken);
                    const [healthData, issuesData] = await Promise.all([
                        graphService.getServiceHealth(),
                        graphService.getServiceIssues()
                    ]);
                    setHealth(healthData || []);
                    setIssues(issuesData || []);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [instance, accounts]);

    const filteredIssues = selectedService === 'All'
        ? issues
        : issues.filter(i => i.service === selectedService);

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-green-500" /></div>;

    const unhealthyServices = health.filter(s => s.status !== 'ServiceOperational');

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8">
            <div className="max-w-7xl mx-auto">
                <button onClick={() => navigate('/service/admin')} className="mb-6 flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5 w-fit">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                </button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Activity className="w-8 h-8 text-green-400" />
                            Service Health
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm">Real-time status monitoring for your Microsoft 365 environment</p>
                    </div>
                    {unhealthyServices.length > 0 ? (
                        <div className="px-5 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 shadow-lg shadow-red-500/5">
                            <div className="p-2 bg-red-500/20 rounded-full">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="block font-bold text-lg">{unhealthyServices.length} Services Impacted</span>
                                <span className="text-xs opacity-75">Action required for normal operations</span>
                            </div>
                        </div>
                    ) : (
                        <div className="px-5 py-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 shadow-lg shadow-green-500/5">
                            <div className="p-2 bg-green-500/20 rounded-full">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="block font-bold text-lg">All Systems Operational</span>
                                <span className="text-xs opacity-75">No incidents reported</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Service Filters - Horizontal Scroll */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide mask-fade-right">
                        <button
                            onClick={() => setSelectedService('All')}
                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedService === 'All' ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white'}`}
                        >
                            All Services
                        </button>
                        <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />
                        {health.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedService(s.service)}
                                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedService === s.service ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white'}`}
                            >
                                {s.service}
                                {s.status !== 'ServiceOperational' && <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shadow-lg shadow-yellow-500/50" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Issues Table */}
                <div className="glass rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-[#0A0A0A]">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <h2 className="text-xl font-bold flex items-center gap-3">
                            <AlertOctagon className="w-6 h-6 text-orange-400" />
                            Active Issues & Advisories
                        </h2>
                        <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-mono text-gray-400 border border-white/5">
                            {filteredIssues.length} ACTIVE
                        </span>
                    </div>

                    {filteredIssues.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-white/5 bg-black/20">
                                        <th className="p-5 pl-8 font-semibold">Classification</th>
                                        <th className="p-5 font-semibold">Service</th>
                                        <th className="p-5 font-semibold">Title</th>
                                        <th className="p-5 font-semibold">ID</th>
                                        <th className="p-5 font-semibold">Last Updated</th>
                                        <th className="p-5"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredIssues.map((issue) => (
                                        <React.Fragment key={issue.id}>
                                            <tr
                                                onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                                                className={`cursor-pointer transition-colors group ${expandedIssue === issue.id ? 'bg-white/5' : 'hover:bg-white/5'}`}
                                            >
                                                <td className="p-5 pl-8">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${issue.classification === 'Incident' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                                        {issue.classification === 'Incident' ? <XCircle className="w-3.5 h-3.5 mr-1.5" /> : <Info className="w-3.5 h-3.5 mr-1.5" />}
                                                        {issue.classification}
                                                    </span>
                                                </td>
                                                <td className="p-5 font-medium text-gray-300">{issue.service}</td>
                                                <td className="p-5 font-medium text-white max-w-md truncate" title={issue.title}>{issue.title}</td>
                                                <td className="p-5 text-gray-500 font-mono text-xs">{issue.id}</td>
                                                <td className="p-5 text-gray-400 text-sm">{new Date(issue.lastModifiedDateTime).toLocaleDateString()}</td>
                                                <td className="p-5 text-gray-500 text-right pr-8">
                                                    {expandedIssue === issue.id ? <ChevronDown className="w-5 h-5 ml-auto" /> : <ChevronRight className="w-5 h-5 ml-auto opacity-50 group-hover:opacity-100" />}
                                                </td>
                                            </tr>
                                            {expandedIssue === issue.id && (
                                                <tr className="bg-white/5 border-b border-white/5">
                                                    <td colSpan={6} className="p-0">
                                                        <div className="p-8 pl-12 bg-black/20 border-t border-white/5 shadow-inner">
                                                            <div className="max-w-5xl space-y-6">
                                                                <div>
                                                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Description</h4>
                                                                    <div className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap bg-white/5 p-4 rounded-lg border border-white/5 font-mono">
                                                                        {issue.description}
                                                                    </div>
                                                                </div>
                                                                {issue.impactDescription && (
                                                                    <div>
                                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">User Impact</h4>
                                                                        <p className="text-gray-300 leading-relaxed text-sm">{issue.impactDescription}</p>
                                                                    </div>
                                                                )}
                                                                <div className="pt-4 flex items-center gap-2">
                                                                    <a
                                                                        href={`https://admin.microsoft.com/Adminportal/Home#/servicehealth/:/alerts/${issue.id}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                                                                    >
                                                                        View in Microsoft 365 Admin Center <ArrowLeft className="w-3 h-3 rotate-180" />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/20">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">No Active Issues</h3>
                            <p className="text-gray-500 max-w-md mx-auto">
                                {selectedService === 'All'
                                    ? "All services are running normally. There are no active incidents or advisories at this time."
                                    : `Good news! There are no active incidents reported for ${selectedService}.`}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceHealthPage;
