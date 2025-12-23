import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { GraphService } from '../services/graphService';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Filter, Download, AlertCircle, CheckCircle2, XCircle, Loader2, Shield, Archive, Database, HelpCircle } from 'lucide-react';

const TableHeader = ({ label, tooltip, center = false }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <th
            className={`pb-4 font-semibold px-4 ${center ? 'text-center' : 'text-left'} relative group cursor-help`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`flex items-center space-x-1 ${center ? 'justify-center' : 'justify-start'}`}>
                <span>{label}</span>
                <HelpCircle className="w-3 h-3 text-white/20 group-hover:text-blue-400 transition-colors" />
            </div>
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl text-xs text-gray-200 font-medium normal-case text-center pointer-events-none"
                    >
                        {tooltip}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-800/95"></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </th>
    );
};

const ExchangeReport = () => {
    const navigate = useNavigate();
    const { instance, accounts } = useMsal();

    const [reportData, setReportData] = useState([]);
    const [filterText, setFilterText] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [isRunningMFA, setIsRunningMFA] = useState(false);
    const [isConcealed, setIsConcealed] = useState(false);

    const toggleUserSelection = (email) => {
        const newSelection = new Set(selectedUsers);
        if (newSelection.has(email)) {
            newSelection.delete(email);
        } else {
            newSelection.add(email);
        }
        setSelectedUsers(newSelection);
    };

    const toggleAllSelection = () => {
        if (selectedUsers.size === filteredData.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(filteredData.map(u => u.emailAddress)));
        }
    };

    const filteredData = reportData.filter(item => {
        if (!filterText) return true;
        const searchStr = filterText.toLowerCase();
        const name = item.displayName?.toLowerCase() || '';
        const email = item.emailAddress?.toLowerCase() || '';
        return name.includes(searchStr) || email.includes(searchStr);
    });

    const handleDownloadCSV = () => {
        if (filteredData.length === 0) return;

        const headers = ['Display Name', 'Email Address', 'Archive Policy', 'Retention Policy', 'Auto Expanding', 'Mailbox Size', 'Data Migrated', 'Migration Status'];
        const csvRows = [headers.join(',')];

        filteredData.forEach(row => {
            const values = [
                `"${row.displayName || ''}"`,
                `"${row.emailAddress || ''}"`,
                row.archivePolicy ? 'Enabled' : 'Disabled',
                `"${row.retentionPolicy || ''}"`,
                row.autoExpanding ? 'Yes' : 'No',
                `"${row.mailboxSize || ''}"`,
                `"${row.dataMigrated || ''}"`,
                `"${row.migrationStatus || ''}"`
            ];
            csvRows.push(values.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'mailbox_report.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRunMFA = async () => {
        if (selectedUsers.size === 0) return;

        const confirmResult = window.confirm(`Enforcing MFA for ${selectedUsers.size} users. Are you sure?`);
        if (!confirmResult) return;

        setIsRunningMFA(true);
        try {
            // Placeholder URL - User needs to update this in .env or code
            const functionUrl = import.meta.env.VITE_AZURE_MFA_FUNCTION_URL;

            if (!functionUrl) {
                alert("Azure Function URL is not configured. Please set VITE_AZURE_MFA_FUNCTION_URL in .env");
                console.log("Mock Run: Would send to Azure Function", Array.from(selectedUsers));
                return;
            }

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ users: Array.from(selectedUsers) })
            });

            if (response.ok) {
                alert("MFA Command sent successfully!");
                setSelectedUsers(new Set());
            } else {
                const text = await response.text();
                alert(`Error triggering command: ${text}`);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to call Azure Function.");
        } finally {
            setIsRunningMFA(false);
        }
    };

    const handleGenerateScript = (type) => {
        if (selectedUsers.size === 0) return;

        let scriptContent = `# Exchange Online Bulk Update Script\n# Generated by M365 Portal\n\n`;
        scriptContent += `Write-Host "Connecting to Exchange Online..."\n`;
        scriptContent += `if (-not (Get-Command Connect-ExchangeOnline -ErrorAction SilentlyContinue)) { Write-Error "Please install ExchangeOnlineManagement module."; exit }\n`;
        scriptContent += `try { Get-Mailbox -Identity "${Array.from(selectedUsers)[0]}" -ErrorAction SilentlyContinue } catch { Connect-ExchangeOnline }\n\n`;
        scriptContent += `$users = @(\n    "${Array.from(selectedUsers).join('",\n    "')}"\n)\n\n`;
        scriptContent += `foreach ($user in $users) {\n    Write-Host "Processing $user ..."\n`;

        switch (type) {
            case 'enable_archive':
                scriptContent += `    try { Enable-Mailbox -Identity $user -Archive -ErrorAction Stop; Write-Host " - Archive Enabled" -ForegroundColor Green } catch { Write-Warning " - Failed: $_" }\n`;
                break;
            case 'disable_archive':
                scriptContent += `    try { Disable-Mailbox -Identity $user -Archive -Confirm:$false -ErrorAction Stop; Write-Host " - Archive Disabled" -ForegroundColor Yellow } catch { Write-Warning " - Failed: $_" }\n`;
                break;
            case 'enable_autoexpand':
                scriptContent += `    try { Set-Mailbox -Identity $user -AutoExpandingArchive $true -ErrorAction Stop; Write-Host " - Auto-Expand Enabled" -ForegroundColor Green } catch { Write-Warning " - Failed: $_" }\n`;
                break;
            case 'disable_autoexpand':
                scriptContent += `    try { Set-Mailbox -Identity $user -AutoExpandingArchive $false -ErrorAction Stop; Write-Host " - Auto-Expand Disabled" -ForegroundColor Yellow } catch { Write-Warning " - Failed: $_" }\n`;
                break;
        }

        scriptContent += `}\n\nWrite-Host "Done." -ForegroundColor Cyan\nRead-Host "Press Enter to exit"`;

        const blob = new Blob([scriptContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bulk_${type}_${selectedUsers.size}_users.ps1`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
            const { reports, isConcealed: concealedFlag } = await graphService.getExchangeMailboxReport();
            setReportData(reports);
            setIsConcealed(concealedFlag);
        } catch (err) {
            console.error("Data Fetch Error:", err);
            setError("Failed to fetch real-time data from Microsoft Graph. Please check permissions.");
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (accounts.length > 0) {
            fetchData();
        }
    }, [instance, accounts]);

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <header className="glass fixed top-0 left-0 right-0 z-50 h-20 rounded-none border-x-0 border-t-0 bg-black/50 backdrop-blur-2xl px-8 shadow-lg border-b border-white/10 flex items-center">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/service/admin')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </motion.button>
                        <div>
                            <h1 className="text-xl font-bold font-['Outfit'] bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent leading-tight">
                                Exchange Mailbox Report
                            </h1>
                            <p className="text-xs text-gray-400 leading-tight">Real-time mailbox analytics</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={fetchData}
                            className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all text-sm font-semibold"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </motion.button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8 pt-24">
                <AnimatePresence>
                    {isConcealed && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="mb-8 glass p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-2xl flex items-start space-x-4 shadow-lg"
                        >
                            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 flex-shrink-0">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-amber-200 font-bold mb-2 text-lg">M365 Privacy Settings Detected</h4>
                                <p className="text-amber-200/80 text-sm leading-relaxed mb-4">
                                    Microsoft is concealing user identity in report telemetry. This prevents the portal from matching usage data (Mailbox Size, Archive Status) to specific users.
                                </p>
                                <div className="space-y-2 text-xs glass-panel p-4 rounded-xl">
                                    <p className="font-bold text-amber-100 uppercase tracking-widest mb-2">To Fix This:</p>
                                    <ol className="list-decimal list-inside space-y-2 text-amber-100/70">
                                        <li>Open <b className="text-amber-100">M365 Admin Center</b> &gt; <b className="text-amber-100">Settings</b> &gt; <b className="text-amber-100">Org Settings</b>.</li>
                                        <li>Select <b className="text-amber-100">Reports</b>.</li>
                                        <li>Uncheck <b className="text-amber-100">"Display concealed user, group, and site names in all reports"</b>.</li>
                                        <li>Click <b className="text-amber-100">Save</b> and refresh this page.</li>
                                    </ol>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="mb-8 glass p-5 bg-gradient-to-r from-red-500/10 to-pink-500/5 border border-red-500/30 rounded-xl flex items-center space-x-4 text-red-400 shadow-lg"
                        >
                            <AlertCircle className="w-6 h-6 flex-shrink-0" />
                            <span className="font-medium">{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass p-8 shadow-2xl"
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h3 className="text-2xl font-bold mb-1 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                                Mailbox Report
                            </h3>
                            <p className="text-sm text-gray-400">Real-time telemetry from Microsoft Graph</p>
                        </div>
                        <div className="flex items-center space-x-3 flex-wrap">
                            <div className="relative">
                                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search mailboxes..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all w-full md:w-64"
                                />
                            </div>
                            <motion.button
                                whileHover={selectedUsers.size > 0 && !isRunningMFA ? { scale: 1.05 } : {}}
                                whileTap={selectedUsers.size > 0 && !isRunningMFA ? { scale: 0.95 } : {}}
                                onClick={handleRunMFA}
                                disabled={selectedUsers.size === 0 || isRunningMFA}
                                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl border transition-all text-sm font-semibold backdrop-blur-sm ${selectedUsers.size > 0 && !isRunningMFA
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 border-blue-400/50 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                <Shield className={`w-4 h-4 ${isRunningMFA ? 'animate-pulse' : ''}`} />
                                <span>{isRunningMFA ? 'Running...' : 'Run MFA'}</span>
                            </motion.button>

                            <AnimatePresence>
                                {selectedUsers.size > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="flex items-center space-x-2 border-l border-white/10 pl-4 ml-2"
                                    >
                                        <div className="flex flex-col space-y-1.5">
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleGenerateScript('enable_archive')}
                                                className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs rounded-lg border border-green-500/30 flex items-center space-x-1.5 font-semibold transition-all shadow-sm"
                                            >
                                                <Archive className="w-3.5 h-3.5" /> <span>Enable Archive</span>
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleGenerateScript('disable_archive')}
                                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg border border-red-500/30 flex items-center space-x-1.5 font-semibold transition-all shadow-sm"
                                            >
                                                <Archive className="w-3.5 h-3.5" /> <span>Disable Archive</span>
                                            </motion.button>
                                        </div>
                                        <div className="flex flex-col space-y-1.5">
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleGenerateScript('enable_autoexpand')}
                                                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs rounded-lg border border-blue-500/30 flex items-center space-x-1.5 font-semibold transition-all shadow-sm"
                                            >
                                                <Database className="w-3.5 h-3.5" /> <span>Enable Auto-Exp</span>
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleGenerateScript('disable_autoexpand')}
                                                className="px-3 py-1.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 text-xs rounded-lg border border-gray-500/30 flex items-center space-x-1.5 font-semibold transition-all shadow-sm"
                                            >
                                                <Database className="w-3.5 h-3.5" /> <span>Disable Auto-Exp</span>
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleDownloadCSV}
c                                className="p-2.5 hover:bg-white/10 rounded-xl border border-white/10 transition-all backdrop-blur-sm"
                                title="Download CSV"
                            >
                                <Download className="w-5 h-5" />
                            </motion.button>
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[300px] rounded-xl">
                        {loading ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-24 space-y-6"
                            >
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    <Loader2 className="w-16 h-16 text-blue-500" />
                                </motion.div>
                                <div className="text-center">
                                    <p className="text-gray-300 font-semibold mb-1">Fetching Real-time Telemetry</p>
                                    <p className="text-gray-500 text-sm">Connecting to Microsoft Graph API...</p>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
                                <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
                                    <table className="w-full text-left">
                                        <thead className="sticky top-0 z-30 bg-white/5 backdrop-blur-xl border-b border-white/10">
                                            <tr>
                                            <th className="py-4 px-6 font-bold text-xs text-gray-400 uppercase tracking-wider w-12">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredData.length > 0 && selectedUsers.size === filteredData.length}
                                                    onChange={toggleAllSelection}
                                                    className="w-4 h-4 rounded border-gray-600 bg-transparent text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                                                />
                                            </th>
                                            <th className="py-4 px-6 font-bold text-xs text-gray-400 uppercase tracking-wider">Display Name</th>
                                            <th className="py-4 px-6 font-bold text-xs text-gray-400 uppercase tracking-wider">Email Address</th>
                                            <th className="py-4 px-6 font-bold text-xs text-gray-400 uppercase tracking-wider">Mailbox Size</th>
                                            <th className="py-4 px-6 font-bold text-xs text-gray-400 uppercase tracking-wider">Data Migrated</th>
                                            <th className="py-4 px-6 font-bold text-xs text-gray-400 uppercase tracking-wider">Migration Status</th>
                                            <th className="py-4 px-6 font-bold text-xs text-gray-400 uppercase tracking-wider text-center">Archive Policy</th>
                                            <th className="py-4 px-6 font-bold text-xs text-gray-400 uppercase tracking-wider">Retention Policy</th>
                                            <th className="py-4 px-6 font-bold text-xs text-gray-400 uppercase tracking-wider text-center">Auto Expanding</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredData.length > 0 ? filteredData.map((report, i) => (
                                            <motion.tr
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                                className="hover:bg-white/5 transition-all group"
                                            >
                                                <td className="py-5 px-6">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUsers.has(report.emailAddress)}
                                                        onChange={() => toggleUserSelection(report.emailAddress)}
                                                        className="w-4 h-4 rounded border-gray-600 bg-transparent text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="py-5 px-6 font-semibold text-white group-hover:text-blue-400 transition-colors">{report.displayName}</td>
                                                <td className="py-5 px-6 text-gray-400 font-mono text-sm">{report.emailAddress}</td>
                                                <td className="py-5 px-6 text-gray-300 font-mono text-sm">{report.mailboxSize}</td>
                                                <td className="py-5 px-6 text-gray-300 font-mono text-sm">{report.dataMigrated}</td>
                                                <td className="py-5 px-6">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${
                                                        report.migrationStatus === 'Migrated'
                                                            ? 'text-purple-400 bg-purple-400/10 border-purple-400/30 shadow-sm'
                                                            : 'text-blue-400 bg-blue-400/10 border-blue-400/30 shadow-sm'
                                                    }`}>
                                                        {report.migrationStatus}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-6 text-center">
                                                    {report.archivePolicy ? (
                                                        <span className="inline-flex items-center space-x-1.5 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-lg text-xs font-bold border border-green-400/30 shadow-sm">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> <span>ENABLED</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center space-x-1.5 text-gray-500 bg-gray-500/10 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-500/30 shadow-sm">
                                                            <XCircle className="w-3.5 h-3.5" /> <span>DISABLED</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-5 px-6 text-gray-400 italic text-sm">{report.retentionPolicy || '-'}</td>
                                                <td className="py-5 px-6 text-center">
                                                    <span className="text-gray-500 bg-gray-500/10 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-500/30 shadow-sm">N/A*</span>
                                                </td>
                                            </motion.tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="9" className="py-20 text-center">
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="flex flex-col items-center space-y-4"
                                                    >
                                                        <AlertCircle className="w-16 h-16 text-gray-600" />
                                                        <div>
                                                            <p className="text-gray-400 font-semibold mb-1">No matching data found</p>
                                                            <p className="text-gray-500 text-sm">Try adjusting your search filters</p>
                                                        </div>
                                                    </motion.div>
                                                </td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default ExchangeReport;
