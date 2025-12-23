import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, RefreshCw, Filter, Download, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const ServicePage = () => {
    const { serviceId } = useParams();
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();

    const [reportData, setReportData] = useState([]);
    const [exchangeData, setExchangeData] = useState([]);
    const [filterText, setFilterText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const serviceNames = {
        admin: 'Admin',
        entra: 'Microsoft Entra ID',
        intune: 'Microsoft Intune',
        purview: 'Microsoft Purview',
        licensing: 'Licensing & Billing'
    };

    const name = serviceNames[serviceId] || 'Service Module';
    const isAdmin = serviceId === 'admin';
    const isLicensing = serviceId === 'licensing';

    const [licensingSummary, setLicensingSummary] = useState([]);

    const filteredData = reportData.filter(item => {
        if (!filterText) return true;
        const searchStr = filterText.toLowerCase();
        const name = item.displayName?.toLowerCase() || '';
        const email = item.emailAddress?.toLowerCase() || '';
        const raw = String(item).toLowerCase();
        return name.includes(searchStr) || email.includes(searchStr) || raw.includes(searchStr);
    });

    const filteredExchangeData = exchangeData.filter(item => {
        if (!filterText) return true;
        const searchStr = filterText.toLowerCase();
        const name = item.displayName?.toLowerCase() || '';
        const email = item.emailAddress?.toLowerCase() || '';
        return name.includes(searchStr) || email.includes(searchStr);
    });

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (accounts.length === 0) return;

            const response = await instance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0]
            });

            const graphService = new GraphService(response.accessToken);

            if (isAdmin) {
                // Fetch both Exchange and Licensing data
                const [exchangeResult, licensingResult] = await Promise.all([
                    graphService.getExchangeMailboxReport().catch(() => ({ reports: [] })),
                    graphService.getLicensingData().catch(() => ({ skus: [], users: [] }))
                ]);
                
                setExchangeData(exchangeResult.reports || []);
                
                const { skus, users } = licensingResult;
                setLicensingSummary(skus || []);
                
                // Process licensing users for the table
                const skuMap = new Map();
                (skus || []).forEach(sku => skuMap.set(sku.skuId, sku.skuPartNumber));
                
                const processedUsers = (users || []).map(user => ({
                    displayName: user.displayName,
                    emailAddress: user.userPrincipalName,
                    licenses: user.assignedLicenses.map(l => skuMap.get(l.skuId) || 'Unknown SKU').join(', ') || 'No License',
                    licenseCount: user.assignedLicenses.length
                }));
                setReportData(processedUsers);
            } else if (isLicensing) {
                const { skus, users } = await graphService.getLicensingData();
                setLicensingSummary(skus);

                // create a map of SKU Id to SKU Part Number for easy lookup
                const skuMap = new Map();
                skus.forEach(sku => skuMap.set(sku.skuId, sku.skuPartNumber));

                // Process users for the table
                const processedUsers = users.map(user => ({
                    displayName: user.displayName,
                    emailAddress: user.userPrincipalName,
                    licenses: user.assignedLicenses.map(l => skuMap.get(l.skuId) || 'Unknown SKU').join(', ') || 'No License',
                    licenseCount: user.assignedLicenses.length
                }));
                setReportData(processedUsers);
            } else {
                // Placeholder for other modules
                setReportData([1, 2, 3, 4, 5]);
            }
        } catch (err) {
            console.error("Data Fetch Error:", err);
            setError("Failed to fetch real-time data from Microsoft Graph. Please check permissions.");
            // Fallback to empty if real fetch fails
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (accounts.length > 0) {
            fetchData();
        }
    }, [serviceId, instance, accounts]);

    let stats = [];
    if (isAdmin) {
        // Combined stats for Admin page
        const totalSeats = licensingSummary.reduce((acc, sku) => acc + (sku.prepaidUnits?.enabled || 0), 0);
        const assignedSeats = licensingSummary.reduce((acc, sku) => acc + (sku.consumedUnits || 0), 0);
        stats = [
            { label: 'Total Mailboxes', value: exchangeData.length.toString(), trend: 'Real-time' },
            { label: 'Total Licenses', value: totalSeats.toLocaleString(), trend: 'Capacity' },
            { label: 'Licenses Used', value: assignedSeats.toLocaleString(), trend: totalSeats > 0 ? Math.round((assignedSeats / totalSeats) * 100) + '%' : '0%', color: 'text-blue-400' }
        ];
    } else if (isLicensing) {
        // Calculate license stats
        const totalSeats = licensingSummary.reduce((acc, sku) => acc + sku.prepaidUnits.enabled, 0);
        const assignedSeats = licensingSummary.reduce((acc, sku) => acc + sku.consumedUnits, 0);
        const availableSeats = totalSeats - assignedSeats;

        stats = [
            { label: 'Total Licenses', value: totalSeats.toLocaleString(), trend: 'Capacity' },
            { label: 'Assigned', value: assignedSeats.toLocaleString(), trend: Math.round((assignedSeats / totalSeats) * 100) + '% Used' },
            { label: 'Available', value: availableSeats.toLocaleString(), trend: 'Free', color: 'text-blue-400' }
        ];
    } else {
        stats = [
            { label: 'Total Resources', value: '1,242', trend: '+12%' },
            { label: 'Active Sessions', value: '842', trend: '+5%' },
            { label: 'Security Alerts', value: '3', trend: '-2%', color: 'text-red-400' }
        ];
    }

    const handleDownloadCSV = () => {
        if (filteredData.length === 0) return;

        let headers = [];
        let csvRows = [];

        if (isLicensing) {
            headers = ['Display Name', 'Email / UPN', 'Assigned Licenses', 'Count'];
            csvRows.push(headers.join(','));

            filteredData.forEach(row => {
                const values = [
                    `"${row.displayName || ''}"`,
                    `"${row.emailAddress || ''}"`,
                    `"${row.licenses || ''}"`,
                    `"${row.licenseCount || 0}"`
                ];
                csvRows.push(values.join(','));
            });
        } else {
            // Generic Fallback
            headers = ['User / Resource', 'Status', 'Activity', 'Time'];
            csvRows.push(headers.join(','));

            filteredData.forEach(row => {
                const values = [
                    `"User Resource ${row}"`,
                    '"Active"',
                    '"Policy modification detected"',
                    `"${row}h ago"`
                ];
                csvRows.push(values.join(','));
            });
        }

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${serviceId}_report.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <header className="glass fixed top-0 left-0 right-0 z-50 h-20 rounded-none border-x-0 border-t-0 bg-black/50 backdrop-blur-2xl px-8 shadow-lg border-b border-white/10 flex items-center">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold font-['Outfit'] bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent leading-tight">
                                {name}
                            </h1>
                            <p className="text-xs text-gray-400 leading-tight">Manage and monitor resources</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8 pt-24">
                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400">
                        <AlertCircle className="w-6 h-6" />
                        <span>{error}</span>
                    </div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
                >
                    {stats.map((stat, i) => (
                        <div key={i} className="glass p-6">
                            <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                            <p className="text-3xl font-bold">{stat.value}</p>
                            <div className={`mt-4 flex items-center text-xs ${stat.color || 'text-green-400'}`}>
                                <span className="font-bold">{stat.trend}</span>
                                <span className="ml-2 text-gray-500 text-[10px] uppercase tracking-wider">Source: Microsoft Graph</span>
                            </div>
                        </div>
                    ))}
                </motion.div>



                {(isLicensing || isAdmin) && licensingSummary.length > 0 && (
                    <div className="mb-12">
                        <h3 className="text-xl font-bold mb-6">License Breakdown</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {licensingSummary.map((sku, i) => (
                                <div key={i} className="glass p-6 border-l-4 border-l-blue-500">
                                    <p className="text-gray-300 font-medium mb-1 truncate" title={sku.skuPartNumber}>{sku.skuPartNumber}</p>
                                    <div className="flex justify-between items-end mt-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Assigned</p>
                                            <p className="text-2xl font-bold">{sku.consumedUnits}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500">Total</p>
                                            <p className="text-2xl font-bold">{sku.prepaidUnits?.enabled || 0}</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-700/50 h-1.5 mt-4 rounded-full overflow-hidden">
                                        <div
                                            className="bg-blue-500 h-full rounded-full"
                                            style={{ width: `${Math.min(((sku.consumedUnits / (sku.prepaidUnits?.enabled || 1)) * 100), 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-right mt-1 text-gray-500">
                                        {Math.round((sku.consumedUnits / (sku.prepaidUnits?.enabled || 1)) * 100)}% Used
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Exchange Section for Admin */}
                {isAdmin && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">Exchange Mailboxes</h3>
                            <button
                                onClick={() => navigate('/service/admin/report')}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all text-sm"
                            >
                                View Full Report
                            </button>
                        </div>
                        {loading ? (
                            <div className="glass p-8 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            </div>
                        ) : exchangeData.length > 0 ? (
                            <div className="glass p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <p className="text-sm text-gray-400 mb-1">Total Mailboxes</p>
                                        <p className="text-2xl font-bold">{exchangeData.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400 mb-1">Archive Enabled</p>
                                        <p className="text-2xl font-bold">{exchangeData.filter(r => r.archivePolicy).length}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400 mb-1">Auto-Expanding</p>
                                        <p className="text-2xl font-bold">{exchangeData.filter(r => r.autoExpanding).length}</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-white/10">
                                            <tr className="text-gray-400 uppercase tracking-wider text-xs">
                                                <th className="pb-3 px-4 font-semibold">Display Name</th>
                                                <th className="pb-3 px-4 font-semibold">Email</th>
                                                <th className="pb-3 px-4 font-semibold text-center">Archive</th>
                                                <th className="pb-3 px-4 font-semibold">Size</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredExchangeData.slice(0, 5).map((mailbox, i) => (
                                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                                    <td className="py-3 px-4 font-medium">{mailbox.displayName}</td>
                                                    <td className="py-3 px-4 text-gray-400 text-xs">{mailbox.emailAddress}</td>
                                                    <td className="py-3 px-4 text-center">
                                                        {mailbox.archivePolicy ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-400/10 text-green-400 border border-green-400/30">
                                                                Enabled
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-gray-500/10 text-gray-500 border border-gray-500/30">
                                                                Disabled
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-300 text-xs">{mailbox.mailboxSize || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {exchangeData.length > 5 && (
                                        <div className="mt-4 text-center">
                                            <button
                                                onClick={() => navigate('/service/admin/report')}
                                                className="text-sm text-blue-400 hover:text-blue-300"
                                            >
                                                View all {exchangeData.length} mailboxes →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="glass p-8 text-center text-gray-400">
                                <p>No exchange data available</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="glass p-8 relative min-h-[400px] flex items-center justify-center">
                    <div className="w-full">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold">{isAdmin ? 'User License Assignments' : isLicensing ? 'User License Assignments' : 'Latest Reports'}</h3>
                                <div className="flex items-center space-x-3">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search here"
                                            value={filterText}
                                            onChange={(e) => setFilterText(e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-blue-500/50"
                                        />
                                    </div>
                                    <button
                                        onClick={handleDownloadCSV}
                                        className="p-2 hover:bg-white/10 rounded-lg border border-white/10"
                                        title="Download CSV"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto min-h-[300px] max-h-[calc(100vh-500px)]">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                        <p className="text-gray-400 animate-pulse">Fetching Real-time Telemetry...</p>
                                    </div>
                                ) : (
                                    <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
                                        <table className="w-full text-left">
                                            <thead className="sticky top-0 z-20 bg-white/5 backdrop-blur-xl border-b border-white/10">
                                                <tr className="text-gray-400 text-sm uppercase tracking-wider">
                                                {(isLicensing || isAdmin) ? (
                                                    <>
                                                        <th className="pb-4 font-semibold px-4">Display Name</th>
                                                        <th className="pb-4 font-semibold px-4">Email / UPN</th>
                                                        <th className="pb-4 font-semibold px-4">Assigned Licenses</th>
                                                        <th className="pb-4 font-semibold px-4 text-center">Count</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th className="pb-4 font-semibold">User / Resource</th>
                                                        <th className="pb-4 font-semibold">Status</th>
                                                        <th className="pb-4 font-semibold">Activity</th>
                                                        <th className="pb-4 font-semibold">Time</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-sm">
                                            {filteredData.length > 0 ? filteredData.map((report, i) => (
                                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                                    {(isLicensing || isAdmin) ? (
                                                        <>
                                                            <td className="py-4 px-4 font-medium text-white/90">{report.displayName}</td>
                                                            <td className="py-4 px-4 text-gray-400">{report.emailAddress}</td>
                                                            <td className="py-4 px-4 text-gray-300">
                                                                {report.licenses !== 'No License' ? (
                                                                    <span className="text-gray-300 text-sm">
                                                                        {report.licenses}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-500 italic">Unlicensed</span>
                                                                )}
                                                            </td>
                                                            <td className="py-4 px-4 text-center text-gray-400">{report.licenseCount}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="py-4">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px]">
                                                                        UR
                                                                    </div>
                                                                    <span className="font-medium text-white/90">User Resource {report}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-4">
                                                                <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-md text-[10px] uppercase font-bold border border-green-500/20">
                                                                    Active
                                                                </span>
                                                            </td>
                                                            <td className="py-4 text-gray-400">Policy modification detected</td>
                                                            <td className="py-4 text-gray-500">{report}h ago</td>
                                                        </>
                                                    )}
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={isLicensing ? "4" : "4"} className="py-20 text-center">
                                                        <div className="flex flex-col items-center space-y-4">
                                                            <AlertCircle className="w-12 h-12 text-gray-600" />
                                                            <div className="text-gray-500 italic">No real-time data found. Ensure Graph API permissions are granted.</div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div >
    );
};

export default ServicePage;
