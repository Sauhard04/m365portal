import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { motion } from 'framer-motion';
import { Settings, RefreshCw, Filter, Download, AlertCircle, CheckCircle2, XCircle, Loader2, Shield, Activity, AlertTriangle } from 'lucide-react';

const ServicePage = ({ serviceId: propServiceId }) => {
    const params = useParams();
    const serviceId = propServiceId || params.serviceId;
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();

    const [reportData, setReportData] = useState([]);
    const [exchangeData, setExchangeData] = useState([]);
    const [domainsCount, setDomainsCount] = useState(0);
    const [groupsCount, setGroupsCount] = useState(0);
    const [emailActivity, setEmailActivity] = useState({ sent: 0, received: 0, date: null });
    const [filterText, setFilterText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // New Features State
    const [secureScore, setSecureScore] = useState(null);
    const [serviceHealth, setServiceHealth] = useState([]);
    const [failedSignIns, setFailedSignIns] = useState([]);
    const [deviceSummary, setDeviceSummary] = useState({ total: 0, compliant: 0 });
    const [inactiveUsers, setInactiveUsers] = useState(0);
    const [appsCount, setAppsCount] = useState(0);
    const [auditLogs, setAuditLogs] = useState([]);
    const [caPolicies, setCaPolicies] = useState([]);
    const [globalAdmins, setGlobalAdmins] = useState([]);

    const serviceNames = {
        admin: 'Admin',
        entra: 'Microsoft Entra ID',
        intune: 'Microsoft Intune',
        purview: 'Microsoft Purview',
        licensing: 'Licensing & Billing'
    };

    const name = serviceNames[serviceId] || 'Service Module';
    const isAdmin = serviceId === 'admin';
    const isEntra = serviceId === 'entra';
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

                // Fetch Email Activity - Use User Detail for accurate sums
                graphService.getEmailActivityUserDetail('D7').then(activity => {
                    const sent = activity.reduce((acc, curr) => acc + (parseInt(curr.sendCount) || 0), 0);
                    const received = activity.reduce((acc, curr) => acc + (parseInt(curr.receiveCount) || 0), 0);
                    const latestDate = activity.length > 0 ? activity[0].reportRefreshDate : null;
                    setEmailActivity({ sent, received, date: latestDate });
                    console.log("Email Activity Data:", activity); // Debug log
                });

                // Fetch Domains Count
                graphService.getDomains().then(domains => {
                    setDomainsCount(domains.length);
                });

                // Fetch Groups Count
                graphService.getGroups().then(groups => {
                    setGroupsCount(groups.length);
                });

                // Process licensing users for the table

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
            } else if (isEntra) {
                const apps = await graphService.getApplications();
                setAppsCount(apps ? apps.length : 0);

                const groups = await graphService.getGroups();
                setGroupsCount(groups ? groups.length : 0);

                // Fetch Users for Count
                const usersData = await graphService.getExchangeMailboxReport();
                setExchangeData(usersData.reports || []);

                // Use domains count too
                const domains = await graphService.getDomains();
                setDomainsCount(domains ? domains.length : 0);

                // Fetch Advanced Entra Features
                const [audits, policies, admins] = await Promise.all([
                    graphService.getDirectoryAudits(),
                    graphService.getConditionalAccessPolicies(),
                    graphService.getGlobalAdmins()
                ]);

                if (audits?.value) setAuditLogs(audits.value);
                if (policies) setCaPolicies(policies);
                if (admins) setGlobalAdmins(admins);

            } else if (isEntra) {
                const apps = await graphService.getApplications();
                setAppsCount(apps ? apps.length : 0);
                const groups = await graphService.getGroups();
                setGroupsCount(groups ? groups.length : 0);

                // Fetch Users for Count and Table
                const usersData = await graphService.getExchangeMailboxReport();
                const uList = usersData.reports || [];
                setExchangeData(uList);
                setReportData(uList); // Populate main table with rich user data

                const domains = await graphService.getDomains();
                setDomainsCount(domains ? domains.length : 0);

                const [audits, policies, admins] = await Promise.all([
                    graphService.getDirectoryAudits(),
                    graphService.getConditionalAccessPolicies(),
                    graphService.getGlobalAdmins()
                ]);
                if (audits?.value) setAuditLogs(audits.value);
                if (policies) setCaPolicies(policies);
                if (admins) setGlobalAdmins(admins);

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
                setReportData([]);
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
            { label: 'Emails Sent (7d)', value: emailActivity.sent.toLocaleString(), trend: emailActivity.date ? `As of ${emailActivity.date}` : 'Activity*', color: 'text-purple-400' },
            { label: 'Emails Received (7d)', value: emailActivity.received.toLocaleString(), trend: emailActivity.date ? `As of ${emailActivity.date}` : 'Activity*', color: 'text-blue-400' },
            { label: 'Licenses Used', value: assignedSeats.toLocaleString(), trend: totalSeats > 0 ? Math.round((assignedSeats / totalSeats) * 100) + '%' : '0%', color: 'text-orange-400', path: '/service/admin/licenses' },
            { label: 'Groups', value: groupsCount.toString(), trend: 'Manage', path: '/service/admin/groups', color: 'text-indigo-400' },
            { label: 'Domains', value: domainsCount.toString(), trend: 'Manage', path: '/service/admin/domains', color: 'text-green-400' },
            /* Admin Extras */
            { label: 'Inactive Users', value: inactiveUsers.toString(), trend: '> 30 Days', color: 'text-red-400' },
            { label: 'Device Compliance', value: deviceSummary.total > 0 ? Math.round((deviceSummary.compliant / deviceSummary.total) * 100) + '%' : 'No Data', trend: `${deviceSummary.compliant}/${deviceSummary.total}`, color: 'text-teal-400' }
        ];
    } else if (isEntra) {
        stats = [
            { label: 'Total Users', value: exchangeData.length.toString(), trend: 'Manage', path: '/service/entra/users', color: 'text-blue-400' },
            { label: 'Groups', value: groupsCount.toString(), trend: 'Manage', path: '/service/entra/groups', color: 'text-indigo-400' },
            { label: 'Applications', value: appsCount.toString(), trend: 'Manage', path: '/service/entra/apps', color: 'text-cyan-400' },
            { label: 'Global Admins', value: globalAdmins.length.toString(), trend: 'Security', color: 'text-red-400' },
            { label: 'CA Policies', value: caPolicies.length.toString(), trend: `${caPolicies.filter(p => p.state === 'enabled').length} Active`, color: 'text-orange-400' }
        ];
    } else if (isLicensing) {
        // Calculate license stats
        const totalSeats = licensingSummary.reduce((acc, sku) => acc + (sku.prepaidUnits?.enabled || 0), 0);
        const assignedSeats = licensingSummary.reduce((acc, sku) => acc + (sku.consumedUnits || 0), 0);
        const availableSeats = totalSeats - assignedSeats;

        stats = [
            { label: 'Total Licenses', value: totalSeats.toLocaleString(), trend: 'Capacity' },
            { label: 'Assigned', value: assignedSeats.toLocaleString(), trend: Math.round((assignedSeats / totalSeats) * 100) + '% Used' },
            { label: 'Available', value: availableSeats.toLocaleString(), trend: 'Free', color: 'text-blue-400' }
        ];
    } else {
        stats = [];
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

    const handleDownloadExchangeReport = () => {
        if (exchangeData.length === 0) return;

        const headers = [
            'Display Name',
            'User Principal Name',
            'Job Title',
            'Department',
            'Office Location',
            'City',
            'Country',
            'Account Enabled',
            'Created Date',
            'Last Activity Date',
            'Item Count',
            'Deleted Item Count',
            'Mailbox Size Used',
            'Quota Used %',
            'Issue Warning Quota',
            'Prohibit Send Quota',
            'Prohibit Send/Receive Quota',
            'Archive Status',
            'Retention Policy',
            'Auto Expanding',
            'Migration Status'
        ];

        const csvRows = [headers.join(',')];

        exchangeData.forEach(row => {
            const values = [
                `"${row.displayName || ''}"`,
                `"${row.userPrincipalName || ''}"`,
                `"${row.jobTitle || ''}"`,
                `"${row.department || ''}"`,
                `"${row.officeLocation || ''}"`,
                `"${row.city || ''}"`,
                `"${row.country || ''}"`,
                `"${row.accountEnabled || ''}"`,
                `"${row.createdDateTime || ''}"`,
                `"${row.lastActivityDate || ''}"`,
                `"${row.itemCount || 0}"`,
                `"${row.deletedItemCount || 0}"`,
                `"${row.mailboxSize || ''}"`,
                `"${row.quotaUsedPct || ''}"`,
                `"${row.issueWarningQuota || ''}"`,
                `"${row.prohibitSendQuota || ''}"`,
                `"${row.prohibitSendReceiveQuota || ''}"`,
                row.archivePolicy ? 'Enabled' : 'Disabled',
                `"${row.retentionPolicy || ''}"`,
                `"${row.autoExpanding || ''}"`,
                `"${row.migrationStatus || ''}"`
            ];
            csvRows.push(values.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'full_exchange_report.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Header removed as it is now in ServiceLayout */}

            <div className="w-full">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-['Outfit'] bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent leading-tight mb-2">
                        {name}
                    </h1>
                    <p className="text-sm text-gray-400">Manage and monitor resources</p>
                </div>
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
                        <div
                            key={i}
                            onClick={stat.path ? () => navigate(stat.path) : undefined}
                            className={`glass p-6 ${stat.path ? 'cursor-pointer hover:bg-white/5 transition-all hover:scale-[1.02]' : ''}`}
                        >
                            <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                            <p className="text-3xl font-bold">{stat.value}</p>
                            <div className={`mt-4 flex items-center text-xs ${stat.color || 'text-green-400'}`}>
                                <span className="font-bold">{stat.trend}</span>
                                <span className="ml-2 text-gray-500 text-[10px] uppercase tracking-wider">Source: Microsoft Graph</span>
                            </div>
                        </div>
                    ))}
                </motion.div>

                <div className="text-xs text-gray-500 mb-8 -mt-8 text-right px-2 italic">
                    * Metrics reflect available reports (typically 24-48h delayed)
                </div>



                {(isLicensing) && licensingSummary.length > 0 && (
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

                {/* Advanced Admin Features */}
                {isAdmin && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                        {/* Secure Score */}
                        <div className="glass p-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-400" />
                                Secure Score
                            </h3>
                            {secureScore ? (
                                <div className="flex items-center gap-6">
                                    <div className="relative w-24 h-24 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                            <path
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="#333"
                                                strokeWidth="4"
                                            />
                                            <path
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="#3b82f6"
                                                strokeWidth="4"
                                                strokeDasharray={`${(secureScore.currentScore / secureScore.maxScore) * 100}, 100`}
                                            />
                                        </svg>
                                        <span className="absolute text-xl font-bold">{Math.round((secureScore.currentScore / secureScore.maxScore) * 100)}%</span>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold">{secureScore.currentScore} <span className="text-sm text-gray-500">/ {secureScore.maxScore}</span></div>
                                        <div className="text-gray-400 text-sm mt-1">Microsoft Benchmarked Security</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm flex flex-col gap-2">
                                    <p>Secure Score unavailable.</p>
                                    <span className="text-xs text-gray-600">Requires SecurityEvents.Read.All permission.</span>
                                </div>
                            )}
                        </div>

                        {/* Recent Failed Sign-ins */}
                        <div className="glass p-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                Recent Failed Logins
                            </h3>
                            <div className="space-y-3 max-h-[140px] overflow-y-auto custom-scrollbar">
                                {failedSignIns.length > 0 ? failedSignIns.map((log, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                        <div>
                                            <div className="text-white font-medium">{log.userPrincipalName}</div>
                                            <div className="text-xs text-gray-400">{log.location?.city}, {log.location?.countryOrRegion}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-red-400 text-xs">{log.status?.failureReason || 'Failed'}</div>
                                            <div className="text-gray-500 text-[10px]">{new Date(log.createdDateTime).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-gray-500 text-sm">No recent failed sign-ins found or access denied.</div>
                                )}
                            </div>
                        </div>

                        {/* Service Health */}
                        <div className="glass p-6 col-span-1 lg:col-span-2">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-green-400" />
                                Service Health Status
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {serviceHealth.length > 0 ? serviceHealth.slice(0, 8).map((s, i) => (
                                    <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5 flex flex-col">
                                        <span className="text-sm font-medium mb-1 truncate" title={s.service}>{s.service}</span>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${s.status === 'ServiceOperational' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                            <span className={`text-xs ${s.status === 'ServiceOperational' ? 'text-green-400' : 'text-yellow-400'}`}>
                                                {s.status === 'ServiceOperational' ? 'Operational' : s.status}
                                            </span>
                                        </div>
                                    </div>
                                )) : <div className="text-gray-500">Service health data unavailable (Requires ServiceHealth.Read.All).</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Entra Specific Dashboards */}
                {isEntra && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                        {/* Directory Audits */}
                        <div className="glass p-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-indigo-400" />
                                Recent Directory Audits
                            </h3>
                            <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                                {auditLogs.length > 0 ? auditLogs.map((log, i) => (
                                    <div key={i} className="text-sm p-3 bg-white/5 rounded-lg border border-white/5 flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-white">{log.activityDisplayName}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                by {log.initiatedBy?.user?.userPrincipalName || 'System'}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500">{new Date(log.activityDateTime).toLocaleTimeString()}</div>
                                            <div className={`text-[10px] uppercase font-bold mt-1 ${log.result === 'success' ? 'text-green-500' : 'text-red-500' // 'success' is typical value, check Graph docs. Actually usually 'success' or 'failure'.
                                                }`}>{log.result}</div>
                                        </div>
                                    </div>
                                )) : <div className="text-gray-500 text-sm">No audit logs available (Requires AuditLog.Read.All).</div>}
                            </div>
                        </div>

                        {/* Conditional Access */}
                        <div className="glass p-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-orange-400" />
                                Conditional Access Policies
                            </h3>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                {caPolicies.length > 0 ? caPolicies.map((policy, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-md transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${policy.state === 'enabled' ? 'bg-green-500' :
                                                policy.state === 'disabled' ? 'bg-red-500' : 'bg-yellow-500'
                                                }`} />
                                            <span className="text-sm text-gray-300">{policy.displayName}</span>
                                        </div>
                                        <span className="text-xs text-gray-500 capitalize">{policy.state}</span>
                                    </div>
                                )) : <div className="text-gray-500 text-sm">No policies found or access denied.</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Exchange Section for Admin */}
                {isAdmin && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">Exchange Mailboxes</h3>
                            <button
                                onClick={handleDownloadExchangeReport}
                                className="btn-primary !py-2 !px-5 !rounded-lg !text-sm flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download Full Report</span>
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

                {!isAdmin && (
                    <div className="glass p-8 relative min-h-[400px] flex items-center justify-center">
                        <div className="w-full">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold">{isAdmin ? 'User License Assignments' : isLicensing ? 'User License Assignments' : 'Latest Reports'}</h3>
                                <div className="flex items-center space-x-3">

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
                                                                        <span className="font-medium text-white/90">User Resource {typeof report === 'object' ? 'Unknown' : report}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-4">
                                                                    <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-md text-[10px] uppercase font-bold border border-green-500/20">
                                                                        Active
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 text-gray-400">Policy modification detected</td>
                                                                <td className="py-4 text-gray-500">{typeof report === 'object' ? '0' : report}h ago</td>
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
                    </div>
                )}
            </div>
        </div >
    );
};

export default ServicePage;
