import React, { useState, useEffect } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import { getExchangeReport, getMigrationStatus } from "../services/graphService";
import Card3D from "../components/Card3D";
import { Download, RefreshCw, ArrowLeft, Users, Database, CheckCircle, Clock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ExchangeReport = () => {
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [reportData, setReportData] = useState(null);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const getAuthProvider = () => {
        console.log("getAuthProvider called");
        return async (callback) => {
            console.log("authProvider callback triggered");
            try {
                const account = accounts[0];
                if (!account) {
                    console.warn("No active account found in MSAL");
                    throw new Error("No active account found. Please log in again.");
                }
                console.log("Acquiring token silently for account:", account.username);
                const response = await instance.acquireTokenSilent({
                    ...loginRequest,
                    account: account,
                });
                console.log("Token acquired successfully");
                callback(null, response.accessToken);
            } catch (err) {
                console.error("Auth provider error:", err);
                callback(err, null);
            }
        };
    };

    const handleGenerateReport = async () => {
        console.log("handleGenerateReport called, loading state:", loading);
        if (loading) return; // Prevent multiple clicks

        console.log("Generate Report clicked");
        setLoading(true);
        setProgress(10);
        setError(null);
        setReportData(null);
        setSummary(null);

        try {
            const authProvider = getAuthProvider();
            console.log("Fetching report from Graph...");
            const csvData = await getExchangeReport(authProvider);
            console.log("Report data received, length:", csvData?.length);

            if (!csvData || csvData.length < 10) {
                throw new Error("The report data is empty or too short. Please try again in a few minutes as Microsoft reports can take time to generate.");
            }

            setProgress(40);

            // Parse CSV to JSON
            // Handle BOM and different line endings
            const cleanCsv = csvData.replace(/^\uFEFF/, '');
            const lines = cleanCsv.split(/\r?\n/).filter(line => line.trim() !== '');

            if (lines.length < 2) {
                throw new Error("The report contains headers but no data rows.");
            }

            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
            console.log("Headers detected:", headers);

            const rawData = lines.slice(1).map(line => {
                const values = line.split(',');
                let obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index]?.replace(/"/g, '').trim();
                });
                return obj;
            });

            console.log("Parsed raw data rows:", rawData.length);
            setProgress(60);

            // Enhance data with migration status
            // Limit to first 20 for faster processing and better UX
            const dataToProcess = rawData.slice(0, 20);
            console.log("Enhancing first 20 rows with migration status...");

            const enhancedData = await Promise.all(dataToProcess.map(async (item, index) => {
                try {
                    const migration = await getMigrationStatus(authProvider, item['User Principal Name']);
                    setProgress(prev => Math.min(prev + (40 / dataToProcess.length), 95));
                    return {
                        ...item,
                        'Migration Status': migration.status,
                        'Data Migrated': migration.dataMigrated,
                        'Data Synced': migration.dataSynced
                    };
                } catch (migErr) {
                    console.warn("Failed to get migration status for", item['User Principal Name'], migErr);
                    return {
                        ...item,
                        'Migration Status': 'Unknown',
                        'Data Migrated': 'N/A',
                        'Data Synced': 'N/A'
                    };
                }
            }));

            setReportData(enhancedData);

            // Calculate Summary
            const totalMailboxes = rawData.length;
            const completedMigrations = enhancedData.filter(d => d['Migration Status'] === 'Completed').length;
            const totalStorage = rawData.reduce((acc, curr) => {
                const size = parseFloat(curr['Storage Used (Byte)'] || 0) / (1024 * 1024 * 1024); // GB
                return acc + size;
            }, 0).toFixed(2);

            setSummary({
                totalMailboxes,
                completedMigrations,
                totalStorage
            });

            setProgress(100);
            console.log("Report generation complete");
        } catch (err) {
            console.error("Error in handleGenerateReport:", err);
            setError(err.message || "Failed to fetch report. Ensure you have the correct permissions (Reports.Read.All).");
        } finally {
            setLoading(false);
            setProgress(0);
        }
    };

    const downloadCSV = () => {
        try {
            if (!reportData || reportData.length === 0) {
                console.warn("No report data to export");
                return;
            }

            console.log("Starting CSV export for", reportData.length, "rows");
            const headers = Object.keys(reportData[0]);
            const csvContent = [
                headers.join(','),
                ...reportData.map(row => headers.map(header => {
                    const val = row[header] === undefined || row[header] === null ? "" : row[header];
                    return `"${String(val).replace(/"/g, '""')}"`;
                }).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Exchange_Report_${new Date().toISOString().split('T')[0]}.csv`);

            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);

            console.log("CSV export triggered successfully");
        } catch (err) {
            console.error("Error exporting CSV:", err);
            setError("Failed to export CSV. Check console for details.");
        }
    };

    return (
        <div className="container py-10">
            <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-400 mb-6 hover:text-primary transition-colors">
                <ArrowLeft size={20} className="mr-2" /> Back to Dashboard
            </button>

            <div className="flex flex-col gap-8">
                {/* Header Card */}
                <Card3D>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Exchange Portal Report</h1>
                            <p className="text-gray-400">Comprehensive mailbox statistics and migration tracking.</p>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <button
                                onClick={() => {
                                    console.log("Generate Report button clicked directly");
                                    handleGenerateReport();
                                }}
                                disabled={loading}
                                className="btn-primary flex-1 md:flex-none flex items-center justify-center"
                            >
                                {loading ? <RefreshCw className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />}
                                {loading ? 'Processing...' : 'Generate Report'}
                            </button>
                            {reportData && (
                                <button
                                    onClick={downloadCSV}
                                    className="btn-primary bg-green-600 hover:bg-green-700 flex-1 md:flex-none flex items-center justify-center"
                                >
                                    <Download className="mr-2" /> Export CSV
                                </button>
                            )}
                        </div>
                    </div>

                    {loading && (
                        <div className="mt-6">
                            <div className="flex justify-between mb-1 text-sm font-medium text-primary">
                                <span>Processing Data...</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2.5">
                                <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}
                </Card3D>

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card3D className="bg-blue-900/10 border border-blue-900/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-900/30 rounded-lg text-blue-400">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400 uppercase font-semibold">Total Mailboxes</p>
                                    <p className="text-2xl font-bold text-white">{summary.totalMailboxes}</p>
                                </div>
                            </div>
                        </Card3D>
                        <Card3D className="bg-green-900/10 border border-green-900/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-900/30 rounded-lg text-green-400">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400 uppercase font-semibold">Completed Migrations</p>
                                    <p className="text-2xl font-bold text-white">{summary.completedMigrations}</p>
                                </div>
                            </div>
                        </Card3D>
                        <Card3D className="bg-purple-900/10 border border-purple-900/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-900/30 rounded-lg text-purple-400">
                                    <Database size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400 uppercase font-semibold">Total Storage Used</p>
                                    <p className="text-2xl font-bold text-white">{summary.totalStorage} GB</p>
                                </div>
                            </div>
                        </Card3D>
                    </div>
                )}

                {/* Data Table Card */}
                <Card3D>
                    {error && (
                        <div className="p-4 mb-4 text-red-400 bg-red-900/20 border border-red-900/30 rounded-lg flex items-center">
                            <Shield size={20} className="mr-2" /> {error}
                        </div>
                    )}

                    {reportData ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-3">User Principal Name</th>
                                        <th className="px-6 py-3">Migration Status</th>
                                        <th className="px-6 py-3">Data Migrated</th>
                                        <th className="px-6 py-3">Data Synced</th>
                                        <th className="px-6 py-3">Storage Used</th>
                                        <th className="px-6 py-3">Item Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map((row, index) => (
                                        <tr key={index} className="bg-transparent border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">{row['User Principal Name']}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${row['Migration Status'] === 'Completed' ? 'bg-green-900/30 text-green-400' :
                                                    row['Migration Status'] === 'In Progress' ? 'bg-blue-900/30 text-blue-400' :
                                                        row['Migration Status'] === 'Failed' ? 'bg-red-900/30 text-red-400' :
                                                            'bg-gray-800 text-gray-400'
                                                    }`}>
                                                    {row['Migration Status']}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{row['Data Migrated']}</td>
                                            <td className="px-6 py-4">{row['Data Synced']}</td>
                                            <td className="px-6 py-4">{(parseFloat(row['Storage Used (Byte)'] || 0) / (1024 * 1024)).toFixed(2)} MB</td>
                                            <td className="px-6 py-4">{row['Item Count']}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-xs text-gray-400 mt-4 text-center">Showing enhanced data for first 20 users. Export for full report.</p>
                        </div>
                    ) : !loading && (
                        <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                            <Clock size={48} className="mb-4 opacity-20" />
                            <p className="text-lg">No report data generated yet.</p>
                            <p className="text-sm">Click the "Generate Report" button above to start processing.</p>
                        </div>
                    )}
                </Card3D>
                <p className="text-[10px] text-gray-600 text-center opacity-50">v1.0.5 - System Ready</p>
            </div>
        </div>
    );
};

export default ExchangeReport;
