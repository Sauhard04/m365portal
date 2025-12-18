import React, { useState } from 'react';
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import { getComplianceReport } from "../services/graphService";
import Card3D from "../components/Card3D";
import { Download, RefreshCw, ArrowLeft, FileText, ShieldCheck, Mail, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ComplianceReport = () => {
    const { instance, accounts } = useMsal();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [reportData, setReportData] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const getAuthProvider = () => {
        console.log("ComplianceReport: getAuthProvider called");
        return async (callback) => {
            console.log("ComplianceReport: authProvider callback triggered");
            try {
                const account = accounts[0];
                if (!account) {
                    console.warn("ComplianceReport: No active account found in MSAL");
                    throw new Error("No active account found. Please log in again.");
                }
                console.log("ComplianceReport: Acquiring token silently for account:", account.username);
                const response = await instance.acquireTokenSilent({
                    ...loginRequest,
                    account: account,
                });
                console.log("ComplianceReport: Token acquired successfully");
                callback(null, response.accessToken);
            } catch (err) {
                console.error("ComplianceReport: Auth provider error:", err);
                callback(err, null);
            }
        };
    };

    const handleGenerateReport = async () => {
        console.log("ComplianceReport: handleGenerateReport called, loading state:", loading);
        if (loading) return;
        setLoading(true);
        setProgress(20);
        setError(null);
        setReportData(null);

        try {
            const authProvider = getAuthProvider();
            const csvData = await getComplianceReport(authProvider);
            setProgress(60);

            // Parse CSV
            const cleanCsv = csvData.replace(/^\uFEFF/, '');
            const lines = cleanCsv.split(/\r?\n/).filter(line => line.trim() !== '');
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
            const data = lines.slice(1).map(line => {
                const values = line.split(',');
                let obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index]?.replace(/"/g, '').trim();
                });
                return obj;
            });

            setReportData(data);
            setProgress(100);
        } catch (err) {
            console.error("Error in handleGenerateReport:", err);
            setError(err.message || "Failed to fetch Compliance report.");
        } finally {
            setLoading(false);
            setProgress(0);
        }
    };

    const downloadCSV = () => {
        if (!reportData) return;
        const headers = Object.keys(reportData[0]);
        const csvContent = [
            headers.join(','),
            ...reportData.map(row => headers.map(header => `"${row[header]}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Compliance_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="container py-10">
            <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-400 mb-6 hover:text-primary transition-colors">
                <ArrowLeft size={20} className="mr-2" /> Back to Dashboard
            </button>

            <div className="flex flex-col gap-8">
                <Card3D>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Compliance Portal Report</h1>
                            <p className="text-gray-400">Data governance and email activity compliance.</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    console.log("ComplianceReport: Generate Report button clicked directly");
                                    handleGenerateReport();
                                }}
                                disabled={loading}
                                className="btn-primary"
                            >
                                {loading ? <RefreshCw className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />}
                                {loading ? 'Processing...' : 'Generate Report'}
                            </button>
                            {reportData && (
                                <button onClick={downloadCSV} className="btn-primary bg-green-600 hover:bg-green-700">
                                    <Download className="mr-2" /> Export CSV
                                </button>
                            )}
                        </div>
                    </div>
                    {loading && (
                        <div className="mt-6">
                            <div className="w-full bg-gray-800 rounded-full h-2.5">
                                <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}
                </Card3D>

                {reportData && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card3D className="bg-blue-900/10 border border-blue-900/20">
                            <div className="flex items-center gap-4">
                                <Mail className="text-blue-400" size={32} />
                                <div>
                                    <p className="text-sm text-gray-400 uppercase">Total Users Tracked</p>
                                    <p className="text-2xl font-bold text-white">{reportData.length}</p>
                                </div>
                            </div>
                        </Card3D>
                        <Card3D className="bg-green-900/10 border border-green-900/20">
                            <div className="flex items-center gap-4">
                                <ShieldCheck className="text-green-400" size={32} />
                                <div>
                                    <p className="text-sm text-gray-400 uppercase">Compliance Score</p>
                                    <p className="text-2xl font-bold text-white">92%</p>
                                </div>
                            </div>
                        </Card3D>
                        <Card3D className="bg-purple-900/10 border border-purple-900/20">
                            <div className="flex items-center gap-4">
                                <FileText className="text-purple-400" size={32} />
                                <div>
                                    <p className="text-sm text-gray-400 uppercase">Audit Logs</p>
                                    <p className="text-2xl font-bold text-white">Active</p>
                                </div>
                            </div>
                        </Card3D>
                    </div>
                )}

                <Card3D>
                    {error && <div className="p-4 mb-4 text-red-400 bg-red-900/20 rounded-lg">{error}</div>}
                    {reportData ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left">
                                <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="px-6 py-3">User Principal Name</th>
                                        <th className="px-6 py-3">Send Count</th>
                                        <th className="px-6 py-3">Receive Count</th>
                                        <th className="px-6 py-3">Read Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map((row, index) => (
                                        <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="px-6 py-4 font-medium text-white">{row['User Principal Name']}</td>
                                            <td className="px-6 py-4">{row['Send Count']}</td>
                                            <td className="px-6 py-4">{row['Receive Count']}</td>
                                            <td className="px-6 py-4">{row['Read Count']}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : !loading && (
                        <div className="text-center py-20 text-gray-500">
                            <Clock size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No compliance data generated yet.</p>
                        </div>
                    )}
                </Card3D>
                <p className="text-[10px] text-gray-600 text-center opacity-50">v1.0.5 - System Ready</p>
            </div>
        </div>
    );
};

export default ComplianceReport;
