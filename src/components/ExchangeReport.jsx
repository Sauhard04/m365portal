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
            const response = await instance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0]
            });

            const graphService = new GraphService(response.accessToken);
            const data = await graphService.getExchangeMailboxReport();
            setReportData(data);
        } catch (err) {
            console.error("Data Fetch Error:", err);
            setError("Failed to fetch real-time data from Microsoft Graph. Please check permissions.");
            setReportData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [instance, accounts]);

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <header className="glass sticky top-0 z-40 rounded-none border-x-0 border-t-0 bg-black/40 backdrop-blur-xl px-8 py-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <button
                            onClick={() => navigate('/service/exchange')}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-2xl font-bold font-['Outfit']">Exchange Mailbox Report</h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={fetchData}
                            className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all text-sm font-medium"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8">
                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-400">
                        <AlertCircle className="w-6 h-6" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="glass p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold">
                            Mailbox Report (Real-time)
                        </h3>
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
                                onClick={handleRunMFA}
                                disabled={selectedUsers.size === 0 || isRunningMFA}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium ${selectedUsers.size > 0 && !isRunningMFA
                                    ? 'bg-blue-600 border-blue-500 hover:bg-blue-500 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                <Shield className={`w-4 h-4 ${isRunningMFA ? 'animate-pulse' : ''}`} />
                                <span>{isRunningMFA ? 'Running...' : 'Run MFA'}</span>
                            </button>

                            {selectedUsers.size > 0 && (
                                <div className="flex items-center space-x-2 border-l border-white/10 pl-4 ml-2">
                                    <div className="flex flex-col space-y-1">
                                        <button
                                            onClick={() => handleGenerateScript('enable_archive')}
                                            className="px-3 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs rounded border border-green-500/20 flex items-center space-x-1"
                                        >
                                            <Archive className="w-3 h-3" /> <span>Enable Archive</span>
                                        </button>
                                        <button
                                            onClick={() => handleGenerateScript('disable_archive')}
                                            className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded border border-red-500/20 flex items-center space-x-1"
                                        >
                                            <Archive className="w-3 h-3" /> <span>Disable Archive</span>
                                        </button>
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <button
                                            onClick={() => handleGenerateScript('enable_autoexpand')}
                                            className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/20 flex items-center space-x-1"
                                        >
                                            <Database className="w-3 h-3" /> <span>Enable Auto-Exp</span>
                                        </button>
                                        <button
                                            onClick={() => handleGenerateScript('disable_autoexpand')}
                                            className="px-3 py-1 bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 text-xs rounded border border-gray-500/20 flex items-center space-x-1"
                                        >
                                            <Database className="w-3 h-3" /> <span>Disable Auto-Exp</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleDownloadCSV}
                                className="p-2 hover:bg-white/10 rounded-lg border border-white/10"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                <p className="text-gray-400 animate-pulse">Fetching Real-time Telemetry...</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/10 text-gray-400 text-sm uppercase tracking-wider">
                                        <th className="pb-4 font-semibold px-4 w-12">
                                            <input
                                                type="checkbox"
                                                checked={filteredData.length > 0 && selectedUsers.size === filteredData.length}
                                                onChange={toggleAllSelection}
                                                className="rounded border-gray-600 bg-transparent text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                                            />
                                        </th>
                                        <th className="pb-4 font-semibold px-4">Display Name</th>
                                        <th className="pb-4 font-semibold px-4">Email Address</th>
                                        <th className="pb-4 font-semibold px-4">Mailbox Size</th>
                                        <th className="pb-4 font-semibold px-4">Data Migrated</th>
                                        <th className="pb-4 font-semibold px-4">Migration Status</th>
                                        <th className="pb-4 font-semibold px-4 text-center">Archive Policy</th>
                                        <th className="pb-4 font-semibold px-4">Retention Policy</th>
                                        <th className="pb-4 font-semibold px-4 text-center">Auto Expanding</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {filteredData.length > 0 ? filteredData.map((report, i) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-4 font-medium text-white/90">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.has(report.emailAddress)}
                                                    onChange={() => toggleUserSelection(report.emailAddress)}
                                                    className="rounded border-gray-600 bg-transparent text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                                                />
                                            </td>
                                            <td className="py-4 px-4 font-medium text-white/90">{report.displayName}</td>
                                            <td className="py-4 px-4 text-gray-400">{report.emailAddress}</td>
                                            <td className="py-4 px-4 text-gray-300">{report.mailboxSize}</td>
                                            <td className="py-4 px-4 text-gray-300">{report.dataMigrated}</td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${report.migrationStatus === 'Migrated'
                                                    ? 'text-purple-400 bg-purple-400/10 border-purple-400/20'
                                                    : 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                                                    }`}>
                                                    {report.migrationStatus}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {report.archivePolicy ?
                                                    <span className="inline-flex items-center space-x-1 text-green-400 bg-green-400/10 px-2 py-1 rounded-md text-[10px] font-bold border border-green-400/20">
                                                        <CheckCircle2 className="w-3 h-3" /> <span>ENABLED</span>
                                                    </span> :
                                                    <span className="inline-flex items-center space-x-1 text-gray-500 bg-gray-500/10 px-2 py-1 rounded-md text-[10px] font-bold border border-gray-500/20">
                                                        <XCircle className="w-3 h-3" /> <span>DISABLED</span>
                                                    </span>
                                                }
                                            </td>
                                            <td className="py-4 px-4 text-gray-300 italic">{report.retentionPolicy}</td>
                                            <td className="py-4 px-4 text-center">
                                                {report.autoExpanding ?
                                                    <span className="text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md text-[10px] font-bold border border-blue-400/20">YES</span> :
                                                    <span className="text-gray-500 bg-gray-500/10 px-2 py-1 rounded-md text-[10px] font-bold border border-gray-500/20">NO</span>
                                                }
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="py-20 text-center">
                                                <div className="flex flex-col items-center space-y-4">
                                                    <AlertCircle className="w-12 h-12 text-gray-600" />
                                                    <div className="text-gray-500 italic">No matching data found.</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ExchangeReport;
